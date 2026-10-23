"""Portable, deterministic AI retrieval index. Standard library; never fetches the web."""
import argparse
from collections import defaultdict
from datetime import date
import hashlib
import json
from pathlib import Path
import sys
import unicodedata
from timeline import participants

ROOT = Path(__file__).resolve().parent
LEVELS = {'none': 0, 'minor': 1, 'major': 2, 'all': 2}
ENTITY_FILES = ('entries.jsonl', 'entities.jsonl', 'playable_entities.jsonl', 'timeline_entities.jsonl')
JSONL_FILES = (*ENTITY_FILES, 'quests.jsonl', 'relations.jsonl', 'character_profiles.jsonl',
               'character_stories.jsonl', 'community.jsonl', 'timeline_events.jsonl',
               'character_timelines.jsonl', 'hangout_branches.jsonl', 'timeline_relations.jsonl')
SOURCE_FILES = ('sources.json', 'expansion_sources.json', 'character_sources.json', 'community_sources.json',
                'timeline_sources.json')
DATA_FILES = (*JSONL_FILES, *SOURCE_FILES, 'patterns.json', 'character_roster.json',
              'timeline_coverage.json', 'localization_kits.json')


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def read_lines(path):
    return [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines() if line.strip()]


def normalize(value):
    return unicodedata.normalize('NFKC', value).casefold().strip()


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read_stories(root=ROOT):
    return (read_json(root / 'character_roster.json'),
            read_lines(root / 'character_profiles.jsonl'),
            read_lines(root / 'character_stories.jsonl'))


def validate_stories(registry, entities, roster, profiles, stories):
    """Cross-file editorial invariants, beyond the common card schema."""
    errors = []
    entity_map = {e['id']: e for e in entities}
    source_map = {s['id']: s for s in registry['sources']}
    story_map = {s['id']: s for s in stories}
    profile_map = {p['entity']: p for p in profiles}
    roster_ids = [r['entity'] for r in roster['characters']]
    for src in roster.get('sources', []) + roster.get('english_alias_sources', []):
        if src not in source_map:
            errors.append('roster: unresolved source')
    if len(roster_ids) != len(set(roster_ids)) or len(roster_ids) != roster['playable_count']:
        errors.append('roster: duplicate identity/count mismatch')
    if len(profile_map) != len(profiles):
        errors.append('profiles: duplicate entity')
    if set(roster_ids) != {p['entity'] for p in profiles if p['playable']}:
        errors.append('roster/profile playable coverage mismatch')
    if len(story_map) != len(stories):
        errors.append('stories: duplicate id')
    owned = []
    for profile in profiles:
        entity = profile['entity']
        if entity not in entity_map or entity_map[entity]['category'] != '角色':
            errors.append(f'{profile["id"]}: unresolved character entity')
        if not profile.get('limits') or not profile.get('coverage') or not profile.get('story_ids'):
            errors.append(f'{profile["id"]}: missing coverage/limits/stories')
        for sid in profile.get('story_ids', []):
            owned.append(sid)
            if sid not in story_map or story_map[sid]['entity'] != entity:
                errors.append(f'{profile["id"]}: story ownership mismatch {sid}')
        # Every observed section in the canonical character page must have a locator.
        for src in profile['sources']:
            observed = source_map.get(src, {}).get('observed_sections', [])
            covered = {s.get('locator', {}).get('decoded_pointer') for s in stories
                       if s['entity'] == entity and s.get('locator', {}).get('source_id') == src}
            if profile['playable'] and observed and covered != {f'/list/{o["order"]}' for o in observed}:
                errors.append(f'{profile["id"]}: observed source section missing')
    if len(owned) != len(set(owned)) or set(owned) != set(story_map):
        errors.append('stories: orphaned or multiply-owned section')
    for r in roster['characters']:
        if r['entity'] not in entity_map or not r.get('forms') or not r.get('sources'):
            errors.append('roster: missing entity/forms/provenance')
        if r.get('release_date'):
            if date.fromisoformat(r['release_date']) > date.fromisoformat(roster['checked_at']):
                errors.append(f'{r["entity"]}: future release cannot be playable')
            if r.get('release_date_basis') not in source_map:
                errors.append(f'{r["entity"]}: release date lacks source')
        for form in r.get('forms', []):
            src = source_map.get(form.get('source_id'), {})
            if not src or len(src.get('observed_sections', [])) != form.get('story_section_count'):
                errors.append(f'{r["entity"]}: form inventory mismatch')
    for story in stories:
        sid = story['id']
        if story.get('availability') not in {'available', 'source_unopened'}:
            errors.append(f'{sid}: invalid availability')
        if story.get('availability') == 'source_unopened' and story.get('coverage') != '来源标示未开放':
            errors.append(f'{sid}: unopened section cannot be complete')
        if story.get('spoiler') != 'major':
            errors.append(f'{sid}: story archive requires explicit major spoiler label')
        loc = story.get('locator', {})
        src = source_map.get(loc.get('source_id'))
        if not src or loc.get('source_id') not in story['sources']:
            errors.append(f'{sid}: locator source unresolved')
        if 'decoded_pointer' in loc and src:
            observed = {f'/list/{s["order"]}': s for s in src.get('observed_sections', [])}
            item = observed.get(loc['decoded_pointer'], {})
            if (item.get('html_sha256') != loc.get('html_sha256') or
                    item.get('title') != loc.get('source_title')):
                errors.append(f'{sid}: source section fingerprint/title mismatch')
        for correction in story.get('corrections', []):
            if correction.get('source') not in story['sources'] or not correction.get('note'):
                errors.append(f'{sid}: correction lacks provenance')
        for variant in story.get('variants', []):
            if not variant.get('condition') or not variant.get('context') or len(variant.get('text_sha256', '')) != 64:
                errors.append(f'{sid}: variant missing condition/fingerprint')
        for ref in story.get('mentioned_entities', []):
            if ref not in entity_map:
                errors.append(f'{sid}: unresolved mention')
    for src in registry['sources']:
        if src.get('official_community') and src.get('kind') == 'official' and src.get('author_role') != 'official':
            errors.append(f'{src["id"]}: official host does not establish authorship')
    return errors


