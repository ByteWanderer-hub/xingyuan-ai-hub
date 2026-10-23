"""Sourced, original adaptation briefs. Offline, portable and explicitly bounded."""
import argparse
import json
from pathlib import Path
import sys
import unicodedata

from story_index import ROOT, JSONL_FILES, SOURCE_FILES, LEVELS, read_json, read_lines, check_index
from timeline import participants

MECHANICS = ('探索', '解谜', '协作', '叙事', '竞速', '经营')
KIT_FILE = 'localization_kits.json'


def normalize(value):
    return unicodedata.normalize('NFKC', value).casefold().strip()


def read_context(root=ROOT):
    # Community language samples are not evidence of canonical world rules.
    cards = {card['id']: card for name in JSONL_FILES if name != 'community.jsonl'
             for card in read_lines(root / name)}
    sources = {src['id']: src for name in SOURCE_FILES
               for src in read_json(root / name)['sources']}
    return cards, sources


def read_kits(root=ROOT):
    return read_json(root / KIT_FILE)


def validate_kits(kits, cards):
    errors = []
    seen = set(cards)
    for kit in kits:
        ident = kit.get('id', '<missing>')
        if not ident.startswith('localization.') or ident in seen:
            errors.append(f'{ident}: missing/duplicate adaptation id')
        seen.add(ident)
        if kit.get('kind') != 'original_adaptation':
            errors.append(f'{ident}: adaptation must be labelled original')
        for key in ('title', 'region', 'summary'):
            if not isinstance(kit.get(key), str) or not kit[key].strip():
                errors.append(f'{ident}: missing {key}')
        if kit.get('spoiler') not in {'none', 'minor', 'major'}:
            errors.append(f'{ident}: invalid spoiler label')
        for key in ('tags', 'mechanics', 'environment', 'acceptance'):
            if not isinstance(kit.get(key), list) or not kit[key] or any(not isinstance(s, str) or not s.strip() for s in kit[key]):
                errors.append(f'{ident}: missing {key} list')
        if not set(kit.get('mechanics', [])) <= set(MECHANICS):
            errors.append(f'{ident}: unknown mechanic')
        anchors = kit.get('anchors', [])
        if not anchors or len({a.get('card_id') for a in anchors}) != len(anchors):
            errors.append(f'{ident}: empty/duplicate evidence anchors')
        for anchor in anchors:
            ref = anchor.get('card_id')
            card = cards.get(ref)
            if not card or card.get('kind') == 'original_adaptation':
                errors.append(f'{ident}: unresolved canonical anchor {ref}')
                continue
            if LEVELS.get(card.get('spoiler'), 99) > LEVELS.get(kit.get('spoiler'), -1):
                errors.append(f'{ident}: anchor spoiler exceeds adaptation')
            if not anchor.get('use') or not anchor.get('limit'):
                errors.append(f'{ident}: anchor needs support and inference limit')
        for key, fields in {
                'context': ('time_scope', 'preconditions', 'canon_boundary'),
                'intent': ('player_role', 'local_need', 'goal', 'emotion'),
                'variants': ('solo', 'cooperative'),
                'implementation': ('states', 'events', 'capabilities_to_verify', 'fallback')}.items():
            for field in fields:
                if not isinstance(kit.get(key), dict) or not kit[key].get(field):
                    errors.append(f'{ident}: missing {key}.{field}')
        npcs = kit.get('original_npcs', [])
        npc_ids = {npc.get('id') for npc in npcs}
        if not npcs or len(npc_ids) != len(npcs) or None in npc_ids:
            errors.append(f'{ident}: invalid original NPC ids')
        for npc in npcs:
            if any(not npc.get(field) for field in ('id', 'name', 'role', 'motive', 'voice')):
                errors.append(f'{ident}: incomplete original NPC motivation/voice')
        if not kit.get('original_lines'):
            errors.append(f'{ident}: missing original dialogue')
        for line in kit.get('original_lines', []):
            if line.get('speaker') not in npc_ids or not line.get('text'):
                errors.append(f'{ident}: original dialogue speaker unresolved')
        beats = kit.get('beats', [])
        if len(beats) < 3 or len({b.get('id') for b in beats}) != len(beats):
            errors.append(f'{ident}: need at least three unique playable beats')
        for beat in beats:
            if any(not beat.get(field) for field in ('id', 'action', 'world_reason', 'feedback', 'choice', 'fail_forward')):
                errors.append(f'{ident}: beat lacks action, cause, feedback, choice or recovery')
        if len(kit.get('acceptance', [])) < 3:
            errors.append(f'{ident}: insufficient observable playtest criteria')
    return errors


