"""Evidence boundaries, usable exports and safe lookup for adaptation proposals."""
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from localization import (ROOT, read_context, read_kits, validate_kits, select_kits,
                          build_brief, render_markdown)
from story_index import read_json, check_index, lookup, build_index


class LocalizationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cards, cls.sources = read_context()
        cls.kits = read_kits()
        cls.index = read_json(ROOT / 'ai_index.json')

    def run_cli(self, *args):
        return subprocess.run([sys.executable, '-B', str(ROOT / 'localization.py'), *args],
                              cwd=Path.home(), text=True, encoding='utf-8', capture_output=True, timeout=20)

    def test_all_kits_have_usable_evidence_and_playable_choices(self):
        self.assertEqual(validate_kits(self.kits, self.cards), [])
        self.assertEqual(check_index(), [])
        self.assertGreaterEqual(len({kit['region'] for kit in self.kits}), 7)
        for kit in self.kits:
            loc = self.index['cards'][kit['id']]
            self.assertEqual(loc['kind'], 'original_adaptation')
            self.assertEqual(self.kits[int(loc['pointer'][1:])]['id'], kit['id'])

    def test_missing_or_community_anchor_cannot_be_canon(self):
        for bad_ref in ('does-not-exist', 'meme.emergency-food', self.kits[0]['id']):
            kits = copy.deepcopy(self.kits)
            kits[0]['anchors'][0]['card_id'] = bad_ref
            self.assertTrue(any('canonical anchor' in e for e in validate_kits(kits, self.cards)))

    def test_spoiler_downgrade_and_original_label_are_rejected(self):
        kits = copy.deepcopy(self.kits)
        major = next(kit for kit in kits if kit['spoiler'] == 'major')
        major['spoiler'] = 'none'
        kits[0]['kind'] = 'official'
        errors = validate_kits(kits, self.cards)
        self.assertTrue(any('anchor spoiler' in e for e in errors))
        self.assertTrue(any('labelled original' in e for e in errors))

    def test_missing_recovery_and_unknown_dialogue_speaker_fail(self):
        kits = copy.deepcopy(self.kits)
        kits[0]['beats'][0]['fail_forward'] = ''
        kits[0]['original_lines'][0]['speaker'] = 'unwritten-npc'
        errors = validate_kits(kits, self.cards)
        self.assertTrue(any('recovery' in e for e in errors))
        self.assertTrue(any('speaker unresolved' in e for e in errors))

    def test_index_build_rejects_spoiler_downgrade_and_noncanonical_evidence(self):
        for bad_ref in (None, 'does-not-exist', 'meme.emergency-food', 'pattern.liyue-delivery'):
            kits = copy.deepcopy(self.kits)
            major = next(kit for kit in kits if kit['spoiler'] == 'major')
            if bad_ref is None:
                major['spoiler'] = 'none'
            else:
                major['anchors'][0]['card_id'] = bad_ref
            def edited_json(path):
                return kits if path.name == 'localization_kits.json' else read_json(path)
            with self.subTest(anchor=bad_ref), patch('story_index.read_json', side_effect=edited_json):
                with self.assertRaisesRegex(ValueError, 'anchor spoiler|canonical anchor'):
                    build_index()

    def test_region_mechanic_and_entity_filters_intersect(self):
        kit = next(k for k in self.kits if k['region'] == '纳塔')
        selected = select_kits(self.kits, self.index, self.cards, region='纳塔',
                               mechanic=kit['mechanics'][0], entity='Mualani', spoilers='all')
        self.assertIn(kit['id'], [k['id'] for k in selected])
        self.assertEqual(select_kits(self.kits, self.index, self.cards, region='璃月',
                                     entity='Mualani', spoilers='all'), [])
        indexed = lookup(self.index, 'Mualani', 'all', 20)['collections']['localization_ids']
        self.assertIn(kit['id'], [loc['id'] for loc in indexed['locators']])

    def test_night_market_reference_keeps_external_loop_and_canon_separate(self):
        kit = next(k for k in self.kits if k['id'] == 'localization.liyue-night-market')
        self.assertEqual(kit['spoiler'], 'major')
        self.assertIn('东方夜雀食堂', kit['adaptation_reference']['work'])
        self.assertTrue(all('原创' in item or '不' in item for item in kit['adaptation_reference']['not_transferred']))
        selected = select_kits(self.kits, self.index, self.cards, region='璃月',
                               mechanic='经营', entity='香菱', spoilers='all')
        self.assertIn(kit['id'], [item['id'] for item in selected])
        self.assertEqual(select_kits(self.kits, self.index, self.cards,
                                     kit_id=kit['id'], spoilers='none'), [])
        brief = build_brief(kit, self.cards, self.sources, self.index)
        self.assertEqual(brief['adaptation_reference']['url'], 'https://store.steampowered.com/app/1584090/Touhou_Mystias_Izakaya/?l=schinese')
        self.assertIn('改编参考与边界', render_markdown({'matched': 1, 'shown': 1, 'spoiler_filter': 'all', 'results': [brief]}))
        malformed = copy.deepcopy(self.kits)
        next(item for item in malformed if item['id'] == kit['id'])['adaptation_reference']['not_transferred'] = []
        self.assertTrue(any('reference.not_transferred' in error for error in validate_kits(malformed, self.cards)))

    def test_relationship_direction_is_preserved_in_evidence(self):
        kit = next(k for k in self.kits if k['spoiler'] == 'major')
        brief = build_brief(kit, self.cards, self.sources, self.index)
        relation_anchors = [a for a in kit['anchors'] if 'subject' in self.cards[a['card_id']]]
        self.assertTrue(relation_anchors)
        for anchor in relation_anchors:
            card = self.cards[anchor['card_id']]
            for entity in (card['subject'], card['object']):
                selected = select_kits(self.kits, self.index, self.cards, entity=entity, spoilers='all')
                self.assertIn(kit['id'], [k['id'] for k in selected])
            self.assertIn(card['title'], [e['title'] for e in brief['canon_evidence']])
            evidence = next(e for e in brief['canon_evidence'] if e['card_id'] == card['id'])
            self.assertEqual(evidence['relation'], {k: card[k] for k in ('subject', 'object', 'relation_type')})
        self.assertEqual(brief['status'], 'design_proposal_unplaytested')

    def test_cli_is_bounded_and_does_not_leak_hidden_kit_by_id(self):
        result = self.run_cli('--list', '--json', '--limit', '1')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)['shown'], 1)
        major = next(k for k in self.kits if k['spoiler'] == 'major')
        hidden = self.run_cli('--kit', major['id'], '--json')
        self.assertEqual(hidden.returncode, 0, hidden.stderr)
        self.assertEqual(json.loads(hidden.stdout)['results'], [])
        self.assertNotIn(major['title'], hidden.stdout)
        self.assertNotEqual(self.run_cli('--limit', '21').returncode, 0)

    def test_markdown_contains_sources_and_observable_acceptance(self):
        kit = self.kits[0]
        brief = build_brief(kit, self.cards, self.sources, self.index)
        text = render_markdown({'matched': 1, 'shown': 1, 'spoiler_filter': 'all', 'results': [brief]})
        self.assertIn('原创', text)
        self.assertIn('失败续行', text)
        for item in brief['canon_evidence']:
            self.assertIn(item['time_scope'], text)
            self.assertIn(item['source_boundary'], text)
        for criterion in kit['acceptance']:
            self.assertIn('- [ ] ' + criterion, text)
        for source in brief['source_details']:
            self.assertIn(source['url'], text)
            self.assertIn(source['access'], text)

    def test_export_is_utf8_portable_and_does_not_overwrite_user_file(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / '设计方案.md'
            result = self.run_cli('--kit', self.kits[0]['id'], '--spoilers', 'all', '--output', str(target))
            self.assertEqual(result.returncode, 0, result.stderr)
            data = target.read_bytes()
            self.assertIn(self.kits[0]['title'], data.decode('utf-8'))
            self.assertNotIn(b'\r\n', data)
            again = self.run_cli('--kit', self.kits[0]['id'], '--output', str(target))
            self.assertNotEqual(again.returncode, 0)
            self.assertEqual(target.read_bytes(), data)


if __name__ == '__main__':
    unittest.main()
