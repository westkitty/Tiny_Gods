const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const models = [
  // Environment
  { src: '/tmp/assets-kaykit/medieval/addons/kaykit_medieval_hexagon_pack/Assets/gltf/decoration/nature/tree_single_A.gltf', dst: 'assets/models/tree_oak.glb' },
  { src: '/tmp/assets-kaykit/medieval/addons/kaykit_medieval_hexagon_pack/Assets/gltf/decoration/nature/tree_single_B.gltf', dst: 'assets/models/tree_pine.glb' },
  { src: '/tmp/assets-kaykit/medieval/addons/kaykit_medieval_hexagon_pack/Assets/gltf/decoration/nature/trees_A_small.gltf', dst: 'assets/models/trees_cluster.glb' },
  { src: '/tmp/assets-kaykit/medieval/addons/kaykit_medieval_hexagon_pack/Assets/gltf/decoration/nature/tree_single_A_cut.gltf', dst: 'assets/models/tree_dead.glb' },
  { src: '/tmp/assets-kaykit/medieval/addons/kaykit_medieval_hexagon_pack/Assets/gltf/decoration/nature/rock_single_A.gltf', dst: 'assets/models/rock_small.glb' },
  { src: '/tmp/assets-kaykit/medieval/addons/kaykit_medieval_hexagon_pack/Assets/gltf/decoration/nature/rock_single_B.gltf', dst: 'assets/models/rock_large.glb' },
  { src: '/tmp/assets-kaykit/medieval/addons/kaykit_medieval_hexagon_pack/Assets/gltf/decoration/nature/mountain_A.gltf', dst: 'assets/models/cliff_formation.glb' },
  { src: '/tmp/assets-kaykit/medieval/addons/kaykit_medieval_hexagon_pack/Assets/gltf/decoration/props/resource_stone.gltf', dst: 'assets/models/sacred_monolith.glb' },
  { src: '/tmp/assets-kaykit/dungeon/addons/kaykit_dungeon_remastered/Assets/gltf/pillar_decorated.gltf.glb', dst: 'assets/models/shrine_altar.glb' },
  { src: '/tmp/assets-kaykit/dungeon/addons/kaykit_dungeon_remastered/Assets/gltf/torch_lit.gltf.glb', dst: 'assets/models/torch_lit.glb' },
  { src: '/tmp/assets-kaykit/medieval/addons/kaykit_medieval_hexagon_pack/Assets/gltf/buildings/neutral/building_bridge_A.gltf', dst: 'assets/models/bridge_crossing.glb' },
  { src: '/tmp/assets-kaykit/medieval/addons/kaykit_medieval_hexagon_pack/Assets/gltf/decoration/nature/waterplant_A.gltf', dst: 'assets/models/waterplant.glb' },

  // Buildings
  { src: '/tmp/assets-kaykit/medieval/addons/kaykit_medieval_hexagon_pack/Assets/gltf/buildings/green/building_home_A_green.gltf', dst: 'assets/models/dwelling_hut.glb' },
  { src: '/tmp/assets-kaykit/medieval/addons/kaykit_medieval_hexagon_pack/Assets/gltf/buildings/green/building_home_B_green.gltf', dst: 'assets/models/dwelling_large.glb' },
  { src: '/tmp/assets-kaykit/medieval/addons/kaykit_medieval_hexagon_pack/Assets/gltf/buildings/green/building_tavern_green.gltf', dst: 'assets/models/gathering_hall.glb' },
  { src: '/tmp/assets-kaykit/medieval/addons/kaykit_medieval_hexagon_pack/Assets/gltf/buildings/green/building_church_green.gltf', dst: 'assets/models/temple_shrine.glb' },
  { src: '/tmp/assets-kaykit/medieval/addons/kaykit_medieval_hexagon_pack/Assets/gltf/buildings/green/building_market_green.gltf', dst: 'assets/models/market.glb' },
  { src: '/tmp/assets-kaykit/medieval/addons/kaykit_medieval_hexagon_pack/Assets/gltf/buildings/green/building_blacksmith_green.gltf', dst: 'assets/models/workshop.glb' },
  { src: '/tmp/assets-kaykit/medieval/addons/kaykit_medieval_hexagon_pack/Assets/gltf/buildings/green/building_windmill_green.gltf', dst: 'assets/models/farm_windmill.glb' },
  { src: '/tmp/assets-kaykit/medieval/addons/kaykit_medieval_hexagon_pack/Assets/gltf/buildings/green/building_tower_A_green.gltf', dst: 'assets/models/defensive_tower.glb' },
  { src: '/tmp/assets-kaykit/dungeon/addons/kaykit_dungeon_remastered/Assets/gltf/wall.gltf.glb', dst: 'assets/models/defensive_wall.glb' },
  { src: '/tmp/assets-kaykit/medieval/addons/kaykit_medieval_hexagon_pack/Assets/gltf/buildings/neutral/building_destroyed.gltf', dst: 'assets/models/building_ruin.glb' },

  // Characters
  { src: '/tmp/assets-kaykit/characters/addons/kaykit_character_pack_adventures/Characters/gltf/Barbarian.glb', dst: 'assets/models/character_worker.glb' },
  { src: '/tmp/assets-kaykit/characters/addons/kaykit_character_pack_adventures/Characters/gltf/Knight.glb', dst: 'assets/models/character_warrior.glb' },
  { src: '/tmp/assets-kaykit/characters/addons/kaykit_character_pack_adventures/Characters/gltf/Rogue.glb', dst: 'assets/models/character_scout.glb' },
  { src: '/tmp/assets-kaykit/characters/addons/kaykit_character_pack_adventures/Characters/gltf/Mage.glb', dst: 'assets/models/character_elder.glb' },
  { src: '/tmp/assets-kaykit/characters/addons/kaykit_character_pack_adventures/Characters/gltf/Rogue_Hooded.glb', dst: 'assets/models/character_mystic.glb' },

  // Role Props
  { src: '/tmp/assets-kaykit/characters/addons/kaykit_character_pack_adventures/Assets/gltf/axe_1handed.gltf', dst: 'assets/models/prop_tool_axe.glb' },
  { src: '/tmp/assets-kaykit/characters/addons/kaykit_character_pack_adventures/Assets/gltf/sword_1handed.gltf', dst: 'assets/models/prop_sword.glb' },
  { src: '/tmp/assets-kaykit/characters/addons/kaykit_character_pack_adventures/Assets/gltf/shield_round.gltf', dst: 'assets/models/prop_shield.glb' },
  { src: '/tmp/assets-kaykit/characters/addons/kaykit_character_pack_adventures/Assets/gltf/staff.gltf', dst: 'assets/models/prop_priest_staff.glb' },
  { src: '/tmp/assets-kaykit/characters/addons/kaykit_character_pack_adventures/Assets/gltf/spellbook_closed.gltf', dst: 'assets/models/prop_spellbook.glb' },
  { src: '/tmp/assets-kaykit/medieval/addons/kaykit_medieval_hexagon_pack/Assets/gltf/decoration/props/crate_A_small.gltf', dst: 'assets/models/prop_trade_crate.glb' },
  { src: '/tmp/assets-kaykit/dungeon/addons/kaykit_dungeon_remastered/Assets/gltf/barrel_small.gltf.glb', dst: 'assets/models/prop_trade_barrel.glb' },
  { src: '/tmp/assets-kaykit/medieval/addons/kaykit_medieval_hexagon_pack/Assets/gltf/decoration/props/sack.gltf', dst: 'assets/models/prop_forager_sack.glb' }
];

for (const m of models) {
  const dir = path.dirname(m.dst);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (m.src.endsWith('.glb')) {
    console.log(`Copying ${m.src} -> ${m.dst}`);
    fs.copyFileSync(m.src, m.dst);
  } else {
    console.log(`Converting ${m.src} -> ${m.dst}`);
    execSync(`gltf-pipeline -i "${m.src}" -o "${m.dst}" -b`, { stdio: 'inherit' });
  }
}

console.log('All models prepared successfully!');
