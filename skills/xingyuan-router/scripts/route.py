#!/usr/bin/env python3
"""Read-only skill candidate lookup. No third-party dependencies or execution."""
from pathlib import Path
import argparse
import json
import re

SKILL_DIR = Path(__file__).resolve().parents[1]

EXTERNAL_LABELS = {'mcp': ' MCP 服务', 'service': '服务', 'platform': '平台/运行时', 'software': '软件'}


def matches(text, term):
    term = term.casefold()
    if re.fullmatch(r'[a-z0-9 _.-]+', term):
        return bool(re.search(r'(?<![a-z0-9_-])' + re.escape(term) + r'(?![a-z0-9_-])', text))
    return term in text


def lookup(query, platform='auto'):
    data = json.loads((SKILL_DIR / 'references/routes.json').read_text(encoding='utf-8'))
    text = query.casefold().strip()
    if platform == 'auto':
        detected = []
        # Handle common explicit platform exclusions; complex prose still needs review.
        context = re.sub(r'(?:不要|不用|不是|不做|非)\s*(?:roblox|luau|千星|miliastra|qianxing|godot|unity|unreal)', '', text)
        if any(matches(context, k) for k in ('roblox', 'luau')):
            detected.append('roblox')
        if any(matches(context, k) for k in ('千星', 'miliastra', 'qianxing', '天堂之门')):
            detected.append('qianxing')
        if any(matches(context, k) for k in ('unity', 'godot', 'unreal')):
            detected.append('other')
        platform = detected[0] if len(detected) == 1 else 'unknown'
    results = []
    for row in data['skills']:
        explicit = matches(text, row['name'])
        # Platform-specific candidates need explicit context or an explicit skill name.
        if not explicit and row['platform'] not in ('general', 'ugc', platform):
            continue
        hits = [k for k in row['keywords'] if matches(text, k)]
        if not hits and not explicit:
            continue
        target = SKILL_DIR.parent / row['name'] / 'SKILL.md'
        score = (100 if explicit else 0) + len(hits) * 3
        if row['platform'] == platform:
            score += 2
        results.append({'skill': row['name'], 'kind': row['kind'], 'purpose': row['purpose'],
                        'matched': hits, 'explicit': explicit, 'score': score,
                        'requires': row.get('requires', []),
                        'path': str(target), 'available': target.is_file()})
    results.sort(key=lambda row: (-row['score'], row['skill']))
    names = {row['name']: row for row in data['skills']}
    externals = []
    for ext in data.get('externals', []):
        hits = [k for k in ext['keywords'] if matches(text, k)]
        if not hits:
            continue
        externals.append({'name': ext['name'], 'display': ext['display'], 'kind': ext['kind'],
                          'status': ext['status'], 'purpose': ext['purpose'], 'note': ext['note'],
                          'install': ext.get('install', ''),
                          'matched': hits,
                          'used_by': sorted(n for n, row in names.items()
                                            if ext['name'] in row.get('requires', []))})
    warnings = [g['message'] for g in data['gaps'] if any(matches(text, k) for k in g['keywords'])]
    for ext in externals:
        label = EXTERNAL_LABELS[ext['kind']]
        if ext['status'] == 'ready':
            warnings.append('外部{0}：{1}（ready）。{2} 使用前仍要复核当前状态。'.format(
                label, ext['display'], ext['purpose']))
        else:
            warnings.append('外部{0}：{1}（{2}）。{3} 先核验本机是否已接入；缺失则提示用户安装：{4} '
                            '用户不安装、或装后仍不可用 → 本次不执行，也不用别的技能冒充。'.format(
                                label, ext['display'], ext['status'], ext['purpose'],
                                ext.get('install') or ext['note']))
    if platform == 'unknown':
        warnings.append('平台未知或混合；实际实现需结合上下文确认，可用 --platform 指定。')
    if not results:
        warnings.append('没有可靠命中；按任务目标人工选择或补充关键词，不自动加载所有技能。')
    return {'query': query, 'platform': platform, 'candidates': results, 'externals': externals,
            'warnings': warnings,
            'note': 'kind 区分三类：skill=可加载执行、experience=只取原则与数值、external=外部工具清单；'
                    'externals 是库外 MCP/服务/平台，须先核验可用性。候选排序不是最终决策，'
                    '人工核对否定词、平台和任务范围再读目标 SKILL.md。此脚本不执行技能。'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('query')
    parser.add_argument('--platform', choices=['auto', 'qianxing', 'roblox', 'other', 'unknown'], default='auto')
    args = parser.parse_args()
    print(json.dumps(lookup(args.query, args.platform), ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
