"""Behavior tests for read-only keyword routing and capability boundaries."""
from pathlib import Path
import importlib.util
import json
import re
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('route', ROOT / 'skills/xingyuan-router/scripts/route.py')
route = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(route)


class RoutingTests(unittest.TestCase):
    def names(self, query, platform='auto'):
        return [x['skill'] for x in route.lookup(query, platform)['candidates']]

    def test_user_intent_alignment(self):
        for query in ('整理我与你对话的风格，让你更好听懂我的话',
                      '我的意思是之前选的那一批', '你理解错了，按我的习惯理解',
                      '复盘沟通风格', 'communication style', '$user-intent-alignment'):
            with self.subTest(query=query):
                self.assertEqual(self.names(query)[0], 'user-intent-alignment')

    def test_user_intent_alignment_scope(self):
        for query in ('千星角色对话系统', '继续', '装到D盘', '重做成功界面',
                      '写一个聊天机器人', '总结项目文档', '生成游戏角色人格'):
            with self.subTest(query=query):
                self.assertNotIn('user-intent-alignment', self.names(query))
        names = self.names('千星UI，你理解错了，只改成功界面')
        self.assertIn('user-intent-alignment', names)
        self.assertIn('miliastra-ui', names)

    def test_whalechan_character_and_comic(self):
        for query in ('鲸鱼娘人设图', 'DeepSeek娘立绘', '鲸鱼娘插画',
                      'whale-chan portrait', '$whalechan-image-character'):
            self.assertEqual(self.names(query)[0], 'whalechan-image-character')
        for query in ('鲸鱼娘表情包', 'DeepSeek娘漫画', '鲸鱼娘四格',
                      'whalechan meme', '$whalechan-image-comic'):
            self.assertEqual(self.names(query)[0], 'whalechan-image-comic')

    def test_whalechan_scope_boundaries(self):
        for query in ('原创角色人设图', '普通表情包生成', '千星UI图片转GIA',
                      'QQ机器人表情包上传收藏', 'Unity character design'):
            self.assertNotIn('whalechan-image-character', self.names(query))
            self.assertNotIn('whalechan-image-comic', self.names(query))
        names = self.names('鲸鱼娘表情包上传到QQ机器人收藏')
        self.assertIn('whalechan-image-comic', names)
        self.assertIn('qq-sticker-pack', names)

    def test_qianxing_assets(self):
        self.assertEqual(self.names('千星找图片图标素材')[0], 'miliastra-ui')
        self.assertNotIn('qianxing-auto-delivery', self.names('千星找图片图标素材'))

    def test_qianxing_2d_matching_assets(self):
        for query in ('千星2D控件生成，同型物体优先用对应资产',
                      '千星 2D 控件，不用像素块拼画', '千星同型资产优先'):
            with self.subTest(query=query):
                self.assertEqual(self.names(query)[0], 'miliastra-ui')
                self.assertNotIn('tiantangzhimen-gia', self.names(query))
        self.assertNotIn('miliastra-ui', self.names('Unity 2D 控件'))

    def test_qianxing_ui_ux_workflow(self):
        for query in ('优化我千星的 UI /UX技能', '千星 UI/UX 从需求到试玩',
                      '千星分区布局与控件选型', '千星控件组状态绑定',
                      '千星多端适配安全区', '千星手柄导航与焦点导航',
                      'miliastra ui workflow'):
            with self.subTest(query=query):
                self.assertEqual(self.names(query)[0], 'miliastra-ui')
        self.assertIn('game-ui-ux', self.names('千星手柄导航'))
        for query in ('Unity UI/UX 多端适配', '网页分区布局与控件选型',
                      '整理一张工作流程图', 'Roblox ui workflow'):
            with self.subTest(query=query):
                self.assertNotIn('miliastra-ui', self.names(query))

    def test_tiantangzhimen_gia(self):
        names = self.names('天堂之门设计图生成客户端 GIA')
        self.assertIn('tiantangzhimen-gia', names)

    def test_local_static_asset_pack(self):
        for query in ('千星图片静态资产.zip', '千星资产ID与对照图',
                      'miliastra asset pack', 'miliastra asset id mapping'):
            with self.subTest(query=query):
                self.assertEqual(self.names(query)[0], 'miliastra-ui')
                self.assertNotIn('tiantangzhimen-gia', self.names(query))
        for query in ('Unity asset pack', '解压普通ZIP文件', 'Roblox asset id'):
            self.assertNotIn('miliastra-ui', self.names(query))

    def test_reference_art_workflow(self):
        for query in ('千星按参考图生成原生控件，先预览和控件数量，不生成GIA',
                      '千星图片转GIA', 'miliastra reference image to native UI art',
                      '千星按参考图固定规则，后续代码动态创建'):
            with self.subTest(query=query):
                self.assertEqual(self.names(query)[0], 'miliastra-ui')

    def test_general_art_does_not_select_map_specific_export(self):
        for query in ('千星其他地图图片转控件，生成客户端 GIA',
                      '千星原生控件房间容器与门包装节点',
                      '千星参考图转 GIA 导出验收'):
            with self.subTest(query=query):
                self.assertIn('miliastra-ui', self.names(query))
                self.assertNotIn('tiantangzhimen-gia', self.names(query))

    def test_generic_image_only_gia_and_lua(self):
        for query in ('千星生成只有图片控件的 GIA，不绑定地图',
                      '千星图片转Lua', '千星参考图转 Lua',
                      '千星只有图片控件的 Lua 动态创建模块',
                      'miliastra image-only GIA', 'miliastra image to lua'):
            with self.subTest(query=query):
                names = self.names(query)
                self.assertEqual(names[0], 'miliastra-ui')
                self.assertNotIn('tiantangzhimen-gia', names)
                self.assertIn('miliastra-code', names)

    def test_image_only_does_not_capture_unrelated_platforms(self):
        for query in ('Unity image-only UI', 'Roblox image to lua',
                      '把照片转成图片', '修改一个 Lua 文件'):
            with self.subTest(query=query):
                self.assertNotIn('miliastra-ui', self.names(query))

    def test_reference_art_platform_boundary_and_capability_warning(self):
        self.assertNotIn('miliastra-ui', self.names('Unity 参考图转原生控件'))
        self.assertNotIn('miliastra-ui', self.names('给我一张冰淇淋图片'))
        warnings = route.lookup('千星参考图转 GIA')['warnings']
        self.assertTrue(any('通用 GIA 地图生成器' in warning for warning in warnings))

    def test_unproven_capabilities_not_indexed(self):
        """REA / XERJ / 千星编辑器 / Claude Code 专用技能：未证明可用，不得留在索引里。"""
        for query in ('REA 逆向工具怎么装', '装个 XERJ 做本地检索', '千星编辑器打不开'):
            with self.subTest(query=query):
                result = route.lookup(query)
                self.assertEqual(result['externals'], [])
        self.assertEqual(route.lookup('REA 逆向工具怎么装')['candidates'], [])
        data = json.loads((route.SKILL_DIR/'references/routes.json').read_text(encoding='utf-8'))
        names = {row['name'] for row in data['skills']}
        self.assertNotIn('git-guardrails-claude-code', names)
        self.assertFalse((ROOT/'skills/git-guardrails-claude-code').exists())

    def test_kind_classification(self):
        data = json.loads((route.SKILL_DIR/'references/routes.json').read_text(encoding='utf-8'))
        kinds = {row['name']: row['kind'] for row in data['skills']}
        self.assertEqual(set(kinds.values()), {'skill', 'external', 'experience'})
        self.assertEqual(sum(1 for v in kinds.values() if v == 'skill'), 18)
        self.assertEqual(sum(1 for v in kinds.values() if v == 'experience'), 37)
        self.assertEqual(sum(1 for v in kinds.values() if v == 'external'), 1)
        for name, kind in kinds.items():
            if kind != 'experience':
                continue
            with self.subTest(skill=name):
                scripts = [p for p in (ROOT/'skills'/name).rglob('*')
                           if p.is_file() and p.suffix in {'.py', '.ps1', '.js', '.lua'}]
                self.assertEqual(scripts, [])
        result = route.lookup('打击感顿帧怎么做')
        self.assertEqual(result['candidates'][0]['skill'], 'game-feel')
        self.assertEqual(result['candidates'][0]['kind'], 'experience')
        self.assertEqual(route.lookup('$miliastra-code 千星脚本')['candidates'][0]['kind'], 'skill')

    def test_externals_section(self):
        data = json.loads((route.SKILL_DIR/'references/routes.json').read_text(encoding='utf-8'))
        externals = {e['name']: e for e in data['externals']}
        self.assertEqual(set(externals), {'snowluma-onebot'})
        for name, ext in externals.items():
            with self.subTest(external=name):
                self.assertIn(ext['kind'], {'mcp', 'service', 'platform', 'software'})
                self.assertIn(ext['status'], {'ready', 'unverified', 'missing'})
                self.assertTrue(ext['display'].strip() and ext['purpose'].strip() and ext['note'].strip())
                self.assertGreater(len(ext['keywords']), 0)
                self.assertEqual(len(ext['keywords']), len({k.casefold() for k in ext['keywords']}))
        for row in data['skills']:
            for req in row.get('requires', []):
                with self.subTest(skill=row['name'], requires=req):
                    self.assertIn(req, externals)
        result = route.lookup('SnowLuma 网关连不上')
        self.assertEqual(result['externals'][0]['name'], 'snowluma-onebot')
        self.assertEqual(result['externals'][0]['status'], 'ready')
        self.assertIn('qq-sticker-pack', result['externals'][0]['used_by'])
        self.assertEqual(route.lookup('千星编辑器怎么打开')['externals'], [])

    def test_ponytail_experience_route(self):
        for query in ('用 ponytail 模式写这个功能', '这段代码过度设计了，帮我精简', 'YAGNI 一下'):
            with self.subTest(query=query):
                result = route.lookup(query)
                self.assertEqual(result['candidates'][0]['skill'], 'ponytail')
                self.assertEqual(result['candidates'][0]['kind'], 'experience')
        for query in ('整理技能入口', '千星 UI 布局', '生成表情包'):
            with self.subTest(query=query):
                self.assertNotIn('ponytail', self.names(query))

    def test_matt_pocock_import(self):
        data = json.loads((route.SKILL_DIR/'references/routes.json').read_text(encoding='utf-8'))
        kinds = {row['name']: row['kind'] for row in data['skills']}
        for name in ('diagnosing-bugs', 'wizard'):
            self.assertEqual(kinds.get(name), 'skill', name)
        for name in ('tdd', 'to-spec', 'to-tickets', 'implement', 'pr', 'triage', 'retro',
                     'grilling', 'teach', 'handoff', 'writing-for-agents', 'research',
                     'codebase-design', 'domain-modeling', 'ask-matt'):
            self.assertEqual(kinds.get(name), 'experience', name)
        # 上游 code-review 合并进本库同名技能，不单独占条目
        self.assertNotIn('code-review-matt', kinds)
        self.assertTrue((ROOT/'skills/code-review/references/matt-pocock.md').is_file())
        self.assertEqual(self.names('用 tdd 先写测试')[0], 'tdd')
        self.assertEqual(self.names('把这个方案拆票')[0], 'to-tickets')
        self.assertEqual(self.names('帮我拷问一下这个设计')[0], 'grilling')
        self.assertEqual(self.names('写交接文档给下一个 agent')[0], 'handoff')
        for query in ('千星 UI 布局', '角色立绘', '生成表情包'):
            with self.subTest(query=query):
                for name in ('tdd', 'triage', 'grilling', 'handoff'):
                    self.assertNotIn(name, self.names(query))

    def test_self_description_probe(self):
        """每个技能的 description 应该能路由回自己；零网络、零安装的回归探针。"""
        data = json.loads((route.SKILL_DIR/'references/routes.json').read_text(encoding='utf-8'))
        total = ok1 = 0
        missed = []
        for row in data['skills']:
            md = ROOT/'skills'/row['name']/'SKILL.md'
            text = md.read_text(encoding='utf-8')
            found = re.search(r'^description:\s*(.+?)(?:\n\w+:|\n---)', text, re.S | re.M)
            desc = re.sub(r'\s+', ' ', found.group(1)).strip().strip('"').strip("'") if found else ''
            if not desc:
                continue
            total += 1
            names = self.names(desc)
            if row['name'] not in names:
                missed.append(row['name'])
            elif names[0] == row['name']:
                ok1 += 1
        self.assertEqual(missed, [], '这些技能用自己的 description 都路由不到自己')
        self.assertGreaterEqual(ok1 / total, 0.75, f'top-1 命中率过低：{ok1}/{total}')

    def test_bug_with_engine(self):
        names = self.names('千星 Lua require 报错')
        self.assertIn('miliastra-code', names)
        self.assertIn('systematic-debugging', names)

    def test_game_performance(self):
        for query in ('千星渲染卡顿掉帧', '千星 UI 粒子卡顿掉帧',
                      'Unity low fps frame time', 'Godot draw calls',
                      'Unreal rendering performance', '游戏 GC 尖峰，对象池',
                      '$performance-optimization'):
            with self.subTest(query=query):
                self.assertEqual(self.names(query)[0], 'performance-optimization')
        self.assertIn('miliastra-code', self.names('千星 Lua 渲染卡顿'))
        self.assertIn('miliastra-motion', self.names('千星 UI 粒子卡顿掉帧'))
        self.assertNotIn('miliastra-code', self.names('Unity low fps'))

    def test_performance_scope_negatives(self):
        for query in ('千星打击感顿帧 hit-stop', '设计关卡节奏',
                      '优化千星UI布局', '网站加载慢', '网络延迟 ping 高',
                      'React rerender', '给蒸汽增加动效'):
            with self.subTest(query=query):
                self.assertNotIn('performance-optimization', self.names(query))
        self.assertEqual(self.names('千星打击感顿帧 hit-stop')[0], 'game-feel')

    def test_explicit_skill(self):
        self.assertEqual(self.names('$level-design 设计关卡')[0], 'level-design')

    def test_no_roblox_without_context(self):
        self.assertNotIn('roblox-security-audit', self.names('千星反作弊'))
        self.assertIn('roblox-security-audit', self.names('Roblox 反作弊'))

    def test_other_engines(self):
        names = self.names('Godot UI HUD')
        self.assertIn('game-ui-ux', names)
        self.assertNotIn('miliastra-ui', names)

    def test_missing_specialties(self):
        result = route.lookup('土狼时间 输入缓冲')
        self.assertTrue(any('没有 platformer' in x for x in result['warnings']))
        self.assertNotIn('game-feel', self.names('土狼时间 输入缓冲'))
        self.assertTrue(any('GIA' in x for x in route.lookup('千星生成GIA')['warnings']))

    def test_desktop_toolbox(self):
        self.assertEqual(self.names('用 WinMerge 比较两个文件夹')[0], 'desktop-toolbox')
        self.assertEqual(self.names('查看二进制的十六进制偏移')[0], 'desktop-toolbox')
        self.assertNotIn('desktop-toolbox', self.names('修改一个 Lua 文件'))

    def test_unknown_and_word_boundary(self):
        self.assertEqual(self.names('build quick guidance'), [])
        self.assertEqual(self.names('给我做个蛋糕'), [])

    def test_all_targets_exist_and_are_unique(self):
        data = json.loads((route.SKILL_DIR/'references/routes.json').read_text(encoding='utf-8'))
        names = [r['name'] for r in data['skills']]
        self.assertEqual(len(names), len(set(names)))
        expected = {p.parent.name for p in (ROOT/'skills').glob('*/SKILL.md')} - {'xingyuan-router'}
        self.assertEqual(set(names), expected)
        for row in data['skills']:
            self.assertTrue((ROOT/'skills'/row['name']/'SKILL.md').is_file())

    def test_missing_install_is_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            skill = Path(directory)/'xingyuan-router'
            (skill/'references').mkdir(parents=True)
            (skill/'references/routes.json').write_bytes((route.SKILL_DIR/'references/routes.json').read_bytes())
            with patch.object(route, 'SKILL_DIR', skill):
                result = route.lookup('$miliastra-code')
                self.assertFalse(result['candidates'][0]['available'])

    def test_negated_platform(self):
        result = route.lookup('不要Roblox，千星UI按钮点了没反应')
        self.assertEqual(result['platform'], 'qianxing')
        names = [r['skill'] for r in result['candidates']]
        self.assertIn('miliastra-ui', names)
        self.assertIn('systematic-debugging', names)
        self.assertNotIn('roblox-luau-expert', names)

    def test_natural_maintenance_request(self):
        self.assertEqual(self.names('继续整理星缘资料库里重复的技能')[0], 'skill-manager')

    def test_project_lessons_skill_maintenance(self):
        for query in ('把这次项目的完整经验总结优化技能',
                      '项目复盘优化技能', '把项目经验写入技能',
                      '把经验写入技能', 'project lessons into skills'):
            with self.subTest(query=query):
                self.assertEqual(self.names(query)[0], 'skill-manager')
        for query in ('总结这次游戏项目', '优化角色技能伤害和冷却',
                      '千星气体波动动画优化', '网页杯子透视编辑器'):
            with self.subTest(query=query):
                self.assertNotIn('skill-manager', self.names(query))

    def test_prompt_refinement_merged_route(self):
        for query in ('帮我优化这个提示词', '把这些纠正整理成提示词',
                      '给客服写系统提示词', '给机器人写文字人设提示词',
                      '优化 prompt', 'prompt optimization', '$prompt-optimizer'):
            with self.subTest(query=query):
                names = self.names(query)
                self.assertEqual(names[0], 'user-intent-alignment')
                self.assertNotIn('prompt-optimizer', names)
        for query in ('千星角色对话系统', '继续', '优化千星按钮布局',
                      '训练语言模型权重', '帮我总结文章'):
            with self.subTest(query=query):
                self.assertNotIn('user-intent-alignment', self.names(query))

    def test_prompt_review_natural_phrasing(self):
        for query in ('这个 prompt 效果不好，帮我改一下', '帮我优化这个 prompt',
                      '帮我写一个客服提示词', '把这些要求整理成给另一个 AI 的指令',
                      '你又理解错了，继续修改当前按钮'):
            with self.subTest(query=query):
                self.assertEqual(self.names(query)[0], 'user-intent-alignment')
        for query in ('给游戏按钮增加提示文字', '修复命令行 prompt 显示',
                      '画一张客服头像', '只是问缺哪些依赖'):
            with self.subTest(query=query):
                self.assertNotIn('user-intent-alignment', self.names(query))

    def test_route_rows_have_meaningful_fields(self):
        data = json.loads((route.SKILL_DIR/'references/routes.json').read_text(encoding='utf-8'))
        for row in data['skills']:
            with self.subTest(skill=row['name']):
                self.assertTrue(row['purpose'].strip())
                self.assertIn(row['platform'], {'general', 'ugc', 'qianxing', 'roblox'})
                self.assertIsInstance(row['keywords'], list)
                self.assertGreater(len(row['keywords']), 0)
                self.assertTrue(all(isinstance(k, str) and k.strip() == k and k for k in row['keywords']))
                self.assertEqual(len(row['keywords']), len({k.casefold() for k in row['keywords']}))

    def test_each_indexed_keyword_can_reach_its_target(self):
        data = json.loads((route.SKILL_DIR/'references/routes.json').read_text(encoding='utf-8'))
        for row in data['skills']:
            platform = row['platform'] if row['platform'] in {'qianxing', 'roblox'} else 'other'
            for keyword in row['keywords']:
                with self.subTest(skill=row['name'], keyword=keyword):
                    self.assertIn(row['name'], self.names(keyword, platform))

    def test_entry_maintenance_requests(self):
        for query in ('新增技能后更新关键词入口', '修改技能的适用范围', '维护我们的快速跳转入口'):
            self.assertEqual(self.names(query)[0], 'skill-manager')
        self.assertNotIn('skill-manager', self.names('修改千星UI按钮颜色'))

    def test_generic_character_workflows(self):
        for query in ('设计原创人设图', '机器人角色三视图', 'character sheet'):
            self.assertEqual(self.names(query)[0], 'character-image-design')
        for query in ('帮我生成表情包', '原创表情包', 'character sticker'):
            self.assertEqual(self.names(query)[0], 'character-sticker-comic')
        self.assertEqual(self.names('鲸鱼娘人设图')[0], 'whalechan-image-character')
        self.assertEqual(self.names('鲸鱼娘表情包')[0], 'whalechan-image-comic')
        self.assertEqual(self.names('QQ机器人自定义表情上架')[0], 'qq-sticker-pack')
        for query in ('给机器人写文字人设提示词', '千星UI按钮布局'):
            self.assertNotIn('character-image-design', self.names(query))
            self.assertNotIn('character-sticker-comic', self.names(query))

    def test_animated_gif_route(self):
        for q in ('制作gif表情包', '给自设做表情包动图', 'animated gif'):
            self.assertEqual(self.names(q)[0], 'slack-gif-creator')
        for q in ('QQ自定义表情上架', '角色立绘', '千星UI动效'):
            self.assertNotIn('slack-gif-creator', self.names(q))

    def test_proactive_entry_requests(self):
        for q in ('再优化一遍技能入口', '任务开始时主动加载技能', '自动选择技能'):
            self.assertEqual(self.names(q)[0], 'skill-manager')

    def test_loading_and_freeze_natural_language(self):
        for q in ('切关卡很卡', '创建 UI 时间太长', '游戏加载慢'):
            self.assertIn('performance-optimization', self.names(q, 'qianxing'))
        for q in ('点击开始游戏后卡住不动', '书本还在原位，完全不动'):
            self.assertIn('systematic-debugging', self.names(q, 'qianxing'))
        for q in ('网站加载慢', '快递完全不动', '回复继续'):
            self.assertNotIn('performance-optimization', self.names(q))
        self.assertNotIn('skill-manager', self.names('优化游戏角色技能伤害'))

    def test_context_override(self):
        self.assertIn('miliastra-ui', self.names('UI 图片', 'qianxing'))
        self.assertNotIn('miliastra-ui', self.names('不要Roblox做千星UI', 'other'))


if __name__ == '__main__':
    unittest.main()
