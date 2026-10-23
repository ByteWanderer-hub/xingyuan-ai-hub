"""Offline chronology invariants. Quest progression, release order and world time differ."""
from collections import Counter, defaultdict
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent
TIMELINE_FILES = ('timeline_events.jsonl', 'character_timelines.jsonl',
                  'hangout_branches.jsonl', 'timeline_relations.jsonl')
DEPTHS = {'catalog_only', 'series_structure', 'metadata_and_visible_flow',
          'selected_story_beats', 'branch_inventory'}


def read_timeline(root=ROOT):
    collections = [[json.loads(line) for line in (root / name).read_text(encoding='utf-8').splitlines()
                    if line.strip()] for name in TIMELINE_FILES]
    return (*collections, json.loads((root / 'timeline_coverage.json').read_text(encoding='utf-8')))


def participants(event, entity_map):
    refs = {c['entity'] for c in event.get('cast', [])}
    return refs | {entity_map[ref]['aggregate_entity'] for ref in refs
                   if ref in entity_map and entity_map[ref].get('aggregate_entity')}


def cycle_nodes(records, field):
    """Return cyclic nodes without relying on Python recursion depth."""
    graph = {r['id']: set(r.get(field, [])) for r in records}
    incoming = {ref: len(parents & graph.keys()) for ref, parents in graph.items()}
    children = defaultdict(set)
    for ref, parents in graph.items():
        for parent in parents:
            children[parent].add(ref)
    queue = [ref for ref, count in incoming.items() if count == 0]
    visited = set()
    while queue:
        ref = queue.pop()
        visited.add(ref)
        for child in children[ref]:
            incoming[child] -= 1
            if incoming[child] == 0:
                queue.append(child)
    return sorted(graph.keys() - visited)


def validate_timeline(registry, entities, roster, events, timelines, branches, relations, coverage):
    errors = []
    entity_map = {c['id']: c for c in entities}
    event_map = {c['id']: c for c in events}
    branch_map = {c['id']: c for c in branches}
    source_map = {s['id']: s for s in registry['sources']}
    groups = defaultdict(set)
    for branch in branches:
        groups[branch['branch_group']].add(branch['id'])
    for event in events:
        ident = event['id']
        if event.get('coverage') not in DEPTHS:
            errors.append(f'{ident}: invalid coverage depth')
        if event.get('in_world_date') is not None:
            errors.append(f'{ident}: world date requires a separately reviewed chronology schema')
        if event.get('release_version_status') != 'not_cross_checked':
            errors.append(f'{ident}: release version cannot silently become chronology')
        if event.get('spoiler') != 'major':
            errors.append(f'{ident}: timeline spoiler downgrade')
        if event.get('unlock_logic') != 'source_references_only':
            errors.append(f'{ident}: prerequisite references must not imply executable AND/OR logic')
        for cast in event.get('cast', []):
            if cast.get('entity') not in entity_map or not cast.get('evidence_kinds'):
                errors.append(f'{ident}: unresolved cast/evidence')
            if not set(cast.get('sources', [])) <= set(event['sources']):
                errors.append(f'{ident}: cast evidence outside event sources')
        for field in ('parent_event_ids', 'child_event_ids', 'unlock_prerequisites',
                      'progression_predecessor_ids', 'next_event_ids'):
            for ref in event.get(field, []):
                if ref not in event_map or ref == ident:
                    errors.append(f'{ident}: invalid {field} {ref}')
        for parent in event.get('parent_event_ids', []):
            if parent in event_map and ident not in event_map[parent]['child_event_ids']:
                errors.append(f'{ident}: asymmetric parent link')
        if not set(event.get('progression_predecessor_ids', [])) <= set(event.get('unlock_prerequisites', [])):
            errors.append(f'{ident}: progression must have prerequisite evidence')
        if event.get('coverage') == 'selected_story_beats' and not event.get('story_beats'):
            errors.append(f'{ident}: curated story has no beats')
        for loc in event.get('locators', []):
            if loc.get('source_id') not in source_map:
                errors.append(f'{ident}: unresolved source locator')
        if event.get('node_kind') == 'hangout_act':
            if event.get('progression_predecessor_ids') or event.get('next_event_ids'):
                errors.append(f'{ident}: hangout act cannot serialize endings')
            if set(event.get('branch_ids', [])) != groups[event.get('branch_group')]:
                errors.append(f'{ident}: ending inventory mismatch')
    if cycle_nodes(events, 'progression_predecessor_ids'):
        errors.append('timeline: progression cycle')
    if cycle_nodes(events, 'parent_event_ids'):
        errors.append('timeline: containment cycle')
    for branch in branches:
        ident = branch['id']; group = branch['branch_group']
        if branch.get('entity') not in entity_map or branch.get('act_event_id') not in event_map:
            errors.append(f'{ident}: missing hangout character/act')
        if branch.get('spoiler') != 'major' or not branch.get('condition'):
            errors.append(f'{ident}: missing spoiler/condition')
        if branch.get('predecessor_branch_ids') or branch.get('successor_branch_ids'):
            errors.append(f'{ident}: alternative endings cannot be serialized')
        if set(branch.get('mutually_exclusive_with', [])) != groups[group] - {ident}:
            errors.append(f'{ident}: mutual exclusion mismatch')
        if branch.get('condition_evidence') not in {'reviewed_choice_summary', 'route_map_only'}:
            errors.append(f'{ident}: missing condition evidence depth')
        loc = branch.get('locator', {})
        if len(loc.get('source_title_sha256', '')) != 64 or loc.get('source_id') not in branch['sources']:
            errors.append(f'{ident}: ending locator missing')
    roster_ids = {r['entity'] for r in roster['characters']}
    if {t.get('entity') for t in timelines} != roster_ids or len(timelines) != len(roster_ids):
        errors.append('timeline: playable coverage mismatch')
    expected = defaultdict(set)
    for event in events:
        for ref in participants(event, entity_map):
            expected[ref].add(event['id'])
    for timeline in timelines:
        ident = timeline['id']; entity = timeline['entity']
        if set(timeline.get('event_ids', [])) != expected[entity]:
            errors.append(f'{ident}: event ownership mismatch')
        if timeline.get('coverage', {}).get('event_count') != len(expected[entity]) or not timeline.get('gaps'):
            errors.append(f'{ident}: coverage/gap audit missing')
        if set(timeline.get('branch_ids', [])) != {b['id'] for b in branches if b['entity'] == entity}:
            errors.append(f'{ident}: branch ownership mismatch')
    for relation in relations:
        ident = relation['id']
        if relation.get('subject') not in entity_map or relation.get('object') not in entity_map:
            errors.append(f'{ident}: unresolved relation endpoint')
        if not relation.get('time_scope') or not relation.get('event_ids'):
            errors.append(f'{ident}: relation needs event and time scope')
        if not set(relation.get('event_ids', [])) <= event_map.keys():
            errors.append(f'{ident}: unresolved relation event')
        if not set(relation.get('branch_ids', [])) <= branch_map.keys():
            errors.append(f'{ident}: unresolved relation branch')
        if relation.get('assertion') != 'sourced_narrative_relation':
            errors.append(f'{ident}: coappearance is not a semantic relation')
    for key, count in [('events', len(events)), ('hangout_endings', len(branches)),
                       ('playable_identities', len(timelines)), ('narrative_relations', len(relations))]:
        if coverage.get(key) != count:
            errors.append(f'coverage: {key} count mismatch')
    if coverage.get('events_by_depth') != dict(Counter(e['coverage'] for e in events)):
        errors.append('coverage: evidence depth counts mismatch')
    return errors
