#!/usr/bin/env python3
"""Read-only skill candidate lookup. No third-party dependencies or execution."""
from pathlib import Path
import argparse
import json
import re

SKILL_DIR = Path(__file__).resolve().parents[1]


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
        if any(matches(context, k) for k in ('千星', 'miliastra', 'qianxing')):
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
        results.append({'skill': row['name'], 'purpose': row['purpose'],
                        'matched': hits, 'explicit': explicit, 'score': score,
                        'path': str(target), 'available': target.is_file()})
    results.sort(key=lambda row: (-row['score'], row['skill']))
    warnings = [g['message'] for g in data['gaps'] if any(matches(text, k) for k in g['keywords'])]
    if platform == 'unknown':
        warnings.append('平台未知或混合；实际实现需结合上下文确认，可用 --platform 指定。')
    if not results:
        warnings.append('没有可靠命中；按任务目标人工选择或补充关键词，不自动加载所有技能。')
    return {'query': query, 'platform': platform, 'candidates': results, 'warnings': warnings,
            'note': '候选排序不是最终决策；人工核对否定词、平台和任务范围，再读目标 SKILL.md。此脚本不执行技能。'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('query')
    parser.add_argument('--platform', choices=['auto', 'qianxing', 'roblox', 'other', 'unknown'], default='auto')
    args = parser.parse_args()
    print(json.dumps(lookup(args.query, args.platform), ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
