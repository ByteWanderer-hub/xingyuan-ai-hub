"""Behavior tests for read-only keyword routing and capability boundaries."""
from pathlib import Path
import importlib.util
import json
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

    def test_qianxing_assets(self):
        self.assertEqual(self.names('千星找图片图标素材')[0], 'miliastra-ui')
        self.assertNotIn('qianxing-auto-delivery', self.names('千星找图片图标素材'))

    def test_tiantangzhimen_gia(self):
        names = self.names('天堂之门设计图生成客户端 GIA')
        self.assertIn('tiantangzhimen-gia', names)

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

    def test_reference_art_platform_boundary_and_capability_warning(self):
        self.assertNotIn('miliastra-ui', self.names('Unity 参考图转原生控件'))
        self.assertNotIn('miliastra-ui', self.names('给我一张冰淇淋图片'))
        warnings = route.lookup('千星参考图转 GIA')['warnings']
        self.assertTrue(any('通用 GIA 地图生成器' in warning for warning in warnings))

    def test_bug_with_engine(self):
        names = self.names('千星 Lua require 报错')
        self.assertIn('miliastra-code', names)
        self.assertIn('systematic-debugging', names)

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

    def test_context_override(self):
        self.assertIn('miliastra-ui', self.names('UI 图片', 'qianxing'))
        self.assertNotIn('miliastra-ui', self.names('不要Roblox做千星UI', 'other'))


if __name__ == '__main__':
    unittest.main()
