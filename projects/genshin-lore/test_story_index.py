"""Regression checks for archive gaps, identity counting and safe portable retrieval."""
import copy
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

from query import read_data
from story_index import (ROOT, DATA_FILES, read_json, read_stories, validate_stories,
                         build_index, check_index, lookup, digest)


class StoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry, cls.entities, _ = read_data()
        cls.roster, cls.profiles, cls.stories = read_stories()
        cls.index = read_json(ROOT / 'ai_index.json')

    def errors(self, roster=None, profiles=None, stories=None, registry=None):
        return validate_stories(registry or self.registry, self.entities,
                                roster or self.roster, profiles or self.profiles,
                                stories or self.stories)

    def run_cli(self, script, *args):
        return subprocess.run([sys.executable, '-B', str(ROOT / script), *args],
                              cwd=Path.home(), text=True, encoding='utf-8', capture_output=True)

    def test_archive_integrity_and_roster_snapshot(self):
        self.assertEqual(self.errors(), [])
        self.assertEqual(len(self.roster['characters']), 122)
        self.assertEqual(sum(not p['playable'] for p in self.profiles), 9)
        self.assertEqual(check_index(), [])

    def test_alternate_forms_do_not_inflate_people(self):
        roster = {r['entity']: r for r in self.roster['characters']}
        self.assertEqual(len(roster['character.traveler']['forms']), 8)
        self.assertEqual(len(roster['character.wonderland-manekin']['forms']), 2)
        for name in ('Aether', 'Lumine', '旅行者'):
            self.assertEqual(lookup(self.index, name)['entity'], 'character.traveler')

    def test_known_source_gaps_and_corrections_remain_explicit(self):
        records = {s['title']: s for s in self.stories}
        self.assertEqual(sum(s['availability'] == 'source_unopened' for s in self.stories), 4)
        for title in ('提纳里·初学者放大镜', '提纳里·神之眼'):
            self.assertEqual(records[title]['locator']['source_id'], 'story-bwiki-提纳里')
        for title in ('嘉明·角色详细', '嘉明·「给嘉明仔」', '夏沃蕾·特巡队贰型制式铳枪'):
            self.assertTrue(records[title]['corrections'])
        avatar = [s for s in self.stories if s['entity'] == 'character.wonderland-manekin']
        self.assertEqual([s['section_title'] for s in avatar], ['公开介绍'])

    def test_world_memory_variants_keep_conditions(self):
        variants = [s for s in self.stories if s['entity'] == 'character.nahida' and s.get('variants')]
        self.assertTrue(variants)
        for story in variants:
            self.assertEqual(len(story['variants']), 2)
            self.assertNotEqual(story['variants'][0]['text_sha256'], story['variants'][1]['text_sha256'])
            self.assertTrue(all(v['condition'] for v in story['variants']))

    def test_missing_chapter_and_wrong_owner_are_rejected(self):
        profiles = copy.deepcopy(self.profiles)
        profiles[0]['story_ids'].pop()
        self.assertTrue(any('orphaned' in e for e in self.errors(profiles=profiles)))
        stories = copy.deepcopy(self.stories)
        stories[0]['entity'] = 'character.paimon'
        self.assertTrue(any('ownership' in e for e in self.errors(stories=stories)))

    def test_source_unopened_cannot_be_relabelled_complete(self):
        stories = copy.deepcopy(self.stories)
        next(s for s in stories if s['availability'] == 'source_unopened')['coverage'] = '完整'
        self.assertTrue(any('unopened' in e for e in self.errors(stories=stories)))

    def test_release_evidence_and_section_fingerprints_checked(self):
        roster = copy.deepcopy(self.roster)
        roster['characters'][0]['release_date'] = '2099-01-01'
        self.assertTrue(any('future release' in e for e in self.errors(roster=roster)))
        stories = copy.deepcopy(self.stories)
        next(s for s in stories if 'decoded_pointer' in s['locator'])['locator']['html_sha256'] = '0' * 64
        self.assertTrue(any('fingerprint' in e for e in self.errors(stories=stories)))

    def test_official_community_does_not_imply_official_author(self):
        registry = copy.deepcopy(self.registry)
        next(s for s in registry['sources'] if s.get('official_community'))['kind'] = 'official'
        self.assertTrue(any('authorship' in e for e in self.errors(registry=registry)))

    def test_index_locators_resolve_to_exact_lines(self):
        files = {}
        for ident, loc in self.index['cards'].items():
            if 'line' not in loc:
                continue
            if loc['file'] not in files:
                files[loc['file']] = (ROOT / loc['file']).read_bytes().splitlines()
            raw = files[loc['file']][loc['line'] - 1]
            self.assertEqual(json.loads(raw)['id'], ident)
            self.assertEqual(digest(raw), loc['sha256'])

    def test_file_changes_invalidate_index_until_rebuilt(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for filename in (*DATA_FILES, 'ai_index.json'):
                shutil.copyfile(ROOT / filename, root / filename)
            with (root / 'character_stories.jsonl').open('ab') as stream:
                stream.write(b'\n')
            self.assertTrue(check_index(root))
            (root / 'ai_index.json').write_text(json.dumps(build_index(root)), encoding='utf-8')
            self.assertEqual(check_index(root), [])

    def test_english_lookup_is_bounded_and_spoiler_filtered(self):
        hidden = lookup(self.index, 'NAHIDA')
        self.assertEqual(hidden['collections']['story_ids']['matched'], 0)
        self.assertEqual(hidden['collections']['profile_ids']['matched'], 0)
        shown = lookup(self.index, 'Nahida', 'all', 2)
        self.assertEqual(shown['collections']['story_ids']['shown'], 2)
        self.assertGreater(shown['collections']['story_ids']['matched'], 2)
        self.assertIn('not an asserted relationship', shown['mention_semantics'])

    def test_ambiguous_alias_never_picks_a_person_arbitrarily(self):
        index = copy.deepcopy(self.index)
        index['aliases']['ambiguous'] = ['character.nahida', 'character.paimon']
        with self.assertRaises(ValueError):
            lookup(index, 'ambiguous', 'all')

    def test_cli_works_from_another_directory(self):
        result = self.run_cli('story_index.py', '--lookup', 'Nahida', '--spoilers', 'all', '--limit', '2')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)['entity'], 'character.nahida')
        result = self.run_cli('query.py', '--stories', '--entity', 'Tighnari', '--spoilers', 'all', '--json', '--limit', '20')
        self.assertEqual(result.returncode, 0, result.stderr)
        data = json.loads(result.stdout)
        self.assertEqual(data['matched'], 8)
        self.assertTrue(all(s['source_details'] and s['locator'] for s in data['results']))
        hidden = self.run_cli('query.py', '--stories', '--entity', 'Nahida', '--json')
        self.assertEqual(json.loads(hidden.stdout)['matched'], 0)


if __name__ == '__main__':
    unittest.main()
