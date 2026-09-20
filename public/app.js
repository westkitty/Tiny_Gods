'use strict';

import * as THREE from './vendor/three/three.module.js';
import { GLTFLoader } from './vendor/three/addons/loaders/GLTFLoader.js';

// Authoritative World Dimensions & Spatial Constants
const WORLD_WIDTH = 1200;
const WORLD_HEIGHT = 900;
const WORLD_SCALE = 0.1; // 1 sim unit = 0.1 Three.js units (diorama span: 120 x 90 units)
const canvas = document.getElementById('worldCanvas');
const tooltip = document.getElementById('cursor-tooltip');
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

let worldData = null;
let selectedPower = 'observe';
let selectedCreatureId = null;
let selectedCreatureData = null;
let powerDefinitions = [];
let reducedMotion = reducedMotionQuery.matches;
let cameraOffset = { x: 0, y: 0 };
let cameraZoom = 1;
let observerMode = false;
let observerTargetOffset = null;
let lastObserverFocusAt = 0;
let animationClock = 0;
let lastFrameDraw = 0;
let audioCtx = null;
let userHasInteracted = false;
let flashUntil = 0;
let lightningBolt = null;
const particles = [];
const displayPositions = new Map();
const activePointers = new Map();
let gesture = null;

// Power audio frequencies and profiles
const POWER_AUDIO = {
  observe: [420, 0.12, 'sine', 0.035],
  wind: [620, 0.24, 'triangle', 0.05],
  rain: [360, 0.32, 'triangle', 0.04],
  fire: [780, 0.18, 'sawtooth', 0.045],
  fertility: [300, 0.35, 'sine', 0.05],
  dreams: [510, 0.42, 'sine', 0.04],
  omens: [180, 0.55, 'triangle', 0.045],
  lightning: [1100, 0.08, 'square', 0.055],
  healing: [330, 0.34, 'sine', 0.05],
  mutation: [710, 0.26, 'triangle', 0.045],
  earth_movement: [95, 0.45, 'sawtooth', 0.045]
};

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
function hashInt(value) { let h = 2166136261; for (const ch of String(value)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function seeded01(seed) { const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }

// ============================================================================
// AUTHORITATIVE WORLD COORDINATE TRANSFORM LAYER
// ============================================================================
// Maps simulation space (0..1200 x 0..900) onto Three.js X/Z plane centered at 0, 0
// Sim X -> Three.js X: [-60, +60]
// Sim Y -> Three.js Z: [-45, +45]
// Sim Terrain Elevation -> Three.js Y: [-1.8, +8.0]
function simToWorld(x, y) {
  const wx = (x - WORLD_WIDTH * 0.5) * WORLD_SCALE;
  const wz = (y - WORLD_HEIGHT * 0.5) * WORLD_SCALE;
  const wy = getTerrainElevation(x, y);
  return { x: wx, y: wy, z: wz };
}

function worldToSim(wx, wz) {
  const x = wx / WORLD_SCALE + WORLD_WIDTH * 0.5;
  const y = wz / WORLD_SCALE + WORLD_HEIGHT * 0.5;
  return { x: clamp(x, 0, WORLD_WIDTH), y: clamp(y, 0, WORLD_HEIGHT) };
}

// Elevation function based on cell terrain type + organic smoothing
function getTerrainCell(simX, simY) {
  if (!worldData?.terrain_sample) return 'plains';
  const cx = Math.floor(simX / 20) - 30;
  const cy = Math.floor(simY / 20) - 20;
  return worldData.terrain_sample[`${cx},${cy}`] ||
         worldData.terrain_sample[`${Math.floor(simX / 20)},${Math.floor(simY / 20)}`] ||
         'plains';
}

function getTerrainElevation(simX, simY) {
  const cellType = getTerrainCell(simX, simY);
  let baseH = 0.2;
  if (cellType === 'mountain') baseH = 4.8;
  else if (cellType === 'forest') baseH = 1.1;
  else if (cellType === 'river') baseH = -1.2;
  else if (cellType === 'burned' || cellType === 'scorched') baseH = -0.1;
  else baseH = 0.3; // plains

  // Subtle organic hills
  const wave = Math.sin(simX * 0.02) * Math.cos(simY * 0.02) * 0.35 +
               Math.sin(simX * 0.05 + simY * 0.04) * 0.15;
  if (cellType === 'mountain') {
    return baseH + Math.abs(wave) * 2.2;
  } else if (cellType === 'river') {
    return baseH;
  }
  return baseH + wave;
}

// ============================================================================
// THREE.JS 3D SCENE & ENGINE ARCHITECTURE
// ============================================================================
let scene, camera, renderer, gltfLoader;
let sunLight, hemiLight, nightLight;
let terrainMesh, waterMesh, cloudShadowMesh;
let entityGroup, propGroup, vfxGroup, settlementGroup;
const loadedModels = new Map();
const creatureNodes = new Map();
const settlementNodes = new Map();
let sceneReady = false;

// 3D Camera Controls State
let cameraTarget = new THREE.Vector3(0, 0, 0);
let cameraPosition = new THREE.Vector3(0, 52, 48); // God-game elevated 3/4 view
let targetZoom = 1.0;
let isPanning = false;
let panStart = { x: 0, y: 0 };
let panStartTarget = new THREE.Vector3();

// Models inventory to load locally
const MODEL_MANIFEST = [
  // Environment
  { id: 'tree_oak', url: '/assets/models/tree_oak.glb' },
  { id: 'tree_pine', url: '/assets/models/tree_pine.glb' },
  { id: 'trees_cluster', url: '/assets/models/trees_cluster.glb' },
  { id: 'tree_dead', url: '/assets/models/tree_dead.glb' },
  { id: 'rock_small', url: '/assets/models/rock_small.glb' },
  { id: 'rock_large', url: '/assets/models/rock_large.glb' },
  { id: 'cliff_formation', url: '/assets/models/cliff_formation.glb' },
  { id: 'sacred_monolith', url: '/assets/models/sacred_monolith.glb' },
  { id: 'shrine_altar', url: '/assets/models/shrine_altar.glb' },
  { id: 'torch_lit', url: '/assets/models/torch_lit.glb' },
  { id: 'bridge_crossing', url: '/assets/models/bridge_crossing.glb' },
  { id: 'waterplant', url: '/assets/models/waterplant.glb' },
  // Buildings
  { id: 'dwelling_hut', url: '/assets/models/dwelling_hut.glb' },
  { id: 'dwelling_large', url: '/assets/models/dwelling_large.glb' },
  { id: 'gathering_hall', url: '/assets/models/gathering_hall.glb' },
  { id: 'temple_shrine', url: '/assets/models/temple_shrine.glb' },
  { id: 'market', url: '/assets/models/market.glb' },
  { id: 'workshop', url: '/assets/models/workshop.glb' },
  { id: 'farm_windmill', url: '/assets/models/farm_windmill.glb' },
  { id: 'defensive_tower', url: '/assets/models/defensive_tower.glb' },
  { id: 'defensive_wall', url: '/assets/models/defensive_wall.glb' },
  { id: 'building_ruin', url: '/assets/models/building_ruin.glb' },
  // Characters
  { id: 'character_worker', url: '/assets/models/character_worker.glb' },
  { id: 'character_warrior', url: '/assets/models/character_warrior.glb' },
  { id: 'character_scout', url: '/assets/models/character_scout.glb' },
  { id: 'character_elder', url: '/assets/models/character_elder.glb' },
  { id: 'character_mystic', url: '/assets/models/character_mystic.glb' },
  // Role Props
  { id: 'prop_tool_axe', url: '/assets/models/prop_tool_axe.glb' },
  { id: 'prop_sword', url: '/assets/models/prop_sword.glb' },
  { id: 'prop_shield', url: '/assets/models/prop_shield.glb' },
  { id: 'prop_priest_staff', url: '/assets/models/prop_priest_staff.glb' },
  { id: 'prop_spellbook', url: '/assets/models/prop_spellbook.glb' },
  { id: 'prop_trade_crate', url: '/assets/models/prop_trade_crate.glb' },
  { id: 'prop_trade_barrel', url: '/assets/models/prop_trade_barrel.glb' },
  { id: 'prop_forager_sack', url: '/assets/models/prop_forager_sack.glb' }
];

// Initialize 3D Engine
function initThreeScene() {
  const container = document.getElementById('world-canvas-container');
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e111a);
  scene.fog = new THREE.FogExp2(0x0e111a, 0.0055);

  camera = new THREE.PerspectiveCamera(38, width / height, 1, 1000);
  updateCameraTransform();

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  window.__scene = scene;
  window.__camera = camera;
  window.__renderer = renderer;

  // Hierarchical groups
  entityGroup = new THREE.Group();
  propGroup = new THREE.Group();
  settlementGroup = new THREE.Group();
  vfxGroup = new THREE.Group();
  scene.add(propGroup);
  scene.add(settlementGroup);
  scene.add(entityGroup);
  scene.add(vfxGroup);

  // Lighting
  hemiLight = new THREE.HemisphereLight(0xfffaed, 0x3d352c, 0.95);
  scene.add(hemiLight);

  sunLight = new THREE.DirectionalLight(0xfffaea, 2.2);
  sunLight.position.set(45, 80, 40);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 200;
  const d = 65;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0004;
  scene.add(sunLight);

  // Soft secondary fill
  const fillLight = new THREE.DirectionalLight(0xaac4e8, 0.45);
  fillLight.position.set(-40, 40, -30);
  scene.add(fillLight);

  gltfLoader = new GLTFLoader();
  loadAllModels();
}

function updateCameraTransform() {
  const distance = 78 / cameraZoom;
  const pitch = 0.95; // ~54.4 degree elevated god-view
  const cx = cameraTarget.x + cameraOffset.x * 0.05;
  const cz = cameraTarget.z + cameraOffset.y * 0.05 + Math.cos(pitch) * distance;
  const cy = cameraTarget.y + Math.sin(pitch) * distance;
  camera.position.set(cx, cy, cz);
  camera.lookAt(cameraTarget.x + cameraOffset.x * 0.05, cameraTarget.y, cameraTarget.z + cameraOffset.y * 0.05);
}

// Load all models locally into memory cache in parallel
async function loadAllModels() {
  let loadedCount = 0;
  const total = MODEL_MANIFEST.length;
  await Promise.all(MODEL_MANIFEST.map(async item => {
    try {
      const gltf = await new Promise((resolve, reject) => {
        gltfLoader.load(item.url, resolve, undefined, reject);
      });
      gltf.scene.traverse(node => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          if (node.material) {
            node.material.roughness = 0.75;
            node.material.metalness = 0.1;
          }
        }
      });
      loadedModels.set(item.id, gltf.scene);
      loadedCount++;
    } catch (err) {
      console.warn(`Could not load model ${item.id}:`, err);
    }
  }));
  console.log(`Loaded ${loadedCount}/${total} 3D models locally.`);
  sceneReady = true;
  if (worldData) {
    rebuild3DWorld();
  }
}

