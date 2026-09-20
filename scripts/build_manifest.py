import json, os

manifest = {
    "title": "Tiny Gods 3D Visual Production Asset Manifest",
    "version": "1.0.0",
    "last_updated": "2026-09-20",
    "license_policy": "All runtime assets are CC0 1.0 Universal, MIT, or original project creations.",
    "assets": [
        # --- Environment Models ---
        {
            "filename": "assets/models/tree_oak.glb",
            "source": "KayKit - Medieval Hexagon Pack (1.0)",
            "original_asset_title": "tree_single_A",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
            "modifications": "Packed glTF+bin+textures into binary GLB; normalized transforms.",
            "runtime_role": "Deciduous oak tree in forest/plains biomes."
        },
        {
            "filename": "assets/models/tree_pine.glb",
            "source": "KayKit - Medieval Hexagon Pack (1.0)",
            "original_asset_title": "tree_single_B",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
            "modifications": "Packed glTF+bin+textures into binary GLB.",
            "runtime_role": "Pine evergreen tree in mountain and highland forests."
        },
        {
            "filename": "assets/models/trees_cluster.glb",
            "source": "KayKit - Medieval Hexagon Pack (1.0)",
            "original_asset_title": "trees_A_small",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
            "modifications": "Packed glTF+bin+textures into binary GLB.",
            "runtime_role": "Grouped forest grove/copse for dense woodlands."
        },
        {
            "filename": "assets/models/tree_dead.glb",
            "source": "KayKit - Medieval Hexagon Pack (1.0)",
            "original_asset_title": "tree_single_A_cut",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "Charred/scorched tree for wildfire and divine lightning aftermath."
        },
        {
            "filename": "assets/models/rock_small.glb",
            "source": "KayKit - Medieval Hexagon Pack (1.0)",
            "original_asset_title": "rock_single_A",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "Scattered landscape boulder in wilderness and riverbeds."
        },
        {
            "filename": "assets/models/rock_large.glb",
            "source": "KayKit - Medieval Hexagon Pack (1.0)",
            "original_asset_title": "rock_single_B",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "Large stone outcropping in mountain foothills."
        },
        {
            "filename": "assets/models/cliff_formation.glb",
            "source": "KayKit - Medieval Hexagon Pack (1.0)",
            "original_asset_title": "mountain_A",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "Elevated mountain cliff face."
        },
        {
            "filename": "assets/models/sacred_monolith.glb",
            "source": "KayKit - Medieval Hexagon Pack (1.0)",
            "original_asset_title": "resource_stone",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "Sacred standing stone / ancient megalith."
        },
        {
            "filename": "assets/models/shrine_altar.glb",
            "source": "KayKit - Dungeon Remastered (1.0)",
            "original_asset_title": "pillar_decorated",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0",
            "modifications": "Direct GLB export.",
            "runtime_role": "Sacred ritual altar / holy shrine centerpiece."
        },
        {
            "filename": "assets/models/torch_lit.glb",
            "source": "KayKit - Dungeon Remastered (1.0)",
            "original_asset_title": "torch_lit",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0",
            "modifications": "Direct GLB export.",
            "runtime_role": "Sacred eternal flame / village fire braziers."
        },
        {
            "filename": "assets/models/bridge_crossing.glb",
            "source": "KayKit - Medieval Hexagon Pack (1.0)",
            "original_asset_title": "building_bridge_A",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "River bridge crossing."
        },
        {
            "filename": "assets/models/waterplant.glb",
            "source": "KayKit - Medieval Hexagon Pack (1.0)",
            "original_asset_title": "waterplant_A",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "Reeds and riverbank flora."
        },

        # --- Buildings ---
        {
            "filename": "assets/models/dwelling_hut.glb",
            "source": "KayKit - Medieval Hexagon Pack (1.0)",
            "original_asset_title": "building_home_A_green",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "Small settlement home / thatched dwelling."
        },
        {
            "filename": "assets/models/dwelling_large.glb",
            "source": "KayKit - Medieval Hexagon Pack (1.0)",
            "original_asset_title": "building_home_B_green",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "Multi-family dwelling / elder house."
        },
        {
            "filename": "assets/models/gathering_hall.glb",
            "source": "KayKit - Medieval Hexagon Pack (1.0)",
            "original_asset_title": "building_tavern_green",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "Community gathering hall / tavern."
        },
        {
            "filename": "assets/models/temple_shrine.glb",
            "source": "KayKit - Medieval Hexagon Pack (1.0)",
            "original_asset_title": "building_church_green",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "Temple / divine sanctuary built by pious settlements."
        },
        {
            "filename": "assets/models/market.glb",
            "source": "KayKit - Medieval Hexagon Pack (1.0)",
            "original_asset_title": "building_market_green",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "Trade market square in commercial settlements."
        },
        {
            "filename": "assets/models/workshop.glb",
            "source": "KayKit - Medieval Hexagon Pack (1.0)",
            "original_asset_title": "building_blacksmith_green",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "Artisan smithy / construction workshop."
        },
        {
            "filename": "assets/models/farm_windmill.glb",
            "source": "KayKit - Medieval Hexagon Pack (1.0)",
            "original_asset_title": "building_windmill_green",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "Agricultural windmill / granary."
        },
        {
            "filename": "assets/models/defensive_tower.glb",
            "source": "KayKit - Medieval Hexagon Pack (1.0)",
            "original_asset_title": "building_tower_A_green",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "Defensive watchtower."
        },
        {
            "filename": "assets/models/defensive_wall.glb",
            "source": "KayKit - Dungeon Remastered (1.0)",
            "original_asset_title": "wall",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0",
            "modifications": "Direct GLB export.",
            "runtime_role": "Protective settlement perimeter fortification."
        },
        {
            "filename": "assets/models/building_ruin.glb",
            "source": "KayKit - Medieval Hexagon Pack (1.0)",
            "original_asset_title": "building_destroyed",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "Collapsed ruins from past disasters or abandoned settlements."
        },

        # --- Characters ---
        {
            "filename": "assets/models/character_worker.glb",
            "source": "KayKit - Adventurers Character Pack (1.0)",
            "original_asset_title": "Barbarian",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0",
            "modifications": "Direct GLB with rigged skeleton & animations.",
            "runtime_role": "Inhabitant model for builders and manual laborers."
        },
        {
            "filename": "assets/models/character_warrior.glb",
            "source": "KayKit - Adventurers Character Pack (1.0)",
            "original_asset_title": "Knight",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0",
            "modifications": "Direct GLB with rigged skeleton & animations.",
            "runtime_role": "Inhabitant model for guards, protectors, and warriors."
        },
        {
            "filename": "assets/models/character_scout.glb",
            "source": "KayKit - Adventurers Character Pack (1.0)",
            "original_asset_title": "Rogue",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0",
            "modifications": "Direct GLB with rigged skeleton & animations; scaled down for children.",
            "runtime_role": "Inhabitant model for foragers, scouts, farmers, and children."
        },
        {
            "filename": "assets/models/character_elder.glb",
            "source": "KayKit - Adventurers Character Pack (1.0)",
            "original_asset_title": "Mage",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0",
            "modifications": "Direct GLB with rigged skeleton & animations.",
            "runtime_role": "Inhabitant model for elders, priests, and theological thinkers."
        },
        {
            "filename": "assets/models/character_mystic.glb",
            "source": "KayKit - Adventurers Character Pack (1.0)",
            "original_asset_title": "Rogue_Hooded",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0",
            "modifications": "Direct GLB with rigged skeleton & animations.",
            "runtime_role": "Inhabitant model for hermits, prophets, and cult leaders."
        },

        # --- Role Props ---
        {
            "filename": "assets/models/prop_tool_axe.glb",
            "source": "KayKit - Adventurers Character Pack (1.0)",
            "original_asset_title": "axe_1handed",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "Equipped prop for builders and woodcutters."
        },
        {
            "filename": "assets/models/prop_sword.glb",
            "source": "KayKit - Adventurers Character Pack (1.0)",
            "original_asset_title": "sword_1handed",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "Equipped sidearm for warrior characters."
        },
        {
            "filename": "assets/models/prop_shield.glb",
            "source": "KayKit - Adventurers Character Pack (1.0)",
            "original_asset_title": "shield_round",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "Equipped defensive buckler for warriors."
        },
        {
            "filename": "assets/models/prop_priest_staff.glb",
            "source": "KayKit - Adventurers Character Pack (1.0)",
            "original_asset_title": "staff",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "Ceremonial staff carried by religious leaders."
        },
        {
            "filename": "assets/models/prop_spellbook.glb",
            "source": "KayKit - Adventurers Character Pack (1.0)",
            "original_asset_title": "spellbook_closed",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "Sacred theological scripture held by priests."
        },
        {
            "filename": "assets/models/prop_trade_crate.glb",
            "source": "KayKit - Medieval Hexagon Pack (1.0)",
            "original_asset_title": "crate_A_small",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "Goods container transported by trading caravans."
        },
        {
            "filename": "assets/models/prop_trade_barrel.glb",
            "source": "KayKit - Dungeon Remastered (1.0)",
            "original_asset_title": "barrel_small",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0",
            "modifications": "Direct GLB export.",
            "runtime_role": "Food/ale storage in taverns and markets."
        },
        {
            "filename": "assets/models/prop_forager_sack.glb",
            "source": "KayKit - Medieval Hexagon Pack (1.0)",
            "original_asset_title": "sack",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
            "modifications": "Packed glTF+bin into binary GLB.",
            "runtime_role": "Gathering sack carried by foragers and farmers."
        },

        # --- Textures ---
        {
            "filename": "assets/textures/hexagons_medieval.png",
            "source": "KayKit - Medieval Hexagon Pack (1.0)",
            "original_asset_title": "hexagons_medieval.png",
            "creator": "Kay Lousberg (www.kaylousberg.com)",
            "license": "CC0 1.0 Universal",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
            "modifications": "Unmodified texture palette.",
            "runtime_role": "Shared color palette texture for medieval buildings and environment."
        },
        {
            "filename": "assets/textures/terrain_grass.png",
            "source": "Tiny Gods Authoring Pipeline",
            "original_asset_title": "terrain_grass",
            "creator": "Tiny Gods Production Pass",
            "license": "MIT / CC0",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "local-project",
            "modifications": "Procedurally authored seamless organic grass texture.",
            "runtime_role": "Base terrain diffuse texture for plains and fertile lands."
        },
        {
            "filename": "assets/textures/terrain_dirt.png",
            "source": "Tiny Gods Authoring Pipeline",
            "original_asset_title": "terrain_dirt",
            "creator": "Tiny Gods Production Pass",
            "license": "MIT / CC0",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "local-project",
            "modifications": "Procedurally authored sandy loam texture with pebbles.",
            "runtime_role": "Base terrain diffuse texture for paths and settlement ground."
        },
        {
            "filename": "assets/textures/terrain_rock.png",
            "source": "Tiny Gods Authoring Pipeline",
            "original_asset_title": "terrain_rock",
            "creator": "Tiny Gods Production Pass",
            "license": "MIT / CC0",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "local-project",
            "modifications": "Procedurally authored mineral slate rock texture with fissures.",
            "runtime_role": "Base terrain diffuse texture for mountains and cliffs."
        },
        {
            "filename": "assets/textures/terrain_water_norm.png",
            "source": "Tiny Gods Authoring Pipeline",
            "original_asset_title": "terrain_water_norm",
            "creator": "Tiny Gods Production Pass",
            "license": "MIT / CC0",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "local-project",
            "modifications": "Procedurally computed sinusoidal normal map.",
            "runtime_role": "Flowing water surface wave normal perturbation."
        },
        {
            "filename": "assets/textures/terrain_burned.png",
            "source": "Tiny Gods Authoring Pipeline",
            "original_asset_title": "terrain_burned",
            "creator": "Tiny Gods Production Pass",
            "license": "MIT / CC0",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "local-project",
            "modifications": "Procedurally authored charred earth with glowing embers.",
            "runtime_role": "Persistent ground scar for wildfires, lightning strikes, and disaster aftermath."
        },
        {
            "filename": "assets/textures/cloud_shadow.png",
            "source": "Tiny Gods Authoring Pipeline",
            "original_asset_title": "cloud_shadow",
            "creator": "Tiny Gods Production Pass",
            "license": "MIT / CC0",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "local-project",
            "modifications": "Soft Gaussian cumulus opacity mask.",
            "runtime_role": "Projected dynamic cloud shadow map across the diorama surface."
        },

        # --- VFX Sprites ---
        {
            "filename": "assets/vfx/sparkle.png",
            "source": "Tiny Gods Authoring Pipeline",
            "original_asset_title": "sparkle",
            "creator": "Tiny Gods Production Pass",
            "license": "MIT / CC0",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "local-project",
            "modifications": "Radial starburst particle alpha sprite.",
            "runtime_role": "Divine blessing, healing pillars, and miracle particles."
        },
        {
            "filename": "assets/vfx/smoke.png",
            "source": "Tiny Gods Authoring Pipeline",
            "original_asset_title": "smoke",
            "creator": "Tiny Gods Production Pass",
            "license": "MIT / CC0",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "local-project",
            "modifications": "Billowy smoke puff particle alpha sprite.",
            "runtime_role": "Campfire smoke, scorched ground embers, and earth upheaval dust."
        },
        {
            "filename": "assets/vfx/leaf.png",
            "source": "Tiny Gods Authoring Pipeline",
            "original_asset_title": "leaf",
            "creator": "Tiny Gods Production Pass",
            "license": "MIT / CC0",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "local-project",
            "modifications": "Stylized leaf alpha sprite.",
            "runtime_role": "Wind power vortex and seasonal gusts."
        },
        {
            "filename": "assets/vfx/flame.png",
            "source": "Tiny Gods Authoring Pipeline",
            "original_asset_title": "flame",
            "creator": "Tiny Gods Production Pass",
            "license": "MIT / CC0",
            "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "source_url": "local-project",
            "modifications": "Teardrop flame particle sprite.",
            "runtime_role": "Fire power combustion, settlement braziers, and torch illumination."
        },

        # --- Three.js Runtime ---
        {
            "filename": "public/vendor/three/three.module.js",
            "source": "Three.js r186 (https://threejs.org)",
            "original_asset_title": "three.module.js",
            "creator": "Ricardo Cabello (Mr.doob) and Three.js Authors",
            "license": "MIT License",
            "license_url": "https://github.com/mrdoob/three.js/blob/dev/LICENSE",
            "source_url": "https://github.com/mrdoob/three.js",
            "modifications": "Locally vendored modern ESM Three.js runtime.",
            "runtime_role": "Authoritative 3D scene graph, WebGL renderer, materials, and lighting engine."
        },
        {
            "filename": "public/vendor/three/addons/loaders/GLTFLoader.js",
            "source": "Three.js r186 (https://threejs.org)",
            "original_asset_title": "GLTFLoader.js",
            "creator": "Three.js Authors",
            "license": "MIT License",
            "license_url": "https://github.com/mrdoob/three.js/blob/dev/LICENSE",
            "source_url": "https://github.com/mrdoob/three.js",
            "modifications": "Locally vendored glTF/GLB binary parser and scene reconstructor.",
            "runtime_role": "Loads 3D environment, building, and humanoid models."
        }
    ]
}

os.makedirs('docs', exist_ok=True)
with open('docs/ASSET_MANIFEST.json', 'w') as f:
    json.dump(manifest, f, indent=2)

print(f"docs/ASSET_MANIFEST.json generated with {len(manifest['assets'])} tracked assets.")