def build_index(root=ROOT):
    cards = {}
    records = {}
    for filename in JSONL_FILES:
        for line_no, line in enumerate((root / filename).read_bytes().splitlines(), 1):
            if not line.strip():
                continue
            record = json.loads(line)
            ident = record['id']
            if ident in cards:
                raise ValueError(f'duplicate card id: {ident}')
            records[ident] = record
            cards[ident] = {'file': filename, 'line': line_no, 'sha256': digest(line),
                            'title': record['title'], 'spoiler': record['spoiler'],
                            'sources': record['sources']}
    sources = {}
    for filename in SOURCE_FILES:
        for i, src in enumerate(read_json(root / filename)['sources']):
            if src['id'] in sources:
                raise ValueError(f'duplicate source id: {src["id"]}')
            sources[src['id']] = {'file': filename, 'pointer': f'/sources/{i}', 'url': src['url'], 'kind': src['kind']}
    for i, record in enumerate(read_json(root / 'patterns.json')):
        if record['id'] in cards:
            raise ValueError(f'duplicate card id: {record["id"]}')
        records[record['id']] = record
        cards[record['id']] = {'file': 'patterns.json', 'pointer': f'/{i}', 'title': record['title'],
                               'spoiler': record['spoiler'], 'sources': sorted({s for b in record['basis'] for s in records[b]['sources']})}
    for i, record in enumerate(read_json(root / 'localization_kits.json')):
        if record['id'] in cards:
            raise ValueError(f'duplicate card id: {record["id"]}')
        if record.get('kind') != 'original_adaptation':
            raise ValueError(f'{record["id"]}: localization must be labelled original')
        if record.get('spoiler') not in {'none', 'minor', 'major'}:
            raise ValueError(f'{record["id"]}: invalid localization spoiler')
        for anchor in record['anchors']:
            ref = anchor['card_id']
            if ref not in cards or cards[ref]['file'] not in JSONL_FILES or cards[ref]['file'] == 'community.jsonl' or records[ref].get('kind') == 'original_adaptation':
                raise ValueError(f'{record["id"]}: unresolved canonical anchor {ref}')
            if LEVELS[records[ref]['spoiler']] > LEVELS[record['spoiler']]:
                raise ValueError(f'{record["id"]}: anchor spoiler exceeds adaptation')
        records[record['id']] = record
        cards[record['id']] = {
            'file': 'localization_kits.json', 'pointer': f'/{i}', 'title': record['title'],
            'kind': 'original_adaptation', 'spoiler': record['spoiler'],
            'sources': sorted({src for anchor in record['anchors'] for src in records[anchor['card_id']]['sources']})}
    entities = {}
    aliases = defaultdict(set)
    for ident, record in records.items():
        if cards[ident]['file'] not in ENTITY_FILES:
            continue
        entities[ident] = {'title': record['title'], 'spoiler': record['spoiler'], 'profile_ids': [],
                           'story_ids': [], 'quest_ids': [], 'relation_ids': [], 'timeline_ids': [],
                           'event_ids': [], 'branch_ids': [], 'event_relation_ids': [],
                           'localization_ids': [], 'mentioned_in': []}
        for name in [ident, record['title'], *record['aliases']]:
            aliases[normalize(name)].add(ident)
    for r in read_json(root / 'character_roster.json')['characters']:
        for name in [r['name'], *r['aliases']]:
            aliases[normalize(name)].add(r['entity'])
    entity_records = {key: records[key] for key in entities}
    for ident, record in records.items():
        filename = cards[ident]['file']
        if filename == 'character_profiles.jsonl':
            entities[record['entity']]['profile_ids'].append(ident)
        elif filename == 'character_stories.jsonl':
            entities[record['entity']]['story_ids'].append(ident)
            for ref in record.get('mentioned_entities', []):
                entities[ref]['mentioned_in'].append(ident)
        elif filename == 'quests.jsonl':
            for ref in {c['entity'] for c in record['cast']} | set(record['places']):
                entities[ref]['quest_ids'].append(ident)
        elif filename == 'relations.jsonl':
            for ref in (record['subject'], record['object']):
                entities[ref]['relation_ids'].append(ident)
        elif filename == 'timeline_events.jsonl':
            for ref in participants(record, entity_records):
                entities[ref]['event_ids'].append(ident)
        elif filename == 'character_timelines.jsonl':
            entities[record['entity']]['timeline_ids'].append(ident)
        elif filename == 'hangout_branches.jsonl':
            entities[record['entity']]['branch_ids'].append(ident)
        elif filename == 'timeline_relations.jsonl':
            for ref in (record['subject'], record['object']):
                entities[ref]['event_relation_ids'].append(ident)
        elif filename == 'localization_kits.json':
            refs = set()
            for anchor in record['anchors']:
                basis = records[anchor['card_id']]
                refs.update({basis['id'], basis.get('entity'), basis.get('subject'), basis.get('object'),
                             *basis.get('places', []), *participants(basis, entity_records)})
            for ref in refs & entities.keys():
                entities[ref]['localization_ids'].append(ident)
    # Cross-references are independently checked; building must not mask editorial drift.
    for ident, record in records.items():
        if 'entity' not in record:
            continue
        for field in ('quest_ids', 'relation_ids'):
            for ref in record.get(field, []):
                if ref not in cards or ref not in entities[record['entity']][field]:
                    raise ValueError(f'{ident}: invalid {field} reference {ref}')
    for card in cards.values():
        if not set(card['sources']) <= sources.keys():
            raise ValueError('index: unresolved source')
    return {'schema_version': 3, 'checked_at': read_json(root / 'timeline_coverage.json')['checked_at'],
            'contains_major_spoilers': True, 'encoding': 'UTF-8', 'line_numbers': 'one-based; hash excludes newline',
            'retrieval_order': ['resolve alias to entity id', 'read bounded profile, story and timeline locators',
                                'follow quest/relation/event ids', 'follow source locator and unlock/variant conditions'],
            'mention_semantics': 'lexical retrieval only; not an asserted relationship',
            'chronology_semantics': 'event edges are partial quest progression only; release versions and world dates are not chronology; cast is evidence-linked association, not a semantic relationship',
            'localization_semantics': 'localization_ids point to original, unplaytested adaptation proposals; anchors are evidence boundaries, not proof that the proposed events happened in canon',
            'data_hashes': {name: digest((root / name).read_bytes()) for name in DATA_FILES},
            'aliases': {name: sorted(refs) for name, refs in sorted(aliases.items())},
            'entities': entities, 'cards': cards, 'sources': sources}