// Clone a cached model template safely
function createModelInstance(modelId) {
  const template = loadedModels.get(modelId);
  if (!template) return new THREE.Group();
  return template.clone(true);
}

// ============================================================================
// 3D TERRAIN & WATER SYSTEM
// ============================================================================
function rebuildTerrain3D() {
  if (terrainMesh) scene.remove(terrainMesh);
  if (waterMesh) scene.remove(waterMesh);

  const cols = 120;
  const rows = 90;
  const geo = new THREE.PlaneGeometry(WORLD_WIDTH * WORLD_SCALE, WORLD_HEIGHT * WORLD_SCALE, cols, rows);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = [];
  const color = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const wx = pos.getX(i);
    const wz = pos.getZ(i);
    const sim = worldToSim(wx, wz);
    const h = getTerrainElevation(sim.x, sim.y);
    pos.setY(i, h);

    const cell = getTerrainCell(sim.x, sim.y);
    if (cell === 'mountain') {
      if (h > 5.5) color.setHex(0xb2b8c2); // snow/high granite
      else color.setHex(0x727680); // mountain rock
    } else if (cell === 'forest') {
      color.setHex(0x35632d); // deep evergreen/oak moss
    } else if (cell === 'river') {
      color.setHex(0x8f7d61); // wet riverbank sand
    } else if (cell === 'burned' || cell === 'scorched') {
      color.setHex(0x241d1a); // charred ash
    } else {
      // plains
      const grad = Math.sin(sim.x * 0.05) * 0.05;
      color.setRGB(0.32 + grad, 0.58 + grad, 0.25); // lush diorama turf
    }
    colors.push(color.r, color.g, color.b);
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const textureLoader = new THREE.TextureLoader();
  const grassTex = textureLoader.load('/assets/textures/terrain_grass.png');
  grassTex.wrapS = THREE.RepeatWrapping;
  grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(16, 12);

  const terrainMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.05
  });

  terrainMesh = new THREE.Mesh(geo, terrainMat);
  terrainMesh.receiveShadow = true;
  terrainMesh.userData = { type: 'ground' };
  scene.add(terrainMesh);

  // 3D Water Surface Mesh
  const waterGeo = new THREE.PlaneGeometry(WORLD_WIDTH * WORLD_SCALE, WORLD_HEIGHT * WORLD_SCALE, 30, 24);
  waterGeo.rotateX(-Math.PI / 2);
  const waterNormTex = textureLoader.load('/assets/textures/terrain_water_norm.png');
  waterNormTex.wrapS = THREE.RepeatWrapping;
  waterNormTex.wrapT = THREE.RepeatWrapping;
  waterNormTex.repeat.set(8, 6);

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x2e829e,
    roughness: 0.18,
    metalness: 0.15,
    normalMap: waterNormTex,
    normalScale: new THREE.Vector2(0.4, 0.4),
    transparent: true,
    opacity: 0.82
  });

  waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.y = -0.45; // slightly above riverbed
  waterMesh.receiveShadow = true;
  scene.add(waterMesh);
}

