"""Timeline-specific safety checks: no inferred chronology or serialized endings."""
import copy
import unittest

from query import read_data
from story_index import ROOT, check_index, read_json, lookup
from timeline import read_timeline, validate_timeline


class TimelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry, cls.entities, _ = read_data()
        cls.roster, _, _, cls.events, cls.timelines, cls.branches, cls.relations, cls.coverage = (
            *(__import__('story_index').read_stories()), *read_timeline())

    def errors(self, events=None, timelines=None, branches=None, relations=None, coverage=None):
        return validate_timeline(self.registry, self.entities, self.roster,
                                 events or self.events, timelines or self.timelines,
                                 branches or self.branches, relations or self.relations,
                                 coverage or self.coverage)

    def test_complete_playable_coverage_and_index(self):
        self.assertEqual(self.errors(), [])
        self.assertEqual(len(self.timelines), 122)
        self.assertEqual(len(self.branches), 102)
        self.assertEqual(check_index(), [])

    def test_cycle_and_world_date_are_rejected(self):
        events = copy.deepcopy(self.events)
        events[0]['progression_predecessor_ids'] = [events[1]['id']]
        events[1]['progression_predecessor_ids'] = [events[0]['id']]
        self.assertTrue(any('progression cycle' in err for err in self.errors(events=events)))
        events = copy.deepcopy(self.events)
        events[0]['in_world_date'] = 'not-reviewed'
        self.assertTrue(any('world date' in err for err in self.errors(events=events)))

    def test_hangout_endings_stay_alternatives(self):
        branches = copy.deepcopy(self.branches)
        branches[0]['successor_branch_ids'] = [branches[1]['id']]
        self.assertTrue(any('cannot be serialized' in err for err in self.errors(branches=branches)))
        branches = copy.deepcopy(self.branches)
        branches[0]['mutually_exclusive_with'] = []
        self.assertTrue(any('mutual exclusion' in err for err in self.errors(branches=branches)))

    def test_aspect_and_relation_are_not_silently_flattened(self):
        index = read_json(ROOT / 'ai_index.json')
        self.assertEqual(lookup(index, 'aspect.raiden-ei', 'all')['entity'], 'aspect.raiden-ei')
        self.assertEqual(index['entities']['aspect.raiden-ei']['title'], '影（任务中明确点名）')
        self.assertIn('event_relation_ids', lookup(index, '钟离', 'all')['collections'])
        relations = copy.deepcopy(self.relations)
        relations[0]['assertion'] = 'coappearance'
        self.assertTrue(any('coappearance' in err for err in self.errors(relations=relations)))


if __name__ == '__main__':
    unittest.main()
