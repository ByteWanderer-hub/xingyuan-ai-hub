#!/usr/bin/env python3
"""Read-only local image-pack lookup/audit. Never extracts, executes or downloads."""
import argparse
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import stat
import struct
import zipfile

MAX_ENTRIES = 10000
MAX_TOTAL = 256 * 1024 * 1024
MAX_ENTRY = 16 * 1024 * 1024
MAX_PIXELS = 16 * 1024 * 1024


def asset_id(value):
    value = str(value)
    if not re.fullmatch(r'[1-9][0-9]{0,17}', value):
        raise ValueError(f'Invalid asset ID: {value!r}')
    return value


def png_size(data):
    if len(data) < 33 or data[:8] != b'\x89PNG\r\n\x1a\n' or data[12:16] != b'IHDR':
        raise ValueError('Invalid PNG header')
    width, height = struct.unpack('>II', data[16:24])
    if not width or not height or width * height > MAX_PIXELS:
        raise ValueError('PNG dimensions exceed inspection limit')
    return [width, height]


def pixel_facts(data):
    # Optional dependency, only when explicitly requested; no image modification.
    from PIL import Image
    png_size(data)
    with Image.open(io.BytesIO(data)) as source:
        source.load()
        rgba = source.convert('RGBA')
    alpha = rgba.getchannel('A')
    nonempty = alpha.getbbox() is not None
    samples = rgba.get_flattened_data() if hasattr(rgba, 'get_flattened_data') else rgba.getdata()
    return {
        'alpha_bbox_gt0': alpha.getbbox(),
        'alpha_bbox_ge8': alpha.point([0] * 8 + [255] * 248).getbbox(),
        'bbox_convention': 'PNG top-left origin, right/bottom exclusive',
        'visible_rgb_white': nonempty and all(
            p[:3] == (255, 255, 255) for p in samples if p[3] > 0),
        'tint_in_engine': 'unverified',
    }