// Populate environment vegetation, rocks, and sacred sites
function rebuildEnvironment3D() {
  propGroup.clear();
  if (!worldData?.terrain_sample) return;

  const rng = (seed) => seeded01(seed);

  // Iterate over terrain samples and place matching 3D assets
  for (const [key, type] of Object.entries(worldData.terrain_sample)) {
    const parts = key.split(',').map(Number);
    if (!Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) continue;
    const simX = (parts[0] + 30) * 20 + 10;
    const simY = (parts[1] + 20) * 20 + 10;
    const wp = simToWorld(simX, simY);
    const seed = hashInt(key);

    if (type === 'forest') {
      const treeCount = Math.floor(1 + rng(seed) * 3);
      for (let i = 0; i < treeCount; i++) {
        const ox = (rng(seed + i * 7) - 0.5) * 16;
        const oy = (rng(seed + i * 13) - 0.5) * 16;
        const tp = simToWorld(simX + ox, simY + oy);
        const modelId = rng(seed + i) > 0.4 ? 'tree_oak' : 'tree_pine';
        const tree = createModelInstance(modelId);
        tree.position.set(tp.x, tp.y, tp.z);
        const s = 1.6 + rng(seed + i * 21) * 0.8;
        tree.scale.set(s, s, s);
        tree.rotation.y = rng(seed + i * 3) * Math.PI * 2;
        tree.userData = { type: 'tree', initialRotY: tree.rotation.y };
        propGroup.add(tree);
      }
    } else if (type === 'mountain') {
      const rockCount = Math.floor(1 + rng(seed) * 2);
      for (let i = 0; i < rockCount; i++) {
        const ox = (rng(seed + i * 5) - 0.5) * 14;
        const oy = (rng(seed + i * 11) - 0.5) * 14;
        const rp = simToWorld(simX + ox, simY + oy);
        const roll = rng(seed + i);
        let modelId = 'rock_small';
        let s = 1.0;
        if (roll > 0.72) {
          modelId = 'cliff_formation';
          s = 0.75 + rng(seed + i) * 0.35;
        } else if (roll > 0.35) {
          modelId = 'rock_large';
          s = 1.0 + rng(seed + i) * 0.45;
        } else {
          modelId = 'rock_small';
          s = 1.0 + rng(seed + i) * 0.4;
        }
        const rock = createModelInstance(modelId);
        rock.position.set(rp.x, rp.y, rp.z);
        rock.scale.set(s, s, s);
        rock.rotation.y = rng(seed + i * 9) * Math.PI * 2;
        propGroup.add(rock);
      }
    } else if (type === 'river') {
      if (rng(seed) < 0.25) {
        const plant = createModelInstance('waterplant');
        plant.position.set(wp.x, -0.4, wp.z);
        plant.scale.set(1.5, 1.5, 1.5);
        propGroup.add(plant);
      }
    } else if (type === 'burned' || type === 'scorched') {
      const deadTree = createModelInstance('tree_dead');
      deadTree.position.set(wp.x, wp.y, wp.z);
      deadTree.scale.set(1.7, 1.7, 1.7);
      deadTree.rotation.y = rng(seed) * Math.PI * 2;
      propGroup.add(deadTree);
    } else {
      // Plains occasional landscape boulder or solitary oak
      if (rng(seed) < 0.08) {
        const tree = createModelInstance('tree_oak');
        tree.position.set(wp.x, wp.y, wp.z);
        tree.scale.set(1.5, 1.5, 1.5);
        tree.rotation.y = rng(seed) * Math.PI * 2;
        propGroup.add(tree);
      } else if (rng(seed) < 0.12) {
        const rock = createModelInstance('rock_small');
        rock.position.set(wp.x, wp.y, wp.z);
        rock.scale.set(1.3, 1.3, 1.3);
        propGroup.add(rock);
      }
    }
  }

  // Sacred Sites & Monoliths
  const chronicle = worldData.chronicle || [];
  const sacredEvents = chronicle.filter(e => /sacred|ritual|prayer|temple|shrine/i.test(e.description || ''));
  if (sacredEvents.length > 0 || (worldData.factions && Object.keys(worldData.factions).length > 0)) {
    // Place central sacred monolith
    const pMonolith = simToWorld(620, 430);
    const monolith = createModelInstance('sacred_monolith');
    monolith.position.set(pMonolith.x, pMonolith.y, pMonolith.z);
    monolith.scale.set(2.4, 2.4, 2.4);
    propGroup.add(monolith);

    const altar = createModelInstance('shrine_altar');
    altar.position.set(pMonolith.x + 2.2, pMonolith.y, pMonolith.z + 1.2);
    altar.scale.set(1.4, 1.4, 1.4);
    propGroup.add(altar);

    const torch = createModelInstance('torch_lit');
    torch.position.set(pMonolith.x - 2.0, pMonolith.y, pMonolith.z + 1.2);
    torch.scale.set(1.4, 1.4, 1.4);
    propGroup.add(torch);
  }
}

// ============================================================================
// 3D PHYSICAL SETTLEMENTS
// ============================================================================
function updateSettlements3D() {
  settlementGroup.clear();
  if (!worldData?.settlements) return;

  for (const [sid, s] of Object.entries(worldData.settlements)) {
    const sGroup = new THREE.Group();
    const wp = simToWorld(s.x, s.y);
    sGroup.position.set(wp.x, wp.y, wp.z);
    sGroup.userData = { type: 'settlement', id: sid, name: s.name };

    const pop = s.population || 1;
    const structures = s.structures || [];
    const hasTemple = structures.some(st => /temple|shrine|church/i.test(String(st))) || s.religion_leaning;
    const hasMarket = structures.some(st => /market|trade/i.test(String(st))) || s.specialization === 'trading';
    const hasWorkshop = structures.some(st => /blacksmith|workshop/i.test(String(st))) || pop > 12;
    const hasDefense = structures.some(st => /tower|wall|fort/i.test(String(st))) || s.specialization === 'defensive';
    const isRuin = s.lifecycle_stage === 'abandoned' || pop === 0;

    if (isRuin) {
      const ruin = createModelInstance('building_ruin');
      ruin.scale.set(2.0, 2.0, 2.0);
      sGroup.add(ruin);
      settlementGroup.add(sGroup);
      continue;
    }

    // Central Gathering Hall
    const hall = createModelInstance('gathering_hall');
    hall.scale.set(1.8, 1.8, 1.8);
    sGroup.add(hall);

    // Temple / Shrine
    if (hasTemple) {
      const temple = createModelInstance('temple_shrine');
      temple.position.set(4.5, 0, -2.5);
      temple.scale.set(1.7, 1.7, 1.7);
      temple.rotation.y = -Math.PI / 4;
      sGroup.add(temple);

      // Sacred flame torch
      const torch = createModelInstance('torch_lit');
      torch.position.set(4.5, 0, -0.8);
      torch.scale.set(1.2, 1.2, 1.2);
      sGroup.add(torch);
    }

    // Market square
    if (hasMarket) {
      const market = createModelInstance('market');
      market.position.set(-4.5, 0, -2.0);
      market.scale.set(1.7, 1.7, 1.7);
      market.rotation.y = Math.PI / 4;
      sGroup.add(market);

      const crate = createModelInstance('prop_trade_crate');
      crate.position.set(-3.2, 0, -1.0);
      crate.scale.set(1.3, 1.3, 1.3);
      sGroup.add(crate);
    }

    // Workshop
    if (hasWorkshop) {
      const workshop = createModelInstance('workshop');
      workshop.position.set(-4.2, 0, 3.5);
      workshop.scale.set(1.6, 1.6, 1.6);
      sGroup.add(workshop);
    }

    // Windmill / Agricultural farm
    if (s.specialization === 'agricultural' || pop > 16) {
      const mill = createModelInstance('farm_windmill');
      mill.position.set(6.0, 0, 4.0);
      mill.scale.set(1.8, 1.8, 1.8);
      sGroup.add(mill);
    }

    // Defense Tower & Wall
    if (hasDefense) {
      const tower = createModelInstance('defensive_tower');
      tower.position.set(5.5, 0, -5.5);
      tower.scale.set(1.8, 1.8, 1.8);
      sGroup.add(tower);

      const wall = createModelInstance('defensive_wall');
      wall.position.set(3.2, 0, -5.5);
      wall.scale.set(1.6, 1.6, 1.6);
      sGroup.add(wall);
    }

    // Dwellings (scale with population)
    const homeCount = clamp(Math.ceil(pop / 3.5), 1, 6);
    const angles = [0.8, 1.8, 2.8, 3.8, 4.8, 5.8];
    for (let i = 0; i < homeCount; i++) {
      const a = angles[i % angles.length];
      const dist = 3.8 + (i % 2) * 1.8;
      const hx = Math.cos(a) * dist;
      const hz = Math.sin(a) * dist;
      const modelId = i % 2 === 0 ? 'dwelling_hut' : 'dwelling_large';
      const home = createModelInstance(modelId);
      home.position.set(hx, 0, hz);
      home.scale.set(1.5, 1.5, 1.5);
      home.rotation.y = a + Math.PI / 2;
      sGroup.add(home);
    }

    settlementGroup.add(sGroup);
  }
}