def check_index(root=ROOT):
    path = root / 'ai_index.json'
    return [] if path.exists() and read_json(path) == build_index(root) else ['AI index missing/stale; run python -B story_index.py --build']


def lookup(index, value, spoilers='none', limit=5):
    if not 1 <= limit <= 20:
        raise ValueError('limit must be 1..20')
    ids = [ident for ident in index['aliases'].get(normalize(value), [])
           if LEVELS[index['entities'][ident]['spoiler']] <= LEVELS[spoilers]]
    if len(ids) != 1:
        raise ValueError('实体名称未唯一命中可见条目；请使用准确 ID，并检查 --spoilers。')
    ident = ids[0]
    node = index['entities'][ident]
    result = {'entity': ident, 'title': node['title'], 'spoiler_filter': spoilers, 'collections': {}}
    for key in ('profile_ids', 'story_ids', 'quest_ids', 'relation_ids', 'timeline_ids', 'event_ids',
                'branch_ids', 'event_relation_ids', 'localization_ids', 'mentioned_in'):
        visible = [ref for ref in node[key] if LEVELS[index['cards'][ref]['spoiler']] <= LEVELS[spoilers]]
        result['collections'][key] = {'matched': len(visible), 'shown': min(limit, len(visible)),
                                      'locators': [{'id': ref, **index['cards'][ref]} for ref in visible[:limit]]}
    result['mention_semantics'] = index['mention_semantics']
    result['localization_semantics'] = index['localization_semantics']
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description='离线 AI 索引：构建、验证或按人物定位资料；不会抓取网页。')
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--build', action='store_true')
    mode.add_argument('--check', action='store_true')
    mode.add_argument('--lookup')
    parser.add_argument('--spoilers', choices=LEVELS, default='none')
    parser.add_argument('--limit', type=int, default=5)
    args = parser.parse_args(argv)
    try:
        if args.build:
            index = build_index()
            # write_bytes avoids Windows newline translation invalidating Git-exported hashes.
            (ROOT / 'ai_index.json').write_bytes((json.dumps(index, ensure_ascii=False, indent=2)+'\n').encode('utf-8'))
            print(f'Built: {len(index["entities"])} entities, {len(index["cards"])} cards')
        else:
            errors = check_index()
            if errors:
                raise ValueError('; '.join(errors))
            if args.check:
                print('PASS: AI index matches all data files and locators')
            else:
                print(json.dumps(lookup(read_json(ROOT / 'ai_index.json'), args.lookup, args.spoilers, args.limit), ensure_ascii=False, indent=2))
        return 0
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f'索引错误：{exc}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8')
    raise SystemExit(main())