def related_entities(card, index, cards):
    refs = {card.get('entity'), card.get('subject'), card.get('object'), *card.get('places', [])}
    if card['id'] in index['entities']:
        refs.add(card['id'])
    refs.update(participants(card, cards))
    return refs & index['entities'].keys()


def resolve_entity(value, index, spoilers):
    ids = [ref for ref in index['aliases'].get(normalize(value), [])
           if LEVELS[index['entities'][ref]['spoiler']] <= LEVELS[spoilers]]
    if len(ids) != 1:
        raise ValueError('实体未唯一命中可见条目；请用准确 ID 并检查 --spoilers。')
    return ids[0]


def select_kits(kits, index, cards, query='', region=None, mechanic=None,
                entity=None, spoilers='none', kit_id=None):
    entity_id = resolve_entity(entity, index, spoilers) if entity else None
    terms = normalize(query).split()
    matches = []
    for kit in kits:
        if LEVELS[kit['spoiler']] > LEVELS[spoilers]:
            continue
        if kit_id and kit['id'] != kit_id:
            continue
        if region and kit['region'] != region:
            continue
        if mechanic and mechanic not in kit['mechanics']:
            continue
        if entity_id and not any(entity_id in related_entities(cards[a['card_id']], index, cards) for a in kit['anchors']):
            continue
        content = normalize(json.dumps(kit, ensure_ascii=False))
        if not all(term in content for term in terms):
            continue
        matches.append(kit)
    return sorted(matches, key=lambda kit: kit['id'])


def build_brief(kit, cards, sources, index):
    evidence = []
    source_ids = set()
    for anchor in kit['anchors']:
        card = cards[anchor['card_id']]
        source_ids.update(card['sources'])
        evidence.append({
            'card_id': card['id'], 'title': card['title'], 'spoiler': card['spoiler'],
            'supports': anchor['use'], 'inference_limit': anchor['limit'],
            'source_summary': card['summary'], 'source_boundary': card['boundary'],
            'time_scope': card.get('time_scope', card['timeline']),
            'coverage': card.get('coverage', 'sourced_reference_card'),
            'locator': index['cards'][card['id']], 'sources': card['sources'],
            'relation': {key: card[key] for key in ('subject', 'object', 'relation_type')}
                        if 'subject' in card else None})
    return {
        'id': kit['id'], 'title': kit['title'], 'kind': 'original_adaptation',
        'spoiler': kit['spoiler'], 'region': kit['region'], 'mechanics': kit['mechanics'],
        'status': 'design_proposal_unplaytested', 'summary': kit['summary'],
        'canon_evidence': evidence,
        'original_design': {key: kit[key] for key in (
            'context', 'intent', 'original_npcs', 'original_lines', 'beats', 'environment',
            'variants', 'implementation', 'acceptance')},
        'source_details': [{key: sources[ref][key] for key in ('id', 'title', 'url', 'kind', 'access', 'scope')}
                           for ref in sorted(source_ids)],
        'review_before_implementation': [
            '确认目标关卡、适用章节和剧情知情范围；原作引用只在列明证据范围内成立。',
            '试玩验收项是待验证目标；本工具没有运行关卡或确认平台 API。',
            'NPC、对白、任务和反馈为原创方案；不得冒称原作新增剧情或原角色原话。']}