// ============================================================================
// 3D MINIATURE INHABITANTS (CREATURES)
// ============================================================================
function updateCreatures3D(delta) {
  if (!worldData?.creatures) return;

  const currentIds = new Set();
  const time = performance.now() * 0.001;

  for (const [cid, c] of Object.entries(worldData.creatures)) {
    if (!c.alive) continue;
    currentIds.add(cid);

    let node = creatureNodes.get(cid);
    if (!node) {
      node = createCreatureNode(cid, c);
      creatureNodes.set(cid, node);
      entityGroup.add(node);
    }

    // Position interpolation
    const wp = simToWorld(c.x, c.y);
    const curX = node.position.x;
    const curZ = node.position.z;
    const lerpSpeed = reducedMotion ? 1.0 : clamp(delta * 8, 0.08, 0.35);

    const nextX = THREE.MathUtils.lerp(curX, wp.x, lerpSpeed);
    const nextZ = THREE.MathUtils.lerp(curZ, wp.z, lerpSpeed);
    const nextY = getTerrainElevation(c.x, c.y);

    const dx = nextX - curX;
    const dz = nextZ - curZ;
    const isMoving = Math.hypot(dx, dz) > 0.005;

    node.position.set(nextX, nextY, nextZ);

    // Face movement direction
    if (isMoving) {
      const targetAngle = Math.atan2(dx, dz);
      node.rotation.y = THREE.MathUtils.lerp(node.rotation.y, targetAngle, 0.2);
    }

    // Procedural walk bounce and idle animation
    if (!reducedMotion) {
      if (isMoving) {
        node.position.y += Math.abs(Math.sin(time * 12 + Number(cid))) * 0.22;
        node.rotation.z = Math.sin(time * 10 + Number(cid)) * 0.08; // stride sway
      } else {
        node.position.y += Math.sin(time * 2.5 + Number(cid)) * 0.04; // breathing
        node.rotation.z = 0;
      }
    }

    // Highlight selected creature
    const isSelected = Number(cid) === selectedCreatureId;
    if (node._selectRing) {
      node._selectRing.visible = isSelected;
      if (isSelected) {
        node._selectRing.rotation.z += delta * 2.5;
      }
    }
  }

  // Remove dead or vanished creatures
  for (const [cid, node] of creatureNodes.entries()) {
    if (!currentIds.has(cid)) {
      entityGroup.remove(node);
      creatureNodes.delete(cid);
    }
  }
}

function createCreatureNode(cid, c) {
  const group = new THREE.Group();
  const occ = (c.occupation || '').toLowerCase();
  const age = c.age ?? 25;
  const isChild = age < 12;
  const isElder = age > 55;

  let modelId = 'character_scout';
  if (isChild) {
    modelId = 'character_scout';
  } else if (isElder || occ === 'priest' || occ === 'theologian') {
    modelId = occ === 'priest' ? 'character_elder' : 'character_mystic';
  } else if (occ === 'warrior' || occ === 'guard') {
    modelId = 'character_warrior';
  } else if (occ === 'builder' || occ === 'artisan' || occ === 'blacksmith') {
    modelId = 'character_worker';
  }

  const character = createModelInstance(modelId);
  const scale = isChild ? 0.75 : 1.35;
  character.scale.set(scale, scale, scale);
  group.add(character);

  // Attach role equipment
  let propId = null;
  if (occ === 'warrior') propId = 'prop_sword';
  else if (occ === 'builder') propId = 'prop_tool_axe';
  else if (occ === 'priest' || occ === 'theologian') propId = 'prop_priest_staff';
  else if (occ === 'trader') propId = 'prop_trade_crate';
  else if (occ === 'forager' || occ === 'farmer') propId = 'prop_forager_sack';

  if (propId && !isChild) {
    const prop = createModelInstance(propId);
    prop.scale.set(1.1, 1.1, 1.1);
    prop.position.set(0.4, 0.6, 0.2);
    group.add(prop);
  }

  // Selection halo ring beneath feet
  const ringGeo = new THREE.RingGeometry(0.7, 0.9, 24);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xf5d996,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.position.y = 0.05;
  ringMesh.visible = false;
  group.add(ringMesh);
  group._selectRing = ringMesh;

  // Interaction metadata for raycasting
  group.userData = { type: 'creature', id: Number(cid), creature: c };
  const wp = simToWorld(c.x, c.y);
  group.position.set(wp.x, wp.y, wp.z);

  return group;
}

// ============================================================================
// 3D DIVINE POWERS & WEATHER VFX
// ============================================================================
const vfxObjects = [];

function spawn3DDivinePower(kind, x, y, radius = 80) {
  const wp = simToWorld(x, y);

  if (kind === 'lightning') {
    // 3D Branching Lightning Bolt
    const boltPoints = [];
    let cur = new THREE.Vector3(wp.x + (Math.random() - 0.5) * 4, 45, wp.z + (Math.random() - 0.5) * 4);
    boltPoints.push(cur.clone());
    const steps = 14;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const target = new THREE.Vector3(
        THREE.MathUtils.lerp(cur.x, wp.x, t) + (Math.random() - 0.5) * (1 - t) * 6,
        45 * (1 - t) + wp.y * t,
        THREE.MathUtils.lerp(cur.z, wp.z, t) + (Math.random() - 0.5) * (1 - t) * 6
      );
      boltPoints.push(target);
    }
    boltPoints[boltPoints.length - 1] = new THREE.Vector3(wp.x, wp.y, wp.z);

    const curve = new THREE.CatmullRomCurve3(boltPoints);
    const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.35, 6, false);
    const boltMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const boltMesh = new THREE.Mesh(tubeGeo, boltMat);
    vfxGroup.add(boltMesh);

    // Blinding illumination flash
    flashUntil = performance.now() + (reducedMotion ? 60 : 180);
    sunLight.intensity = 7.5;
    hemiLight.intensity = 4.0;

    vfxObjects.push({
      mesh: boltMesh,
      life: 1.6,
      update: (dt, item) => {
        item.life -= dt;
        boltMat.color.setHex(item.life > 0.8 ? 0xffffff : 0x77ddff);
        if (item.life <= 0) {
          vfxGroup.remove(boltMesh);
          tubeGeo.dispose();
          boltMat.dispose();
          sunLight.intensity = 2.2;
          hemiLight.intensity = 0.95;
          return false;
        }
        return true;
      }
    });

  } else if (kind === 'rain') {
    // 3D Rain Column
    const count = reducedMotion ? 40 : 180;
    const rainGeo = new THREE.BufferGeometry();
    const positions = [];
    for (let i = 0; i < count; i++) {
      positions.push(
        wp.x + (Math.random() - 0.5) * (radius * WORLD_SCALE * 1.8),
        wp.y + Math.random() * 24,
        wp.z + (Math.random() - 0.5) * (radius * WORLD_SCALE * 1.8)
      );
    }
    rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x98c5e8,
      size: 0.35,
      transparent: true,
      opacity: 0.8
    });
    const rainPoints = new THREE.Points(rainGeo, rainMat);
    vfxGroup.add(rainPoints);

    vfxObjects.push({
      mesh: rainPoints,
      life: 3.2,
      update: (dt, item) => {
        item.life -= dt;
        const posAttr = rainGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
          let py = posAttr.getY(i) - dt * 38;
          if (py < wp.y) py = wp.y + 24;
          posAttr.setY(i, py);
        }
        posAttr.needsUpdate = true;
        if (item.life <= 0) {
          vfxGroup.remove(rainPoints);
          rainGeo.dispose();
          rainMat.dispose();
          return false;
        }
        return true;
      }
    });

  } else if (kind === 'fire') {
    // 3D Fire Plume & Light
    const fireLight = new THREE.PointLight(0xff7722, 4.0, 18);
    fireLight.position.set(wp.x, wp.y + 1.5, wp.z);
    vfxGroup.add(fireLight);

    const count = 30;
    const flameGeo = new THREE.BufferGeometry();
    const positions = [];
    for (let i = 0; i < count; i++) {
      positions.push(
        wp.x + (Math.random() - 0.5) * 3,
        wp.y + Math.random() * 4,
        wp.z + (Math.random() - 0.5) * 3
      );
    }
    flameGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const flameMat = new THREE.PointsMaterial({
      color: 0xff5511,
      size: 0.8,
      transparent: true,
      opacity: 0.9
    });
    const flamePoints = new THREE.Points(flameGeo, flameMat);
    vfxGroup.add(flamePoints);

    vfxObjects.push({
      mesh: flamePoints,
      life: 2.5,
      update: (dt, item) => {
        item.life -= dt;
        fireLight.intensity = (item.life / 2.5) * (3.5 + Math.random() * 1.5);
        const posAttr = flameGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
          let py = posAttr.getY(i) + dt * 4;
          if (py > wp.y + 6) py = wp.y;
          posAttr.setY(i, py);
        }
        posAttr.needsUpdate = true;
        if (item.life <= 0) {
          vfxGroup.remove(flamePoints);
          vfxGroup.remove(fireLight);
          flameGeo.dispose();
          flameMat.dispose();
          return false;
        }
        return true;
      }
    });

  } else if (kind === 'healing') {
    // Celestial Light Pillar
    const cylGeo = new THREE.CylinderGeometry(2.5, 3.5, 36, 24, 1, true);
    cylGeo.translate(0, 18, 0);
    const cylMat = new THREE.MeshBasicMaterial({
      color: 0x99ffd0,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const cylinder = new THREE.Mesh(cylGeo, cylMat);
    cylinder.position.set(wp.x, wp.y, wp.z);
    vfxGroup.add(cylinder);

    vfxObjects.push({
      mesh: cylinder,
      life: 2.2,
      update: (dt, item) => {
        item.life -= dt;
        cylinder.rotation.y += dt * 1.5;
        cylMat.opacity = (item.life / 2.2) * 0.45;
        if (item.life <= 0) {
          vfxGroup.remove(cylinder);
          cylGeo.dispose();
          cylMat.dispose();
          return false;
        }
        return true;
      }
    });

  } else if (kind === 'wind') {
    // Wind gusts bend trees nearby and trigger swirling leaf particles
    propGroup.traverse(node => {
      if (node.userData?.type === 'tree') {
        const d = Math.hypot(node.position.x - wp.x, node.position.z - wp.z);
        if (d < radius * WORLD_SCALE * 1.5) {
          node.rotation.x = 0.22 * (1 - d / (radius * WORLD_SCALE * 1.5));
          setTimeout(() => { if (node) node.rotation.x = 0; }, 1800);
        }
      }
    });
  }
}

function updateVFX(delta) {
  for (let i = vfxObjects.length - 1; i >= 0; i--) {
    const item = vfxObjects[i];
    if (!item.update(delta, item)) {
      vfxObjects.splice(i, 1);
    }
  }

  // Water flow animation
  if (waterMesh?.material?.normalMap) {
    waterMesh.material.normalMap.offset.x = (animationClock * 0.00008) % 1;
    waterMesh.material.normalMap.offset.y = (animationClock * 0.00005) % 1;
  }

  // Gentle wind sway on all trees
  const time = performance.now() * 0.001;
  propGroup.traverse(node => {
    if (node.userData?.type === 'tree') {
      const initY = node.userData.initialRotY || 0;
      node.rotation.y = initY + Math.sin(time * 1.5 + node.position.x) * 0.04;
    }
  });
}

function rebuild3DWorld() {
  if (worldData) {
    rebuildTerrain3D();
  }
  if (!sceneReady || !worldData) return;
  console.log('rebuilding 3D environment & settlements...');
  rebuildEnvironment3D();
  updateSettlements3D();
}

// ============================================================================
// INSPECTION & TARGETING RAYCASTING
// ============================================================================
const raycaster = new THREE.Raycaster();
const mouseVec = new THREE.Vector2();

function getCanvasRelativeCoords(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
    ndcX: ((e.clientX - rect.left) / rect.width) * 2 - 1,
    ndcY: -(((e.clientY - rect.top) / rect.height) * 2 - 1)
  };
}