class ImagePack:
    def __init__(self, path):
        self.path = Path(path)
        self.archive = zipfile.ZipFile(self.path)
        try:
            entries = self.archive.infolist()
            if len(entries) > MAX_ENTRIES or sum(e.file_size for e in entries) > MAX_TOTAL:
                raise ValueError('Archive exceeds inspection limits')
            self.entries = {}
            for entry in entries:
                # ZipInfo normalizes Windows separators and truncates NULs in filename.
                name = entry.orig_filename
                parts = PurePosixPath(name).parts
                if (not parts or name.startswith('/') or '\\' in name or ':' in name
                        or any(ord(char) < 32 for char in name)
                        or '..' in parts or str(PurePosixPath(name)) != name.rstrip('/')
                        or stat.S_ISLNK(entry.external_attr >> 16) or entry.flag_bits & 1):
                    raise ValueError(f'Unsafe/unsupported archive entry: {name!r}')
                if entry.file_size > MAX_ENTRY:
                    raise ValueError(f'Archive entry too large: {name}')
                if name.casefold() in self.entries:
                    raise ValueError(f'Duplicate archive path: {name}')
                self.entries[name.casefold()] = entry
            indexes = [e.filename for e in entries
                       if e.filename.endswith('_index/assets-index.json')]
            if len(indexes) != 1:
                raise ValueError('Require exactly one _index/assets-index.json')
            self.prefix = indexes[0][:-len('_index/assets-index.json')]
            self.rows = self.by_id(self.read_json(indexes[0]), 'id')
            data = self.read_json(self.prefix + '_index/data.json')
            self.data = data['imageData']
            if not isinstance(self.data, dict):
                raise ValueError('imageData must be an object')
            self.descriptions = self.by_id(
                self.read_json(self.prefix + '_index/desc.json'), 'assetID')
        except Exception:
            self.archive.close()
            raise

    @staticmethod
    def by_id(rows, key):
        result = {}
        if not isinstance(rows, list):
            raise ValueError('Index must be an array')
        for row in rows:
            identity = asset_id(row[key])
            if identity in result:
                raise ValueError(f'Duplicate index ID: {identity}')
            result[identity] = row
        return result

    def close(self):
        self.archive.close()

    def read(self, name):
        entry = self.entries.get(name.casefold())
        if entry is None:
            raise ValueError(f'Missing entry: {name}')
        return self.archive.read(entry)

    def read_json(self, name):
        return json.loads(self.read(name).decode('utf-8-sig'))

    def inspect(self, identity, pixels=False):
        identity = asset_id(identity)
        row = self.rows.get(identity)
        if row is None:
            raise ValueError(f'ID not indexed: {identity}')
        png_path = self.prefix + identity + '.png'
        meta_path = self.prefix + identity + '.json'
        data = self.read(png_path)
        metadata_raw = self.read(meta_path)
        metadata = json.loads(metadata_raw.decode('utf-8-sig'))
        if not isinstance(metadata, dict):
            raise ValueError('Sprite metadata must be an object')
        size = png_size(data)
        issues = []
        catalog_row = self.data.get(identity)
        if not isinstance(catalog_row, dict) or str(catalog_row.get('id')) != identity:
            issues.append('data_index_id_missing_or_conflicting')
        description = self.descriptions.get(identity)
        if description is None:
            issues.append('description_id_missing')
        elif description.get('description') != row.get('description'):
            issues.append('description_conflict')
        rect = metadata.get('m_Rect', {})
        if not isinstance(rect, dict):
            raise ValueError('m_Rect must be an object')
        notes = []
        if [rect.get('width'), rect.get('height')] != size:
            notes.append('png_size_differs_from_logical_rect: verify trim/offset mapping')
        result = {
            'id': identity,
            'index_annotation': row,
            'png_entry': png_path, 'metadata_entry': meta_path,
            'png_sha256': hashlib.sha256(data).hexdigest(),
            'metadata_sha256': hashlib.sha256(metadata_raw).hexdigest(),
            'png_size': size, 'sprite_metadata': metadata,
            'catalog_paths': catalog_row,
            'notes': notes, 'issues': issues,
            'evidence': 'user-supplied archive; annotations not independently verified',
            'png_decode': 'header_only', 'device_status': 'unverified',
        }
        if pixels:
            result['pixels'] = pixel_facts(data)
            result['png_decode'] = 'Pillow_decoded'
        return result

    def search(self, query, limit):
        terms = query.casefold().split()
        return [key for key, row in self.rows.items()
                if all(term in json.dumps(row, ensure_ascii=False).casefold()
                       for term in terms)][:limit]

    def audit(self):
        # Explicit full audit only; ordinary search reads metadata for selected IDs.
        issues = []
        size_differences = 0
        for identity in self.rows:
            try:
                row = self.inspect(identity)
                issues.extend({'id': identity, 'issue': issue} for issue in row['issues'])
                size_differences += bool(row['notes'])
            except (ValueError, KeyError, TypeError, zipfile.BadZipFile) as error:
                issues.append({'id': identity, 'issue': str(error)})
        for label, identities in (
            ('data', set(self.data)), ('desc', set(self.descriptions)),
            ('png', {PurePosixPath(e.filename).stem for e in self.entries.values()
                     if e.filename.startswith(self.prefix) and e.filename.endswith('.png')}),
            ('metadata', {PurePosixPath(e.filename).stem for e in self.entries.values()
                          if e.filename.startswith(self.prefix) and e.filename.endswith('.json')
                          and PurePosixPath(e.filename).stem.isdecimal()}),
        ):
            for identity in sorted(identities - set(self.rows)):
                issues.append({'id': identity, 'issue': f'unindexed_{label}'})
        return {'indexed': len(self.rows), 'issues': issues,
                'png_logical_size_differences': size_differences,
                'scope': 'IDs, pairs, JSON, PNG headers and hashes; not engine validation'}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    selection = parser.add_mutually_exclusive_group()
    selection.add_argument('--id', nargs='+')
    selection.add_argument('--query', default='')
    parser.add_argument('--limit', type=int, default=8)
    parser.add_argument('--pixels', action='store_true', help='Decode selected PNGs using Pillow')
    parser.add_argument('--audit', action='store_true', help='Check all pairs; PNG headers only')
    args = parser.parse_args(argv)
    if not 1 <= args.limit <= 50 or (args.id and len(args.id) > 50):
        parser.error('Select 1..50 results')
    pack = None
    try:
        pack = ImagePack(args.archive)
        identities = args.id or pack.search(args.query, args.limit)
        with args.archive.open('rb') as stream:
            digest = hashlib.file_digest(stream, 'sha256').hexdigest() if hasattr(hashlib, 'file_digest') else None
        if digest is None:  # Python 3.10
            digest_state = hashlib.sha256()
            with args.archive.open('rb') as stream:
                for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                    digest_state.update(chunk)
            digest = digest_state.hexdigest()
        result = {'archive_sha256': digest, 'indexed': len(pack.rows),
                  'results': [pack.inspect(identity, args.pixels) for identity in identities]}
        if args.audit:
            result['audit'] = pack.audit()
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 1 if (any(row['issues'] for row in result['results'])
                     or result.get('audit', {}).get('issues')) else 0
    except (OSError, ValueError, KeyError, TypeError, ImportError, zipfile.BadZipFile) as error:
        print(json.dumps({'error': str(error)}, ensure_ascii=False))
        return 2
    finally:
        if pack:
            pack.close()


if __name__ == '__main__':
    raise SystemExit(main())
