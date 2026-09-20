import json
import os
import random
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sim.engine import Faction, Memory, Relationship, attempt_ritual_formation, initialize_world
import sim.server as server


class TinyGodsRegressionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original_save_file = server.SAVE_FILE
        server.stop_simulation()

    @classmethod
    def tearDownClass(cls):
        server.stop_simulation()
        server.SAVE_FILE = cls.original_save_file

    def setUp(self):
        server.stop_simulation()
        server.world = initialize_world()
        server.world.seed = 42
        self.tempdir = tempfile.TemporaryDirectory()
        server.SAVE_FILE = os.path.join(self.tempdir.name, 'tiny_gods_save.json')
        self.client = server.app.test_client()

    def tearDown(self):
        server.stop_simulation()
        self.tempdir.cleanup()

    def test_01_environment_branch(self):
        branch = subprocess.check_output(['git', 'branch', '--show-current'], cwd=ROOT, text=True).strip()
        self.assertIn(branch, ['arena/01a0bb23-tiny-gods', 'arena/01a0bce6-tiny-gods'])

    def test_02_lifecycle_start_stop_restart_is_idempotent(self):
        self.assertFalse(server.sim_thread_started)
        server.start_simulation()
        first = server.sim_thread
        time.sleep(0.04)
        self.assertTrue(first and first.is_alive())
        server.start_simulation()
        self.assertIs(server.sim_thread, first)
        server.stop_simulation()
        self.assertFalse(server.sim_thread_started)
        self.assertIsNone(server.sim_thread)
        server.start_simulation()
        second = server.sim_thread
        time.sleep(0.04)
        self.assertTrue(second and second.is_alive())
        self.assertIsNot(second, first)

    def test_03_load_returns_without_deadlock_and_restarts(self):
        saved_tick = server.world.tick
        response = self.client.post('/api/save', json={})
        self.assertEqual(response.status_code, 200)
        response = self.client.get('/api/load')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['status'], 'loaded_real')
        self.assertTrue(server.sim_thread_started)
        self.assertGreaterEqual(server.world.tick, saved_tick)

    def test_04_test_run_validation_and_rng_isolation(self):
        before = random.getstate()
        response = self.client.post('/api/test_run', json={'ticks': 5, 'seed': 123})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['ticks_run'], 5)
        self.assertEqual(random.getstate(), before)
        self.assertEqual(self.client.post('/api/test_run', json={'ticks': 0}).status_code, 400)
        self.assertEqual(self.client.post('/api/test_run', json={'ticks': 'nope'}).status_code, 400)

    def test_05_power_thresholds_and_coordinates_are_authoritative(self):
        server.world.player_history = [{'kind': 'observe', 'tick': i, 'x': 0, 'y': 0} for i in range(4)]
        powers = {p['kind']: p for p in self.client.get('/api/powers').json['available']}
        self.assertFalse(powers['wind']['available'])
        self.assertEqual(self.client.post('/api/action', json={'kind': 'wind', 'x': 111, 'y': 222, 'radius': 80}).status_code, 403)
        server.world.player_history = [{'kind': 'observe', 'tick': i, 'x': 0, 'y': 0} for i in range(5)]
        powers = {p['kind']: p for p in self.client.get('/api/powers').json['available']}
        self.assertTrue(powers['wind']['available'])
        response = self.client.post('/api/action', json={'kind': 'wind', 'x': 111, 'y': 222, 'radius': 80})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['x'], 111.0)
        self.assertEqual(response.json['y'], 222.0)

    def test_06_persistence_roundtrip_preserves_dead_people_and_memory_fields(self):
        creature = next(iter(server.world.creatures.values()))
        creature.alive = False
        creature.family_history = [7, 8]
        creature.family_reputation = 3.25
        creature.relationship_reasons[999] = ['remembered kindness']
        creature.last_interpretation_tick = 44
        creature.awe_memory = 0.73
        creature.size = 7.5
        creature.relationships[999] = Relationship(target_id=999, value=42, label='ally')
        creature.memories.append(Memory(tick=12, event_type='omen', description='A red moon', emotional_valence=-0.4, location=(123, 456), source='told_by_id', source_reference=2, event_reference='evt_12_x', transmission_depth=3))
        state = server.serialize_full_world(server.world)
        restored = server.deserialize_world_state(state)
        c = restored.creatures[creature.id]
        self.assertFalse(c.alive)
        self.assertEqual(c.family_history, [7, 8])
        self.assertEqual(c.family_reputation, 3.25)
        self.assertEqual(c.relationship_reasons[999], ['remembered kindness'])
        self.assertEqual(c.last_interpretation_tick, 44)
        self.assertAlmostEqual(c.awe_memory, 0.73)
        self.assertAlmostEqual(c.size, 7.5)
        m = c.memories[-1]
        self.assertEqual(m.location, [123, 456] if isinstance(m.location, list) else (123, 456))
        self.assertEqual(m.source_reference, 2)
        self.assertEqual(m.event_reference, 'evt_12_x')
        self.assertEqual(m.transmission_depth, 3)
        self.assertAlmostEqual(m.emotional_valence, -0.4)

    def test_07_full_history_not_truncated_in_save(self):
        server.world.player_history = [{'kind': 'observe', 'n': i} for i in range(150)]
        state = server.serialize_full_world(server.world)
        self.assertEqual(len(state['player_history']), 150)
        self.assertEqual(len(state['terrain_full']), len(server.world.terrain))
        self.assertEqual(len(state['resources_full']), len(server.world.resources))

    def test_08_atomic_save_and_previous_good_recovery(self):
        server.world.tick = 10
        self.assertEqual(self.client.post('/api/save', json={}).status_code, 200)
        server.world.tick = 20
        self.assertEqual(self.client.post('/api/save', json={}).status_code, 200)
        previous = server.SAVE_FILE.replace('.json', '.previous.json')
        self.assertTrue(os.path.exists(previous))
        Path(server.SAVE_FILE).write_text('{broken json')
        response = self.client.get('/api/load')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json['recovered_from_previous'])
        self.assertEqual(response.json['saved_tick'], 10)

    def test_09_export_import_roundtrip_and_invalid_import_safety(self):
        server.world.tick = 77
        exported = self.client.get('/api/export')
        self.assertEqual(exported.status_code, 200)
        payload = exported.json
        self.assertEqual(payload['schema_version'], server.PERSISTENCE_SCHEMA_VERSION)
        server.world.tick = 999
        response = self.client.post('/api/import', json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['tick'], 77)
        server.stop_simulation()
        current_world = server.world
        bad = self.client.post('/api/import', json={'tick': 1, 'schema_version': 999})
        self.assertEqual(bad.status_code, 400)
        self.assertIs(server.world, current_world)

    def test_10_rng_state_roundtrip(self):
        random.seed(12345)
        state = server.serialize_full_world(server.world)
        expected = [random.random() for _ in range(5)]
        random.seed(999)
        server.deserialize_world_state(state)
        actual = [random.random() for _ in range(5)]
        self.assertEqual(actual, expected)

    def test_11_javascript_parses_and_has_single_behavior_owners(self):
        app_js = ROOT / 'public' / 'app.js'
        result = subprocess.run(['node', '--check', str(app_js)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        source = app_js.read_text()
        self.assertEqual(source.count('async function sendAction('), 1)
        self.assertEqual(source.count('async function openCreatureModal('), 1)
        self.assertEqual(source.count('requestAnimationFrame(frame)'), 2)  # one loop edge + one startup
        self.assertIn("JSON.stringify({kind, x, y, radius:80})", source)

    def test_12_frontend_is_local_first_and_uses_real_persistence_endpoints(self):
        html = (ROOT / 'public' / 'index.html').read_text()
        js = (ROOT / 'public' / 'app.js').read_text()
        self.assertNotIn('fonts.googleapis.com', html)
        self.assertEqual(html.count('<script'), 1)
        self.assertIn('src="/app.js"', html)
        self.assertIn("apiJson('/api/export')", js)
        self.assertIn("apiJson('/api/import'", js)
        self.assertNotIn("fetch('/api/state').then", js)
        self.assertNotIn('To fully import', js)

    def test_13_frontend_uses_real_lineage_theology_story_and_observer_data(self):
        js = (ROOT / 'public' / 'app.js').read_text()
        self.assertIn('`/api/lineage/${selectedCreatureData.family}`', js)
        self.assertIn('`/api/religion/${id}`', js)
        self.assertIn('current_story_threads', js)
        self.assertIn('focusObserverTarget()', js)
        self.assertIn("localStorage.setItem('tiny-gods-onboarding-v1'", js)
        self.assertIn('cameraOffset.x=gesture.startOffset.x+dx', js)
        self.assertIn("mode:'pinch'", js)

    def test_14_vfx_do_not_replay_history_on_interval(self):
        js = (ROOT / 'public' / 'app.js').read_text()
        self.assertNotIn('Replay recent player events', js)
        self.assertNotIn('history.length - 8', js)
        self.assertIn('triggerPowerPresentation(kind, data.x, data.y, data.radius)', js)
        self.assertIn("kind === 'lightning'", js)
        self.assertIn("p.kind==='rain'", js)
        self.assertIn("p.kind==='wind'", js)


    def test_16_ritual_formation_handles_zero_new_supporters(self):
        from unittest.mock import patch
        settlement = next(iter(server.world.settlements.values()))
        believers = [c for c in server.world.creatures.values() if c.settlement_id == settlement.id][:6]
        self.assertGreaterEqual(len(believers), 5)
        for creature in believers:
            creature.belief_strength = 0.9
            creature.religion_name = 'Existing Tradition'
        before = len(server.world.chronicle)
        with patch('sim.engine.random.random', return_value=0.0):
            attempt_ritual_formation(server.world)
        self.assertGreater(len(server.world.chronicle), before)
        self.assertIn('led by', server.world.chronicle[-1].description)


    def test_17_lineage_endpoint_includes_dead_family_members(self):
        creature = next(iter(server.world.creatures.values()))
        family_id = creature.family
        creature.alive = False
        response = self.client.get(f'/api/lineage/{family_id}')
        self.assertEqual(response.status_code, 200)
        members = response.json['members']
        match = next(m for m in members if m['id'] == creature.id)
        self.assertFalse(match['alive'])

    def test_18_religion_endpoint_returns_comparison_data(self):
        faction = Faction(
            id=501, name='Test Tradition', members=set(), settlement_ids=set(),
            belief_summary='The unseen is a witness', ritual_practices=['quiet vigil'],
            doctrine_claims=['storms are warnings']
        )
        server.world.factions[faction.id] = faction
        response = self.client.get('/api/religion/501')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['belief_summary'], 'The unseen is a witness')
        self.assertEqual(response.json['doctrine_claims'], ['storms are warnings'])
        self.assertEqual(response.json['ritual_practices'], ['quiet vigil'])


    def test_19_inline_controls_resolve_to_real_js_functions(self):
        import re
        html = (ROOT / 'public' / 'index.html').read_text()
        js = (ROOT / 'public' / 'app.js').read_text()
        handlers = set(re.findall(r'onclick="([A-Za-z_][A-Za-z0-9_]*)\(', html))
        self.assertTrue(handlers)
        for handler in handlers:
            self.assertRegex(js, rf'function\s+{re.escape(handler)}\s*\(')

    def test_15_no_generated_save_is_tracked(self):
        tracked = subprocess.run(['git', 'ls-files', 'data/tiny_gods_save.json'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
        self.assertEqual(tracked, '')
        ignore = (ROOT / '.gitignore').read_text()
        self.assertIn('data/*.json', ignore)


if __name__ == '__main__':
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(TinyGodsRegressionTests))
    raise SystemExit(0 if result.wasSuccessful() else 1)