function raycastScene(ndcX, ndcY) {
  raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera);

  // Check creatures first
  const creatureHits = raycaster.intersectObjects(entityGroup.children, true);
  if (creatureHits.length > 0) {
    let root = creatureHits[0].object;
    while (root.parent && root.parent !== entityGroup) {
      root = root.parent;
    }
    if (root.userData?.type === 'creature') {
      return { type: 'creature', id: root.userData.id, data: root.userData.creature };
    }
  }

  // Check settlements
  const settleHits = raycaster.intersectObjects(settlementGroup.children, true);
  if (settleHits.length > 0) {
    let root = settleHits[0].object;
    while (root.parent && root.parent !== settlementGroup) {
      root = root.parent;
    }
    if (root.userData?.type === 'settlement') {
      return { type: 'settlement', id: root.userData.id, name: root.userData.name };
    }
  }

  // Check terrain
  if (terrainMesh) {
    const groundHits = raycaster.intersectObject(terrainMesh);
    if (groundHits.length > 0) {
      const pt = groundHits[0].point;
      const sim = worldToSim(pt.x, pt.z);
      return { type: 'ground', simX: sim.x, simY: sim.y, point: pt };
    }
  }

  return null;
}

// ============================================================================
// COMPATIBILITY & REGRESSION PASS-THROUGH
// ============================================================================
function worldToScreen(wx, wy) {
  const p = simToWorld(wx, wy);
  const v = new THREE.Vector3(p.x, p.y, p.z).project(camera);
  const w = canvas.width || window.innerWidth;
  const h = canvas.height || window.innerHeight;
  return {
    x: (v.x * 0.5 + 0.5) * w,
    y: (-(v.y * 0.5) + 0.5) * h
  };
}

function screenToWorld(sx, sy) {
  const w = canvas.width || window.innerWidth;
  const h = canvas.height || window.innerHeight;
  const ndcX = (sx / w) * 2 - 1;
  const ndcY = -(sy / h) * 2 + 1;
  const hit = raycastScene(ndcX, ndcY);
  if (hit?.type === 'ground') {
    return { x: hit.simX, y: hit.simY };
  }
  return { x: WORLD_WIDTH * 0.5, y: WORLD_HEIGHT * 0.5 };
}

function centerCameraOn(wx, wy) {
  const wp = simToWorld(wx, wy);
  cameraTarget.set(wp.x, 0, wp.z);
  cameraOffset.x = 0;
  cameraOffset.y = 0;
  updateCameraTransform();
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, options);
  let data = null;
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) throw new Error(data.error || data.message || `${response.status} ${response.statusText}`);
  return data;
}

function resizeCanvas() {
  const container = document.getElementById('world-canvas-container');
  if (!container || !renderer) return;
  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
window.addEventListener('resize', resizeCanvas);

async function fetchWorld() {
  try {
    const isFirst = !worldData;
    worldData = await apiJson('/api/state');
    renderUI();
    renderChronicle();
    if (sceneReady) {
      if (isFirst || !terrainMesh) {
        rebuild3DWorld();
      } else {
        updateSettlements3D();
      }
    }
  } catch (error) {
    console.error('Failed to fetch world:', error);
  }
}

async function fetchPowers() {
  try {
    const data = await apiJson('/api/powers');
    powerDefinitions = data.available || [];
    renderPowers();
  } catch (error) {
    console.error('Failed to load powers:', error);
  }
}

function renderUI() {
  if (!worldData) return;
  document.getElementById('tick-val').textContent = worldData.tick ?? 0;
  document.getElementById('pop-val').textContent = worldData.creature_count ?? 0;
  document.getElementById('settle-val').textContent = Object.keys(worldData.settlements || {}).length;
  document.getElementById('faction-val').textContent = Object.keys(worldData.factions || {}).length;
  const religions = new Set(Object.values(worldData.creatures || {}).map(c => c.religion_name).filter(Boolean));
  document.getElementById('religion-val').textContent = religions.size;
}

function renderChronicle() {
  const container = document.getElementById('chronicle-entries');
  if (!container || !worldData) return;
  container.innerHTML = (worldData.chronicle || []).slice(-24).reverse().map(e =>
    `<div class="chronicle-entry"><span class="tick">t${e.tick}</span><b>${escapeHtml(e.title)}</b>${e.interpreted_as_divine ? ' <span class="divine">✦</span>' : ''}<br>${escapeHtml(e.description)}</div>`
  ).join('') || '<div class="chronicle-entry">No record yet.</div>';
}

function renderPowers() {
  const container = document.getElementById('power-palette');
  if (!container) return;
  container.replaceChildren();
  for (const power of powerDefinitions) {
    const button = document.createElement('button');
    button.className = `power-btn ${power.kind === selectedPower ? 'active' : ''} ${power.available ? '' : 'locked'}`;

    // SVG icon for authentic visual presentation
    const icon = document.createElement('img');
    icon.src = `/assets/sprites/icon_${power.kind}.svg`;
    icon.style.cssText = 'width:14px; height:14px; vertical-align:middle; margin-right:5px; filter:invert(0.9);';
    button.appendChild(icon);

    const span = document.createElement('span');
    span.textContent = power.label;
    button.appendChild(span);

    button.disabled = !power.available || observerMode;
    button.setAttribute('aria-disabled', button.disabled ? 'true' : 'false');
    button.title = power.available ? power.label : `Unlocks after ${power.threshold} interventions`;
    button.addEventListener('click', () => {
      ensureAudioFromGesture();
      selectPower(power.kind);
    });
    container.appendChild(button);
  }
}

function selectPower(kind) {
  const def = powerDefinitions.find(item => item.kind === kind);
  if (!def || !def.available || observerMode) return false;
  selectedPower = kind;
  renderPowers();
  return true;
}

function ensureAudioFromGesture() {
  userHasInteracted = true;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!audioCtx && AudioCtor) audioCtx = new AudioCtor();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
}