def render_markdown(payload):
    lines = [f"本土化方案：匹配 {payload['matched']}，显示 {payload['shown']}；剧透范围={payload['spoiler_filter']}。"]
    if not payload['results']:
        lines.append('当前条件没有已编写的方案；不表示原作缺少相关素材。可用 query.py 或 story_index.py 按人物继续找依据。')
    for brief in payload['results']:
        lines += ['', f"## {brief['title']}（{brief['id']}）", '',
                  f"地区：{brief['region']}；剧透等级：{brief['spoiler']}；玩法：{'、'.join(brief['mechanics'])}",
                  '性质：原创改编方案；设计与试玩待验收。', '', brief['summary']]
        if 'canon_evidence' not in brief:
            lines += ['', '查看完整方案：python -B localization.py --kit ' + brief['id'] + ' --spoilers ' + brief['spoiler']]
            continue
        design = brief['original_design']
        context, intent = design['context'], design['intent']
        lines += ['', '### 原作依据与适用语境', '', f"时点：{context['time_scope']}",
                  f"边界：{context['canon_boundary']}", '', *['- 前提：' + p for p in context['preconditions']]]
        for item in brief['canon_evidence']:
            loc = item['locator']
            location = f"{loc['file']}:{loc.get('line', loc.get('pointer'))}"
            lines += [f"- {item['title']} [{item['card_id']}]（{location}）：{item['supports']}；限制：{item['inference_limit']}；证据深度：{item['coverage']}；来源：{', '.join(item['sources'])}",
                      f"  来源语境：{item['time_scope']}；原卡边界：{item['source_boundary']}"]
        lines += ['', '### 原创玩法方案', '', f"玩家身份：{intent['player_role']}",
                  f"当地需求：{intent['local_need']}", f"目标：{intent['goal']}；体验目标：{intent['emotion']}", '']
        for beat in design['beats']:
            lines += [f"- {beat['id']}：{beat['action']}", f"  当地原因：{beat['world_reason']}",
                      f"  选择：{beat['choice']}；反馈：{beat['feedback']}；失败续行：{beat['fail_forward']}"]
        lines += ['', '环境线索：', '', *['- ' + item for item in design['environment']], '', '原创 NPC 与对白：', '']
        npcs = {npc['id']: npc for npc in design['original_npcs']}
        for npc in npcs.values():
            lines += [f"- {npc['name']}：{npc['role']}；动机：{npc['motive']}；表达：{npc['voice']}"]
        for line in design['original_lines']:
            lines += [f"- {npcs[line['speaker']]['name']}（原创台词）：{line['text']}"]
        lines += ['', f"单人：{design['variants']['solo']}", f"多人：{design['variants']['cooperative']}", '',
                  '### 实施与试玩验收', '', '状态：' + ' → '.join(design['implementation']['states']),
                  '事件：' + '、'.join(design['implementation']['events']),
                  '平台能力待核：' + '；'.join(design['implementation']['capabilities_to_verify']),
                  '简化实现：' + design['implementation']['fallback'], '',
                  *['- [ ] ' + item for item in design['acceptance']], '', '### 来源', '']
        for src in brief['source_details']:
            lines += [f"- [{src['title']}]({src['url']}) [{src['id']}]：{src['kind']} / {src['access']}；{src['scope']}"]
    return '\n'.join(lines) + '\n'


def main(argv=None):
    parser = argparse.ArgumentParser(description='按地区、玩法或人物选取有证据的原创本土化方案；离线运行。')
    parser.add_argument('query', nargs='?', default='')
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--kit', help='完整方案 ID')
    mode.add_argument('--list', action='store_true', help='只显示方案摘要')
    mode.add_argument('--validate', action='store_true')
    parser.add_argument('--region')
    parser.add_argument('--mechanic', choices=MECHANICS)
    parser.add_argument('--entity')
    parser.add_argument('--spoilers', choices=LEVELS, default='none')
    parser.add_argument('--limit', type=int, default=3)
    parser.add_argument('--json', action='store_true', dest='as_json')
    parser.add_argument('--output', type=Path, help='将输出保存到新文件；拒绝覆盖已有文件')
    args = parser.parse_args(argv)
    if not 1 <= args.limit <= 20:
        parser.error('--limit 必须为 1–20')
    try:
        errors = check_index()
        if errors:
            raise ValueError('; '.join(errors))
        cards, sources = read_context()
        kits = read_kits()
        errors = validate_kits(kits, cards)
        if errors:
            raise ValueError('; '.join(errors))
        index = read_json(ROOT / 'ai_index.json')
        if args.validate:
            print(f'PASS: {len(kits)} original localization kits; references, spoilers, NPC speakers and playtest criteria valid')
            return 0
        matches = select_kits(kits, index, cards, args.query, args.region, args.mechanic,
                              args.entity, args.spoilers, args.kit)
        results = [{key: kit[key] for key in ('id', 'title', 'kind', 'spoiler', 'region', 'mechanics', 'summary')}
                   if args.list else build_brief(kit, cards, sources, index) for kit in matches[:args.limit]]
        payload = {'collection': 'original_localization', 'matched': len(matches), 'shown': len(results),
                   'spoiler_filter': args.spoilers, 'results': results}
        output = json.dumps(payload, ensure_ascii=False, indent=2) + '\n' if args.as_json else render_markdown(payload)
        if args.output:
            with args.output.open('x', encoding='utf-8', newline='\n') as stream:
                stream.write(output)
            print(f'Saved: {args.output.resolve()}')
        else:
            print(output, end='')
        return 0
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f'本土化资料错误：{exc}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8')
    raise SystemExit(main())
