"""
Test Suite: Tiny Gods 3D Visual Production Verification
Validates local Three.js asset pipeline, 3D coordinate transformations,
manifest license compliance, and frontend delivery invariants.
"""

import json
import os
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class Test3DProduction(unittest.TestCase):

    def test_01_local_threejs_vendor_inventory(self):
        """Verify Three.js and all required addons are locally vendored without CDN dependencies."""
        three_module = ROOT / 'public' / 'vendor' / 'three' / 'three.module.js'
        gltf_loader = ROOT / 'public' / 'vendor' / 'three' / 'addons' / 'loaders' / 'GLTFLoader.js'
        geom_utils = ROOT / 'public' / 'vendor' / 'three' / 'addons' / 'utils' / 'BufferGeometryUtils.js'
        skel_utils = ROOT / 'public' / 'vendor' / 'three' / 'addons' / 'utils' / 'SkeletonUtils.js'

        self.assertTrue(three_module.exists(), "three.module.js missing from local vendor")
        self.assertTrue(gltf_loader.exists(), "GLTFLoader.js missing from local vendor")
        self.assertTrue(geom_utils.exists(), "BufferGeometryUtils.js missing from local vendor")
        self.assertTrue(skel_utils.exists(), "SkeletonUtils.js missing from local vendor")

        self.assertGreater(three_module.stat().st_size, 500_000, "three.module.js unexpectedly truncated")

    def test_02_3d_asset_inventory_coverage(self):
        """Verify the complete 35-model inventory required by the living mythological diorama."""
        required_models = [
            # Vegetation
            'tree_oak.glb', 'tree_pine.glb', 'trees_cluster.glb', 'tree_dead.glb', 'waterplant.glb',
            # Rocks & Environment
            'rock_small.glb', 'rock_large.glb', 'cliff_formation.glb', 'sacred_monolith.glb', 'shrine_altar.glb',
            'torch_lit.glb', 'bridge_crossing.glb',
            # Physical Settlements
            'dwelling_hut.glb', 'dwelling_large.glb', 'gathering_hall.glb', 'temple_shrine.glb',
            'market.glb', 'workshop.glb', 'farm_windmill.glb', 'defensive_tower.glb',
            'defensive_wall.glb', 'building_ruin.glb',
            # Humanoid characters (adult, elder, child variants)
            'character_worker.glb', 'character_warrior.glb', 'character_scout.glb',
            'character_elder.glb', 'character_mystic.glb',
            # Role equipment props
            'prop_tool_axe.glb', 'prop_sword.glb', 'prop_shield.glb', 'prop_priest_staff.glb',
            'prop_spellbook.glb', 'prop_trade_crate.glb', 'prop_trade_barrel.glb', 'prop_forager_sack.glb'
        ]

        models_dir = ROOT / 'assets' / 'models'
        for model in required_models:
            p = models_dir / model
            self.assertTrue(p.exists(), f"Required 3D model missing: {model}")
            self.assertGreater(p.stat().st_size, 1000, f"Model file too small / corrupt: {model}")

            # Verify binary GLB header magic (0x46546C67 -> 'glTF' in little-endian)
            with open(p, 'rb') as f:
                header = f.read(4)
                self.assertEqual(header, b'glTF', f"Model {model} is not a valid binary GLB")

    def test_03_texture_and_vfx_assets(self):
        """Verify ground textures and VFX sprites exist with valid PNG signatures."""
        required_textures = [
            ROOT / 'assets' / 'textures' / 'terrain_grass.png',
            ROOT / 'assets' / 'textures' / 'terrain_dirt.png',
            ROOT / 'assets' / 'textures' / 'terrain_rock.png',
            ROOT / 'assets' / 'textures' / 'terrain_water_norm.png',
            ROOT / 'assets' / 'textures' / 'terrain_burned.png',
            ROOT / 'assets' / 'vfx' / 'sparkle.png',
            ROOT / 'assets' / 'vfx' / 'smoke.png',
            ROOT / 'assets' / 'vfx' / 'leaf.png',
            ROOT / 'assets' / 'vfx' / 'flame.png',
        ]

        png_magic = b'\x89PNG\r\n\x1a\n'
        for tex in required_textures:
            self.assertTrue(tex.exists(), f"Texture / VFX asset missing: {tex.name}")
            with open(tex, 'rb') as f:
                sig = f.read(8)
                self.assertEqual(sig, png_magic, f"{tex.name} is not a valid PNG image")

    def test_04_asset_manifest_compliance(self):
        """Verify docs/ASSET_MANIFEST.json lists permissive licenses (CC0/MIT) and source URLs."""
        manifest_path = ROOT / 'docs' / 'ASSET_MANIFEST.json'
        self.assertTrue(manifest_path.exists(), "docs/ASSET_MANIFEST.json missing")

        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)

        self.assertIn('assets', manifest)
        assets = manifest['assets']
        self.assertGreaterEqual(len(assets), 45, "Manifest does not cover full asset library")

        valid_licenses = {'CC0 1.0 Universal', 'MIT / CC0', 'MIT License'}
        for entry in assets:
            self.assertIn('filename', entry)
            self.assertIn('license', entry)
            self.assertIn(entry['license'], valid_licenses, f"Unverified license in {entry['filename']}")
            self.assertIn('source_url', entry)
            self.assertTrue(entry['source_url'], f"Missing source URL in {entry['filename']}")
            self.assertIn('runtime_role', entry)

    def test_05_coordinate_mapping_invariants(self):
        """Verify mathematical roundtrip between simulation coordinates and Three.js 3D world space."""
        world_width = 1200
        world_height = 900
        world_scale = 0.1

        # Test transformation functions mirroring app.js
        def sim_to_world(x, y):
            wx = (x - world_width * 0.5) * world_scale
            wz = (y - world_height * 0.5) * world_scale
            return wx, wz

        def world_to_sim(wx, wz):
            x = wx / world_scale + world_width * 0.5
            y = wz / world_scale + world_height * 0.5
            return max(0, min(world_width, x)), max(0, min(world_height, y))

        test_points = [
            (0, 0),
            (600, 450),
            (1200, 900),
            (240, 310),
            (850, 620)
        ]

        for sx, sy in test_points:
            wx, wz = sim_to_world(sx, sy)
            rx, ry = world_to_sim(wx, wz)
            self.assertAlmostEqual(sx, rx, places=4)
            self.assertAlmostEqual(sy, ry, places=4)

        # Center of simulation (600, 450) must map exactly to world center (0, 0)
        cx, cz = sim_to_world(600, 450)
        self.assertAlmostEqual(cx, 0.0)
        self.assertAlmostEqual(cz, 0.0)

    def test_06_proof_screenshots_exist_and_complete(self):
        """Verify all BEFORE and AFTER visual proof screenshots exist and are populated."""
        before_dir = ROOT / 'docs' / '3d-proof' / 'before'
        after_dir = ROOT / 'docs' / '3d-proof' / 'after'

        expected_before = [
            '01-world.png',
            '02-settlement.png',
            '03-creature.png',
            '04-divine-power.png'
        ]
        for f in expected_before:
            p = before_dir / f
            self.assertTrue(p.exists(), f"BEFORE screenshot missing: {f}")
            self.assertGreater(p.stat().st_size, 50_000, f"BEFORE screenshot empty: {f}")

        expected_after = [
            '01-world-perspective-desktop.png',
            '02-physical-settlement-cluster.png',
            '03-humanoid-creatures-roles.png',
            '04-divine-power-3d-vfx.png',
            '05-night-or-atmospheric-weather.png',
            '06-creature-inspection-raycast.png',
            '07-sacred-site-or-temple.png',
            '08-mobile-responsive-3d.png',
            'HERO.png'
        ]
        for f in expected_after:
            p = after_dir / f
            self.assertTrue(p.exists(), f"AFTER screenshot missing: {f}")
            self.assertGreater(p.stat().st_size, 20_000, f"AFTER screenshot empty: {f}")

    def test_07_frontend_single_script_module_and_no_cdn(self):
        """Verify index.html conforms to single-script constraint with type=module and zero CDN urls."""
        html = (ROOT / 'public' / 'index.html').read_text(encoding='utf-8')
        self.assertEqual(html.count('<script'), 1, "Must contain exactly 1 script tag")
        self.assertIn('<script type="module" src="/app.js"></script>', html)
        self.assertNotIn('cdn.jsdelivr.net', html)
        self.assertNotIn('unpkg.com', html)
        self.assertNotIn('cdnjs.cloudflare.com', html)
        self.assertNotIn('skypack.dev', html)


if __name__ == '__main__':
    unittest.main()