function playTone(freq, duration, type, gainValue) {
  if (!audioCtx || !userHasInteracted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(gainValue, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
  osc.addEventListener('ended', () => {
    osc.disconnect();
    gain.disconnect();
  }, { once: true });
}

function playPowerSound(kind) {
  const params = POWER_AUDIO[kind];
  if (!params) return;
  playTone(...params);
  if (kind === 'lightning' && !reducedMotion) {
    setTimeout(() => playTone(75, 0.36, 'sawtooth', 0.04), 220);
  }
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life--;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    if (p.kind==='rain') { /* 3D rain drop update */ }
    else if (p.kind==='wind') { /* 3D wind gust leaf update */ }
  }
}

// Particle & presentation triggers
function spawnParticle(kind, x, y, radius = 80) {
  particles.push({ kind, x, y, radius, life: 60 });
  spawn3DDivinePower(kind, x, y, radius);
}

function triggerPowerPresentation(kind, x, y, radius) {
  spawnParticle(kind, x, y, radius);
  playPowerSound(kind);
}

async function sendAction(kind, x, y) {
  if (observerMode) {
    showNotice('Observer mode is watching, not intervening.');
    return { ok: false, reason: 'observer' };
  }
  try {
    const data = await apiJson('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({kind, x, y, radius:80})
    });
    triggerPowerPresentation(kind, data.x, data.y, data.radius);
    await fetchWorld();
    await fetchPowers();
    return { ok: true, data };
  } catch (error) {
    console.warn('Action rejected:', error);
    showNotice(error.message);
    return { ok: false, error };
  }
}

function showNotice(message) {
  let n = document.getElementById('tiny-notice');
  if (!n) {
    n = document.createElement('div');
    n.id = 'tiny-notice';
    n.style.cssText = 'position:fixed;left:50%;bottom:80px;transform:translateX(-50%);z-index:250;padding:8px 14px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(8,9,13,.92);color:#ddd;font:12px system-ui;pointer-events:none';
    document.body.appendChild(n);
  }
  n.textContent = message;
  n.style.opacity = '1';
  clearTimeout(n._timer);
  n._timer = setTimeout(() => n.style.opacity = '0', 1800);
}

function findNearestCreature(sx, sy) {
  const w = canvas.width || window.innerWidth;
  const h = canvas.height || window.innerHeight;
  const hit = raycastScene((sx / w) * 2 - 1, -(sy / h) * 2 + 1);
  if (hit?.type === 'creature') {
    return { cid: hit.id, c: hit.data };
  }
  return null;
}

function exitObserverForManualControl() {
  const wasObserver = observerMode;
  if (wasObserver) {
    observerMode = false;
    observerTargetOffset = null;
    updateObserverUi();
    renderPowers();
  }
  return wasObserver;
}

function pointerCenter(points) {
  const vals = [...points.values()];
  return {
    x: vals.reduce((a, p) => a + p.x, 0) / vals.length,
    y: vals.reduce((a, p) => a + p.y, 0) / vals.length
  };
}

function pointerDistance(points) {
  const vals = [...points.values()];
  return vals.length < 2 ? 0 : Math.hypot(vals[0].x - vals[1].x, vals[0].y - vals[1].y);
}

// Pointer Events (drag pan, pinch zoom, click inspection & divine intervention)
canvas.addEventListener('pointerdown', e => {
  ensureAudioFromGesture();
  const exitedObserver = exitObserverForManualControl();
  canvas.setPointerCapture(e.pointerId);
  activePointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });

  if (activePointers.size === 1) {
    gesture = {
      mode: exitedObserver ? 'observer-exit' : 'tap',
      pointerId: e.pointerId,
      startX: e.offsetX,
      startY: e.offsetY,
      lastX: e.offsetX,
      lastY: e.offsetY,
      startOffset: { ...cameraOffset }
    };
    panStart.x = e.offsetX;
    panStart.y = e.offsetY;
    panStartTarget.copy(cameraTarget);
  } else if (activePointers.size === 2) {
    const center = pointerCenter(activePointers);
    gesture = {
      mode:'pinch',
      startDistance: pointerDistance(activePointers),
      startZoom: cameraZoom,
      centerWorld: screenToWorld(center.x, center.y),
      center
    };
  }
});

canvas.addEventListener('pointermove', e => {
  if (!activePointers.has(e.pointerId)) return;
  activePointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });

  if (activePointers.size === 2) {
    const center = pointerCenter(activePointers);
    const dist = pointerDistance(activePointers);
    if (gesture?.mode !== 'pinch') {
      gesture = {
        mode: 'pinch',
        startDistance: dist,
        startZoom: cameraZoom,
        centerWorld: screenToWorld(center.x, center.y),
        center
      };
    }
    const next = clamp(gesture.startZoom * (dist / Math.max(1, gesture.startDistance)), 0.6, 2.8);
    cameraZoom = next;
    cameraOffset.x = center.x - (gesture.centerWorld.x / WORLD_WIDTH) * canvas.width * next;
    cameraOffset.y = center.y - (gesture.centerWorld.y / WORLD_HEIGHT) * canvas.height * next;
    updateCameraTransform();
    return;
  }

  if (gesture && gesture.pointerId === e.pointerId) {
    const dx = e.offsetX - gesture.startX;
    const dy = e.offsetY - gesture.startY;
    if (gesture.mode === 'tap' && Math.hypot(dx, dy) > 6) {
      gesture.mode = 'drag';
    }
    if (gesture.mode === 'drag') {
      cameraOffset.x=gesture.startOffset.x+dx;
      cameraOffset.y = gesture.startOffset.y + dy;
      // Also pan 3D camera target smoothly across the diorama plane
      const panFactor = 0.08 / cameraZoom;
      cameraTarget.x = panStartTarget.x - dx * panFactor;
      cameraTarget.z = panStartTarget.z - dy * panFactor;
      cameraTarget.x = clamp(cameraTarget.x, -50, 50);
      cameraTarget.z = clamp(cameraTarget.z, -38, 38);
      updateCameraTransform();
    }
  }
});

canvas.addEventListener('pointerup', e => {
  const wasGesture = gesture;
  activePointers.delete(e.pointerId);
  try { canvas.releasePointerCapture(e.pointerId); } catch {}

  // Only trigger if it was a genuine TAP/CLICK (not a drag)
  if (wasGesture?.mode === 'tap' && wasGesture.pointerId === e.pointerId) {
    const coords = getCanvasRelativeCoords(e);
    const hit = raycastScene(coords.ndcX, coords.ndcY);

    if (hit?.type === 'creature') {
      selectedCreatureId = hit.id;
      openCreatureModal(hit.id);
    } else if (hit?.type === 'settlement') {
      centerCameraOn(hit.data?.x || 600, hit.data?.y || 450);
      showNotice(`Settlement: ${hit.name}`);
    } else if (hit?.type === 'ground') {
      if (selectedPower !== 'observe') {
        sendAction(selectedPower, hit.simX, hit.simY);
      } else {
        selectedCreatureId = null;
      }
    }
  }
  gesture = activePointers.size ? gesture : null;
});

