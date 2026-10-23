"""Read-only archive inspection behavior; all fixtures are synthetic."""
import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import struct
import tempfile
import unittest
import zipfile
import zlib

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    'image_pack', ROOT / 'skills/miliastra-ui/scripts/inspect_image_pack.py')
pack = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(pack)


def png():
    def chunk(kind, data):
        return (struct.pack('>I', len(data)) + kind + data
                + struct.pack('>I', zlib.crc32(kind + data)))
    # Three pixels: invisible, white/alpha=4, white/alpha=255.
    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', 3, 1, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(b'\0' + bytes([0, 0, 0, 0, 255, 255, 255, 4, 255, 255, 255, 255])))
            + chunk(b'IEND', b''))


class ImagePackTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / '图片.zip'
        self.row = {'id': 100002, 'categoryName': '基础形状', 'description': '白色圆'}
        self.entries = {
            '图片/_index/assets-index.json': [self.row],
            '图片/_index/data.json': {'imageData': {
                '100002': {'id': 100002, 'img': 'sprite/100002.png', 'border': 'border/100002.json'}}},
            '图片/_index/desc.json': [{'assetID': 100002, 'description': '白色圆'}],
            '图片/100002.json': {'m_Rect': {'width': 5, 'height': 1},
                                'm_Pivot': {'X': 0.5, 'Y': 0.5}},
            '图片/100002.png': png(),
        }

    def write(self):
        with zipfile.ZipFile(self.path, 'w') as archive:
            for name, data in self.entries.items():
                entry = zipfile.ZipInfo('placeholder')
                entry.filename = name  # Keep adversarial separators, including on Windows.
                archive.writestr(entry, data if isinstance(data, bytes) else json.dumps(data))

    def open(self):
        self.write()
        instance = pack.ImagePack(self.path)
        self.addCleanup(instance.close)
        return instance

    def test_local_pair_mapping_search_and_no_writes(self):
        instance = self.open()
        before = hashlib.sha256(self.path.read_bytes()).hexdigest()
        self.assertEqual(instance.search('圆 基础', 1), ['100002'])
        self.assertEqual(instance.search('不存在', 8), [])
        result = instance.inspect('100002')
        self.assertEqual(result['png_entry'], '图片/100002.png')
        self.assertEqual(result['png_size'], [3, 1])
        self.assertTrue(result['notes'])
        self.assertEqual(result['issues'], [])
        self.assertEqual(result['device_status'], 'unverified')
        self.assertEqual(result['png_decode'], 'header_only')
        self.assertEqual(instance.audit()['indexed'], 1)
        self.assertEqual(before, hashlib.sha256(self.path.read_bytes()).hexdigest())
        self.assertEqual(list(Path(self.temp.name).iterdir()), [self.path])

    def test_missing_pair_reported(self):
        del self.entries['图片/100002.png']
        self.assertIn('Missing entry', self.open().audit()['issues'][0]['issue'])

    def test_conflicting_indexes(self):
        self.entries['图片/_index/data.json']['imageData']['100002']['id'] = 999999
        self.entries['图片/_index/desc.json'][0]['description'] = '不同描述'
        self.assertEqual(len(self.open().inspect('100002')['issues']), 2)

    def test_orphan_reported(self):
        self.entries['图片/100003.png'] = png()
        self.assertIn({'id': '100003', 'issue': 'unindexed_png'}, self.open().audit()['issues'])

    def test_duplicate_index_rejected(self):
        self.entries['图片/_index/assets-index.json'].append(self.row)
        self.write()
        with self.assertRaisesRegex(ValueError, 'Duplicate index ID'):
            pack.ImagePack(self.path)

    def test_bad_paths_rejected(self):
        for name in ('../bad.png', '/bad.png', 'C:/bad.png', '图片\\bad.png'):
            with self.subTest(name=name):
                self.entries[name] = b'bad'
                self.write()
                with self.assertRaisesRegex(ValueError, 'Unsafe'):
                    pack.ImagePack(self.path)
                del self.entries[name]

    def test_case_duplicate_rejected(self):
        self.entries['图片/100002.PNG'] = png()
        self.write()
        with self.assertRaisesRegex(ValueError, 'Duplicate archive path'):
            pack.ImagePack(self.path)

    def test_size_limit_and_invalid_id(self):
        instance = self.open()
        for identity in ('../100002', '100002.png', '001', '-1'):
            with self.subTest(identity=identity), self.assertRaises(ValueError):
                instance.inspect(identity)
        oversized = bytearray(png())
        oversized[16:24] = struct.pack('>II', 100000, 100000)
        with self.assertRaisesRegex(ValueError, 'dimensions'):
            pack.png_size(oversized)

    def test_bad_png_and_metadata(self):
        self.entries['图片/100002.png'] = b'not a PNG'
        self.assertIn('Invalid PNG', self.open().audit()['issues'][0]['issue'])

    @unittest.skipUnless(importlib.util.find_spec('PIL'), 'Optional Pillow unavailable')
    def test_alpha_thresholds_do_not_trim_or_claim_tint(self):
        result = self.open().inspect('100002', pixels=True)
        self.assertEqual(result['pixels']['alpha_bbox_gt0'], (1, 0, 3, 1))
        self.assertEqual(result['pixels']['alpha_bbox_ge8'], (2, 0, 3, 1))
        self.assertTrue(result['pixels']['visible_rgb_white'])
        self.assertEqual(result['pixels']['tint_in_engine'], 'unverified')
        self.assertEqual(result['sprite_metadata']['m_Rect']['width'], 5)

    def test_cli_json_and_missing_id(self):
        self.write()
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertEqual(pack.main([str(self.path), '--audit', '--id', '100002']), 0)
        self.assertEqual(json.loads(output.getvalue())['audit']['issues'], [])
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(pack.main([str(self.path), '--id', '999999']), 2)


if __name__ == '__main__':
    unittest.main()