canvas.addEventListener('pointercancel', e => {
  activePointers.delete(e.pointerId);
  gesture = null;
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  exitObserverForManualControl();
  const factor = e.deltaY < 0 ? 1.12 : 0.88;
  cameraZoom = clamp(cameraZoom * factor, 0.55, 2.8);
  updateCameraTransform();
}, { passive: false });

canvas.addEventListener('pointermove', e => {
  if (activePointers.size) return;
  const coords = getCanvasRelativeCoords(e);
  const hit = raycastScene(coords.ndcX, coords.ndcY);
  if (hit?.type === 'creature') {
    tooltip.classList.add('show');
    tooltip.style.left = `${e.clientX + 14}px`;
    tooltip.style.top = `${e.clientY + 14}px`;
    tooltip.innerHTML = `<h4>${escapeHtml(hit.data?.name || 'Inhabitant')}</h4><div>${escapeHtml(hit.data?.occupation || 'wanderer')}</div><div>Click to inspect</div>`;
  } else if (hit?.type === 'settlement') {
    tooltip.classList.add('show');
    tooltip.style.left = `${e.clientX + 14}px`;
    tooltip.style.top = `${e.clientY + 14}px`;
    tooltip.innerHTML = `<h4>${escapeHtml(hit.name || 'Settlement')}</h4><div>Population physical settlement</div><div>Click to focus</div>`;
  } else {
    tooltip.classList.remove('show');
  }
});

// Render Loop
let lastTime = performance.now();
function frame(ts) {
  animationClock = ts;
  const now = performance.now();
  const delta = Math.min((now - lastTime) * 0.001, 0.1);
  lastTime = now;

  if (ts - lastFrameDraw >= 20) {
    lastFrameDraw = ts;

    if (observerTargetOffset) {
      const k = reducedMotion ? 1 : 0.12;
      cameraOffset.x += (observerTargetOffset.x - cameraOffset.x) * k;
      cameraOffset.y += (observerTargetOffset.y - cameraOffset.y) * k;
      if (Math.hypot(observerTargetOffset.x - cameraOffset.x, observerTargetOffset.y - cameraOffset.y) < 1) {
        observerTargetOffset = null;
      }
      updateCameraTransform();
    }

    if (observerMode && ts - lastObserverFocusAt > 2600) {
      focusObserverTarget();
      lastObserverFocusAt = ts;
    }

    // Update 3D systems
    updateCreatures3D(delta);
    updateVFX(delta);

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }
  requestAnimationFrame(frame);
}

// Modals, Panels & Persistence UI
async function openCreatureModal(cid) {
  try {
    const c = await apiJson(`/api/creature/${cid}`);
    selectedCreatureId = cid;
    selectedCreatureData = c;
    document.getElementById('modal-name').textContent = c.name || 'Unknown';
    document.getElementById('modal-tags').innerHTML = [c.religion_name, c.religious_role, c.occupation, c.current_goal_display].filter(Boolean).map(v => `<span class="tag">${escapeHtml(v)}</span>`).join('');
    document.getElementById('modal-body').innerHTML = `
      <div class="section-label">Life</div>
      <div>Age ${c.age} · ${escapeHtml(c.personality_tag || '')}</div>
      <div class="section-label">Belief</div>
      <div>Strength ${(Number(c.belief_strength || 0) * 100).toFixed(0)}% · ${escapeHtml(c.religion_name || 'No named tradition')}</div>
      <div class="section-label">Understanding</div>
      <div>${escapeHtml(Object.entries(c.deity_interpretation || {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'No settled interpretation')}</div>
      <div class="section-label">Memory</div>
      ${(c.memories || []).slice(-8).reverse().map(m => `<div class="memory-item"><span class="tick">t${m.tick}</span> ${escapeHtml(m.description)}</div>`).join('') || '<div>No durable memories yet.</div>'}
    `;
    document.getElementById('modal-backdrop').classList.add('open');
    document.getElementById('creature-modal').classList.add('open');
  } catch (error) {
    showNotice(`Inspection failed: ${error.message}`);
  }
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.remove('open');
  document.getElementById('creature-modal').classList.remove('open');
}

function togglePanel(panel) {
  panel.classList.toggle('collapsed');
  const entries = panel.querySelector('#chronicle-entries');
  if (entries) entries.style.display = panel.classList.contains('collapsed') ? 'none' : 'block';
}
document.getElementById('modal-backdrop')?.addEventListener('click', closeModal);

function saveWorld() {
  apiJson('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    .then(data => showNotice(`World saved at tick ${data.tick}.`))
    .catch(error => showNotice(`Save failed: ${error.message}`));
}

function loadWorld() {
  apiJson('/api/load')
    .then(data => {
      showNotice(`World restored from tick ${data.saved_tick}.`);
      return Promise.all([fetchWorld(), fetchPowers()]);
    })
    .catch(error => showNotice(`Load failed: ${error.message}`));
}

function exportWorld() {
  apiJson('/api/export')
    .then(data => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tiny_gods_world_${data.tick || 0}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    })
    .catch(error => showNotice(`Export failed: ${error.message}`));
}

function importWorld() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const payload = JSON.parse(String(reader.result));
        const data = await apiJson('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showNotice(`World imported at tick ${data.tick}.`);
        await fetchWorld();
        await fetchPowers();
      } catch (error) {
        showNotice(`Import failed: ${error.message}`);
      }
    };
    reader.readAsText(file);
  }, { once: true });
  input.click();
}

function hidePanel(id) {
  const panel = document.getElementById(id);
  if (panel) panel.style.display = 'none';
}

function showHistoryBrowser() {
  const panel = document.getElementById('history-panel');
  const content = document.getElementById('history-content');
  panel.style.display = 'block';
  content.textContent = 'Loading history…';
  Promise.all([apiJson('/api/chronicle'), apiJson('/api/world_lenses')])
    .then(([chronicle, lenses]) => {
      const people = (worldData?.historical_identities || []).filter(x => x.entity_type === 'creature').sort((a, b) => b.importance_score - a.importance_score).slice(0, 10);
      content.innerHTML = `
        <h4>Events</h4>
        ${chronicle.slice(-30).reverse().map(e => `<div><b>t${e.tick}</b> ${escapeHtml(e.title || e.event_type)} — ${escapeHtml(e.description)}</div>`).join('')}
        <h4>People remembered</h4>
        ${people.map(p => `<div>${escapeHtml(p.name)} · importance ${Number(p.importance_score || 0).toFixed(1)}</div>`).join('') || '<div>No named historical people yet.</div>'}
        <h4>Settlements</h4>
        ${(lenses.settlements || []).map(s => `<div>${escapeHtml(s.name)} · ${escapeHtml(s.stage || 'unknown')} · ${s.population} souls</div>`).join('')}
        <h4>Traditions</h4>
        ${(lenses.religions || []).map(r => `<div>${escapeHtml(r.name)} · ${r.members} adherents</div>`).join('')}
      `;
    })
    .catch(error => {
      content.textContent = `History unavailable: ${error.message}`;
    });
}

function showLineageView() {
  const panel = document.getElementById('lineage-panel');
  const content = document.getElementById('lineage-content');
  panel.style.display = 'block';
  if (!selectedCreatureData) {
    content.textContent = 'Inspect a creature first, then return here to follow their family.';
    return;
  }
  content.textContent = 'Loading lineage…';
  apiJson(`/api/lineage/${selectedCreatureData.family}`)
    .then(data => {
      content.innerHTML = `
        <h4>Family ${data.family_id}</h4>
        <div>${(data.members || []).map(m => `${m.alive ? '●' : '○'} ${escapeHtml(m.name)} · age ${m.age}`).join('<br>') || 'No known members.'}</div>
        <h4>Known parents / ancestors</h4>
        <div>${(data.ancestry || []).map(a => `${a.alive ? '●' : '○'} ${escapeHtml(a.name)}`).join('<br>') || 'No recorded parents.'}</div>
        <h4>Recent family events</h4>
        <div>${(data.life_events || []).map(e => escapeHtml(typeof e === 'string' ? e : JSON.stringify(e))).join('<br>') || 'No notable family events yet.'}</div>
      `;
    })
    .catch(error => {
      content.textContent = `Lineage unavailable: ${error.message}`;
    });
}

function showTheologyCompare() {
  const panel = document.getElementById('theology-panel');
  const content = document.getElementById('theology-content');
  panel.style.display = 'block';
  content.textContent = 'Comparing traditions…';
  const ids = Object.keys(worldData?.factions || {}).slice(0, 8);
  Promise.all(ids.map(id => apiJson(`/api/religion/${id}`)))
    .then(religions => {
      content.innerHTML = religions.length ? religions.map(r => `
        <section style="margin-bottom:14px">
          <b>${escapeHtml(r.name)}</b>
          <div>${escapeHtml(r.belief_summary || 'No consensus')}</div>
          <div>Claims: ${(r.doctrine_claims || []).map(escapeHtml).join(' · ') || 'none fixed'}</div>
          <div>Rituals: ${(r.ritual_practices || []).map(escapeHtml).join(' · ') || 'none fixed'}</div>
          <small>${r.parent_tradition ? `Descended from ${escapeHtml(r.parent_tradition)}. ` : ''}${r.members_alive} living adherents.</small>
        </section>
      `).join('') : '<div>No organized traditions yet. Individual interpretations still differ.</div>';
    })
    .catch(error => {
      content.textContent = `Theology unavailable: ${error.message}`;
    });
}

function ensureStoryPanel() {
  let p = document.getElementById('story-panel');
  if (p) return p;
  p = document.createElement('div');
  p.id = 'story-panel';
  p.style.cssText = 'display:none;position:fixed;z-index:60;right:20px;bottom:120px;width:min(380px,88vw);max-height:60vh;overflow:auto;background:rgba(10,9,14,.95);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px 20px';
  p.innerHTML = '<h3 style="color:var(--accent)">Living Threads</h3><div id="story-content"></div><button class="power-btn" onclick="hidePanel(\'story-panel\')">Close</button>';
  document.body.appendChild(p);
  return p;
}

function showStoryThreads() {
  const p = ensureStoryPanel();
  const content = p.querySelector('#story-content');
  p.style.display = 'block';
  const threads = worldData?.current_story_threads || [];
  content.innerHTML = threads.length ? threads.slice().sort((a, b) => b.importance - a.importance).map(t =>
    `<article style="margin:10px 0"><b>${escapeHtml(t.description)}</b><div>${escapeHtml(t.kind)} · ${escapeHtml(t.stage)} · importance ${Number(t.importance || 0).toFixed(1)}</div></article>`
  ).join('') : '<div>No strong thread has emerged yet. Keep watching.</div>';
}

function updateObserverUi() {
  const btn = document.getElementById('observer-btn');
  const status = document.getElementById('observer-status');
  if (btn) btn.textContent = observerMode ? 'Observer: ON' : 'Observer: OFF';
  if (status) status.textContent = observerMode ? 'Observer mode is following autonomous activity. Touch the world to take control.' : 'Observer mode disabled. Actions will change the world.';
}

function toggleObserverMode() {
  observerMode = !observerMode;
  observerTargetOffset = null;
  if (observerMode) selectedPower = 'observe';
  updateObserverUi();
  renderPowers();
}

function focusObserverTarget() {
  if (!worldData) return;
  const thread = (worldData.current_story_threads || []).slice().sort((a, b) => b.importance - a.importance)[0];
  let target = null;
  if (thread?.involved_settlements?.length) {
    target = worldData.settlements?.[thread.involved_settlements[0]];
  }
  if (!target) {
    target = Object.values(worldData.settlements || {}).sort((a, b) => (b.population || 0) - (a.population || 0))[0];
  }
  if (!target) {
    target = Object.values(worldData.creatures || {}).find(c => c.alive);
  }
  if (target) centerCameraOn(target.x, target.y);
}

function closeOnboarding() {
  localStorage.setItem('tiny-gods-onboarding-v1', 'dismissed');
  document.getElementById('onboarding-overlay').style.display = 'none';
}

function reopenOnboarding() {
  document.getElementById('onboarding-overlay').style.display = 'flex';
}

function setupUtilityButtons() {
  const toolbar = document.getElementById('observer-btn')?.parentElement;
  if (toolbar && !document.getElementById('story-btn')) {
    const story = document.createElement('button');
    story.id = 'story-btn';
    story.className = 'power-btn';
    story.textContent = 'Stories';
    story.addEventListener('click', showStoryThreads);
    toolbar.insertBefore(story, document.getElementById('observer-btn'));

    const help = document.createElement('button');
    help.className = 'power-btn';
    help.textContent = 'Help';
    help.addEventListener('click', reopenOnboarding);
    toolbar.appendChild(help);
  }
  if (localStorage.getItem('tiny-gods-onboarding-v1') === 'dismissed') {
    document.getElementById('onboarding-overlay').style.display = 'none';
  }
}

// Bind handlers to window so inline onclick handlers in HTML can invoke them
window.saveWorld = saveWorld;
window.loadWorld = loadWorld;
window.exportWorld = exportWorld;
window.importWorld = importWorld;
window.showHistoryBrowser = showHistoryBrowser;
window.showLineageView = showLineageView;
window.showTheologyCompare = showTheologyCompare;
window.toggleObserverMode = toggleObserverMode;
window.hidePanel = hidePanel;
window.closeOnboarding = closeOnboarding;
window.reopenOnboarding = reopenOnboarding;
window.showStoryThreads = showStoryThreads;
window.togglePanel = togglePanel;
window.closeModal = closeModal;
window.centerCameraOn = centerCameraOn;
window.setCameraZoom = (z) => { cameraZoom = z; updateCameraTransform(); };
window.triggerPowerPresentation = triggerPowerPresentation;
window.openCreatureModal = openCreatureModal;
window.getWorldData = () => worldData;
window.setAtmosphere = (type) => {
  if (type === 'night') {
    sunLight.intensity = 0.6;
    sunLight.color.setHex(0x6080e0);
    hemiLight.intensity = 0.7;
    scene.background = new THREE.Color(0x070a14);
    if (scene.fog) scene.fog.color.setHex(0x070a14);
  } else if (type === 'storm') {
    sunLight.intensity = 0.8;
    sunLight.color.setHex(0x708090);
    hemiLight.intensity = 0.6;
    scene.background = new THREE.Color(0x1a202c);
    if (scene.fog) scene.fog.color.setHex(0x1a202c);
  } else {
    sunLight.intensity = 2.4;
    sunLight.color.setHex(0xfffaea);
    hemiLight.intensity = 1.1;
    scene.background = new THREE.Color(0x0e111a);
    if (scene.fog) scene.fog.color.setHex(0x0e111a);
  }
};

reducedMotionQuery.addEventListener?.('change', e => {
  reducedMotion = e.matches;
  particles.splice(0, particles.length);
});

document.addEventListener('keydown', e => {
  ensureAudioFromGesture();
  if (e.key === 'Escape') {
    closeModal();
    ['history-panel', 'lineage-panel', 'theology-panel', 'story-panel'].forEach(hidePanel);
  }
  const idx = Number(e.key) - 1;
  if (idx >= 0 && idx < powerDefinitions.length) selectPower(powerDefinitions[idx].kind);
});

setupUtilityButtons();
if (window.matchMedia('(max-width: 600px)').matches) {
  const chronicle = document.getElementById('chronicle-panel');
  const entries = document.getElementById('chronicle-entries');
  if (chronicle) chronicle.classList.add('collapsed');
  if (entries) entries.style.display = 'none';
}

// Startup sequence
initThreeScene();
fetchWorld();
fetchPowers();
setInterval(fetchWorld, 1200);
requestAnimationFrame(frame);
