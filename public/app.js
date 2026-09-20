'use strict';

const WORLD_WIDTH = 1200;
const WORLD_HEIGHT = 900;
const canvas = document.getElementById('worldCanvas');
const ctx = canvas.getContext('2d');
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
const terrainLayer = document.createElement('canvas');
terrainLayer.width = WORLD_WIDTH; terrainLayer.height = WORLD_HEIGHT;
const terrainLayerCtx = terrainLayer.getContext('2d');
let terrainDirty = true;
const activePointers = new Map();
let gesture = null;

const POWER_AUDIO = {
  observe: [420, 0.12, 'sine', 0.035], wind: [620, 0.24, 'triangle', 0.05], rain: [360, 0.32, 'triangle', 0.04],
  fire: [780, 0.18, 'sawtooth', 0.045], fertility: [300, 0.35, 'sine', 0.05], dreams: [510, 0.42, 'sine', 0.04],
  omens: [180, 0.55, 'triangle', 0.045], lightning: [1100, 0.08, 'square', 0.055], healing: [330, 0.34, 'sine', 0.05],
  mutation: [710, 0.26, 'triangle', 0.045], earth_movement: [95, 0.45, 'sawtooth', 0.045],
};

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
function hashInt(value) { let h = 2166136261; for (const ch of String(value)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function seeded01(seed) { const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }

function worldToScreen(wx, wy) {
  return { x: (wx / WORLD_WIDTH) * canvas.width * cameraZoom + cameraOffset.x, y: (wy / WORLD_HEIGHT) * canvas.height * cameraZoom + cameraOffset.y };
}
function screenToWorld(sx, sy) {
  return { x: clamp(((sx - cameraOffset.x) / (canvas.width * cameraZoom)) * WORLD_WIDTH, 0, WORLD_WIDTH), y: clamp(((sy - cameraOffset.y) / (canvas.height * cameraZoom)) * WORLD_HEIGHT, 0, WORLD_HEIGHT) };
}
function centerCameraOn(wx, wy) {
  observerTargetOffset = { x: canvas.width / 2 - (wx / WORLD_WIDTH) * canvas.width * cameraZoom, y: canvas.height / 2 - (wy / WORLD_HEIGHT) * canvas.height * cameraZoom };
  if (reducedMotion) { cameraOffset = { ...observerTargetOffset }; observerTargetOffset = null; }
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
  canvas.width = Math.max(1, container.clientWidth);
  canvas.height = Math.max(1, container.clientHeight);
  terrainDirty = true;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

async function fetchWorld() {
  try {
    worldData = await apiJson('/api/state');
    terrainDirty = true;
    renderUI(); renderChronicle();
  } catch (error) { console.error('Failed to fetch world:', error); }
}
async function fetchPowers() {
  try { const data = await apiJson('/api/powers'); powerDefinitions = data.available || []; renderPowers(); }
  catch (error) { console.error('Failed to load powers:', error); }
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
  container.innerHTML = (worldData.chronicle || []).slice(-24).reverse().map(e => `<div class="chronicle-entry"><span class="tick">t${e.tick}</span><b>${escapeHtml(e.title)}</b>${e.interpreted_as_divine ? ' <span class="divine">✦</span>' : ''}<br>${escapeHtml(e.description)}</div>`).join('') || '<div class="chronicle-entry">No record yet.</div>';
}
function renderPowers() {
  const container = document.getElementById('power-palette');
  if (!container) return;
  container.replaceChildren();
  for (const power of powerDefinitions) {
    const button = document.createElement('button');
    button.className = `power-btn ${power.kind === selectedPower ? 'active' : ''} ${power.available ? '' : 'locked'}`;
    button.textContent = power.label;
    button.disabled = !power.available || observerMode;
    button.setAttribute('aria-disabled', button.disabled ? 'true' : 'false');
    button.title = power.available ? power.label : `Unlocks after ${power.threshold} interventions`;
    button.addEventListener('click', () => { ensureAudioFromGesture(); selectPower(power.kind); });
    container.appendChild(button);
  }
}
function selectPower(kind) {
  const def = powerDefinitions.find(item => item.kind === kind);
  if (!def || !def.available || observerMode) return false;
  selectedPower = kind; renderPowers(); return true;
}

function ensureAudioFromGesture() {
  userHasInteracted = true;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!audioCtx && AudioCtor) audioCtx = new AudioCtor();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
}
function playTone(freq, duration, type, gainValue) {
  if (!audioCtx || !userHasInteracted) return;
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(gainValue, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + duration);
  osc.addEventListener('ended', () => { osc.disconnect(); gain.disconnect(); }, { once: true });
}
function playPowerSound(kind) {
  const params = POWER_AUDIO[kind]; if (!params) return; playTone(...params);
  if (kind === 'lightning' && !reducedMotion) setTimeout(() => playTone(75, 0.36, 'sawtooth', 0.04), 220);
}

function spawnParticle(kind, x, y, radius = 80) {
  if (particles.length > 700) particles.splice(0, particles.length - 700);
  const scale = reducedMotion ? 0.35 : 1;
  const count = Math.max(2, Math.round(({wind:18,rain:30,fire:24,fertility:18,dreams:14,omens:10,lightning:22,healing:18,mutation:22,earth_movement:26,observe:5}[kind] || 12) * scale));
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2; const speed = 0.2 + Math.random() * 1.6; const spread = Math.random() * radius * 0.65;
    let vx = Math.cos(angle) * speed, vy = Math.sin(angle) * speed, life = 35 + Math.random()*40;
    if (kind === 'wind') { vx = 2 + Math.random()*2.4; vy = (Math.random()-.5)*.5; }
    if (kind === 'rain') { vx = -.15; vy = 3 + Math.random()*2; life = 28 + Math.random()*24; }
    if (kind === 'fire') { vx = (Math.random()-.5)*.7; vy = -1.2 - Math.random()*1.8; }
    if (kind === 'earth_movement') { vy = -1 - Math.random()*1.2; }
    particles.push({kind, x:x+Math.cos(angle)*spread, y:y+Math.sin(angle)*spread, vx, vy, life, maxLife:life, size:1.5+Math.random()*3});
  }
  if (kind === 'lightning') { flashUntil = performance.now() + (reducedMotion ? 50 : 130); lightningBolt = { x, y, until: performance.now()+180 }; }
}
function triggerPowerPresentation(kind, x, y, radius) { spawnParticle(kind,x,y,radius); playPowerSound(kind); }
function particleColor(kind, alpha) {
  const colors={wind:`rgba(170,215,195,${alpha})`,rain:`rgba(105,160,210,${alpha})`,fire:`rgba(240,130,70,${alpha})`,fertility:`rgba(115,200,120,${alpha})`,dreams:`rgba(165,140,225,${alpha})`,omens:`rgba(210,185,120,${alpha})`,lightning:`rgba(245,240,220,${alpha})`,healing:`rgba(130,230,190,${alpha})`,mutation:`rgba(205,120,220,${alpha})`,earth_movement:`rgba(175,135,95,${alpha})`,observe:`rgba(210,200,185,${alpha})`};
  return colors[kind] || `rgba(230,230,230,${alpha})`;
}
function drawParticles() {
  for (let i=particles.length-1;i>=0;i--) {
    const p=particles[i]; p.x+=p.vx; p.y+=p.vy; p.life--; if (p.kind==='fire') p.vy-=.025; if (p.kind==='earth_movement') p.vy+=.06;
    if (p.life<=0) { particles.splice(i,1); continue; }
    const a=p.life/p.maxLife; const pos=worldToScreen(p.x,p.y); ctx.save(); ctx.globalAlpha=a; ctx.strokeStyle=particleColor(p.kind,a); ctx.fillStyle=particleColor(p.kind,a);
    if (p.kind==='wind') { ctx.beginPath(); ctx.moveTo(pos.x-8,pos.y); ctx.lineTo(pos.x+8,pos.y-2); ctx.stroke(); }
    else if (p.kind==='rain') { ctx.beginPath(); ctx.moveTo(pos.x,pos.y-6); ctx.lineTo(pos.x-2,pos.y+6); ctx.stroke(); }
    else if (p.kind==='fire') { ctx.beginPath(); ctx.moveTo(pos.x,pos.y-5); ctx.lineTo(pos.x-3,pos.y+4); ctx.lineTo(pos.x+3,pos.y+4); ctx.closePath(); ctx.fill(); }
    else if (p.kind==='fertility') { ctx.beginPath(); ctx.ellipse(pos.x,pos.y,p.size*1.8,p.size*.7,Math.PI/4,0,Math.PI*2); ctx.fill(); }
    else if (p.kind==='dreams') { ctx.beginPath(); ctx.arc(pos.x,pos.y,p.size*2.2,0,Math.PI*2); ctx.stroke(); }
    else if (p.kind==='omens') { ctx.beginPath(); ctx.moveTo(pos.x,pos.y-5); ctx.lineTo(pos.x+4,pos.y+4); ctx.lineTo(pos.x-4,pos.y+4); ctx.closePath(); ctx.stroke(); }
    else if (p.kind==='healing') { ctx.beginPath(); ctx.moveTo(pos.x-4,pos.y); ctx.lineTo(pos.x+4,pos.y); ctx.moveTo(pos.x,pos.y-4); ctx.lineTo(pos.x,pos.y+4); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(pos.x,pos.y,p.size,0,Math.PI*2); ctx.fill(); }
    ctx.restore();
  }
  if (lightningBolt && performance.now() < lightningBolt.until) {
    const pos=worldToScreen(lightningBolt.x,lightningBolt.y); ctx.save(); ctx.strokeStyle='rgba(250,245,225,.9)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(pos.x-18,pos.y-120); ctx.lineTo(pos.x+4,pos.y-70); ctx.lineTo(pos.x-8,pos.y-35); ctx.lineTo(pos.x,pos.y); ctx.stroke(); ctx.restore();
  }
  if (performance.now() < flashUntil) { ctx.save(); ctx.fillStyle=`rgba(255,252,235,${reducedMotion?.08:.18})`; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.restore(); }
}

async function sendAction(kind, x, y) {
  if (observerMode) { showNotice('Observer mode is watching, not intervening.'); return { ok:false, reason:'observer' }; }
  try {
    const data = await apiJson('/api/action', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({kind, x, y, radius:80}) });
    triggerPowerPresentation(kind, data.x, data.y, data.radius); await fetchWorld(); await fetchPowers(); return {ok:true,data};
  } catch (error) { console.warn('Action rejected:', error); showNotice(error.message); return {ok:false,error}; }
}
function showNotice(message) {
  let n=document.getElementById('tiny-notice'); if(!n){n=document.createElement('div');n.id='tiny-notice';n.style.cssText='position:fixed;left:50%;bottom:80px;transform:translateX(-50%);z-index:250;padding:8px 14px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(8,9,13,.92);color:#ddd;font:12px system-ui;pointer-events:none';document.body.appendChild(n);} n.textContent=message; n.style.opacity='1'; clearTimeout(n._timer); n._timer=setTimeout(()=>n.style.opacity='0',1800);
}

function findNearestCreature(sx, sy) {
  if (!worldData) return null; let best=null,bestDist=Infinity;
  for (const [cid,c] of Object.entries(worldData.creatures||{})) { if(!c.alive) continue; const p=worldToScreen(c.x,c.y); const d=Math.hypot(p.x-sx,p.y-sy); if(d<bestDist && d<18){best={cid:Number(cid),c};bestDist=d;} }
  return best;
}

function exitObserverForManualControl() { const wasObserver=observerMode; if(wasObserver){observerMode=false;observerTargetOffset=null;updateObserverUi();renderPowers();} return wasObserver; }
function pointerCenter(points) { const vals=[...points.values()]; return {x:vals.reduce((a,p)=>a+p.x,0)/vals.length,y:vals.reduce((a,p)=>a+p.y,0)/vals.length}; }
function pointerDistance(points) { const vals=[...points.values()]; return vals.length<2?0:Math.hypot(vals[0].x-vals[1].x,vals[0].y-vals[1].y); }
canvas.addEventListener('pointerdown', e => {
  ensureAudioFromGesture(); const exitedObserver=exitObserverForManualControl(); canvas.setPointerCapture(e.pointerId); activePointers.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
  if(activePointers.size===1){gesture={mode:exitedObserver?'observer-exit':'tap',pointerId:e.pointerId,startX:e.offsetX,startY:e.offsetY,lastX:e.offsetX,lastY:e.offsetY,startOffset:{...cameraOffset}};}
  else if(activePointers.size===2){const center=pointerCenter(activePointers);gesture={mode:'pinch',startDistance:pointerDistance(activePointers),startZoom:cameraZoom,centerWorld:screenToWorld(center.x,center.y),center};}
});
canvas.addEventListener('pointermove', e => {
  if(!activePointers.has(e.pointerId)) return; activePointers.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
  if(activePointers.size===2){const center=pointerCenter(activePointers);const dist=pointerDistance(activePointers);if(gesture?.mode!=='pinch')gesture={mode:'pinch',startDistance:dist,startZoom:cameraZoom,centerWorld:screenToWorld(center.x,center.y),center};const next=clamp(gesture.startZoom*(dist/Math.max(1,gesture.startDistance)),.7,2.6);cameraZoom=next;cameraOffset.x=center.x-(gesture.centerWorld.x/WORLD_WIDTH)*canvas.width*next;cameraOffset.y=center.y-(gesture.centerWorld.y/WORLD_HEIGHT)*canvas.height*next;return;}
  if(gesture && gesture.pointerId===e.pointerId){const dx=e.offsetX-gesture.startX,dy=e.offsetY-gesture.startY;if(gesture.mode==='tap' && Math.hypot(dx,dy)>7)gesture.mode='drag';if(gesture.mode==='drag'){cameraOffset.x=gesture.startOffset.x+dx;cameraOffset.y=gesture.startOffset.y+dy;}}
});
canvas.addEventListener('pointerup', e => {
  const wasGesture=gesture; const point={x:e.offsetX,y:e.offsetY}; activePointers.delete(e.pointerId); try{canvas.releasePointerCapture(e.pointerId);}catch{}
  if(wasGesture?.mode==='tap' && wasGesture.pointerId===e.pointerId){const nearest=findNearestCreature(point.x,point.y);if(nearest){selectedCreatureId=nearest.cid;openCreatureModal(nearest.cid);}else{const w=screenToWorld(point.x,point.y);sendAction(selectedPower,w.x,w.y);}}
  gesture=activePointers.size?gesture:null;
});
canvas.addEventListener('pointercancel', e => {activePointers.delete(e.pointerId);gesture=null;});
canvas.addEventListener('wheel', e => { e.preventDefault(); exitObserverForManualControl(); const before=screenToWorld(e.offsetX,e.offsetY); cameraZoom=clamp(cameraZoom*(e.deltaY<0?1.1:.9),.7,2.6); cameraOffset.x=e.offsetX-(before.x/WORLD_WIDTH)*canvas.width*cameraZoom; cameraOffset.y=e.offsetY-(before.y/WORLD_HEIGHT)*canvas.height*cameraZoom; },{passive:false});
canvas.addEventListener('pointermove', e => { if(activePointers.size) return; const n=findNearestCreature(e.offsetX,e.offsetY); if(n){tooltip.classList.add('show');tooltip.style.left=`${e.clientX+14}px`;tooltip.style.top=`${e.clientY+14}px`;tooltip.innerHTML=`<h4>${escapeHtml(n.c.name)}</h4><div>${escapeHtml(n.c.occupation||'wanderer')}</div><div>Click to inspect</div>`;}else tooltip.classList.remove('show'); });
canvas.addEventListener('pointerleave',()=>tooltip.classList.remove('show'));

function terrainTypeStyle(type){return {mountain:'#564e47',forest:'#213829',river:'#26465f',plains:'#343528',grassland:'#343b2a',burned:'#2b2421',scarred:'#2b2421',fertile:'#2f4930'}[type]||'#343129';}
function drawTerrainTile(key,type){const [cellX,cellY]=key.split(',').map(Number);if(!Number.isFinite(cellX)||!Number.isFinite(cellY))return;const wx=cellX*20,wy=cellY*20;const p=worldToScreen(wx,wy);const tile=Math.max(8,20*cameraZoom*(canvas.width/WORLD_WIDTH));if(p.x<-tile||p.x>canvas.width+tile||p.y<-tile||p.y>canvas.height+tile)return;ctx.fillStyle=terrainTypeStyle(type);ctx.fillRect(p.x,p.y,tile+1,tile+1);const seed=hashInt(key+type);ctx.save();ctx.strokeStyle='rgba(255,255,255,.08)';ctx.fillStyle='rgba(255,255,255,.08)';if(type==='forest'){for(let i=0;i<3;i++){const ox=seeded01(seed+i)*tile,oy=seeded01(seed+i+9)*tile;ctx.beginPath();ctx.arc(p.x+ox,p.y+oy,Math.max(1.5,tile*.12),0,Math.PI*2);ctx.fill();}}else if(type==='river'){ctx.strokeStyle='rgba(130,190,220,.28)';ctx.beginPath();ctx.moveTo(p.x,p.y+tile*.55);ctx.quadraticCurveTo(p.x+tile*.45,p.y+tile*.25,p.x+tile,p.y+tile*.5);ctx.stroke();}else if(type==='mountain'){ctx.beginPath();ctx.moveTo(p.x+2,p.y+tile);ctx.lineTo(p.x+tile*.5,p.y+2);ctx.lineTo(p.x+tile-2,p.y+tile);ctx.stroke();}else if(type==='burned'||type==='scarred'){ctx.strokeStyle='rgba(10,8,7,.5)';ctx.beginPath();ctx.moveTo(p.x+2,p.y+2);ctx.lineTo(p.x+tile-2,p.y+tile-2);ctx.moveTo(p.x+tile*.7,p.y);ctx.lineTo(p.x+tile*.3,p.y+tile);ctx.stroke();}else{for(let i=0;i<2;i++){const ox=seeded01(seed+i)*tile;ctx.beginPath();ctx.moveTo(p.x+ox,p.y+tile*.8);ctx.lineTo(p.x+ox+1,p.y+tile*.55);ctx.stroke();}}ctx.restore();}

function rebuildTerrainLayer(){
  terrainLayerCtx.clearRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);
  for(const [key,type] of Object.entries(worldData?.terrain_sample||{})){
    const [cellX,cellY]=key.split(',').map(Number); if(!Number.isFinite(cellX)||!Number.isFinite(cellY))continue;
    const x=cellX*20,y=cellY*20,tile=20; if(x+tile<0||y+tile<0||x>WORLD_WIDTH||y>WORLD_HEIGHT)continue;
    terrainLayerCtx.fillStyle=terrainTypeStyle(type); terrainLayerCtx.fillRect(x,y,tile+1,tile+1);
    const seed=hashInt(key+type); terrainLayerCtx.save(); terrainLayerCtx.strokeStyle='rgba(255,255,255,.08)'; terrainLayerCtx.fillStyle='rgba(255,255,255,.08)';
    if(type==='forest'){for(let i=0;i<3;i++){const ox=seeded01(seed+i)*tile,oy=seeded01(seed+i+9)*tile;terrainLayerCtx.beginPath();terrainLayerCtx.arc(x+ox,y+oy,2.4,0,Math.PI*2);terrainLayerCtx.fill();}}
    else if(type==='river'){terrainLayerCtx.strokeStyle='rgba(130,190,220,.28)';terrainLayerCtx.beginPath();terrainLayerCtx.moveTo(x,y+11);terrainLayerCtx.quadraticCurveTo(x+9,y+5,x+20,y+10);terrainLayerCtx.stroke();}
    else if(type==='mountain'){terrainLayerCtx.beginPath();terrainLayerCtx.moveTo(x+2,y+20);terrainLayerCtx.lineTo(x+10,y+2);terrainLayerCtx.lineTo(x+18,y+20);terrainLayerCtx.stroke();}
    else if(type==='burned'||type==='scarred'){terrainLayerCtx.strokeStyle='rgba(10,8,7,.5)';terrainLayerCtx.beginPath();terrainLayerCtx.moveTo(x+2,y+2);terrainLayerCtx.lineTo(x+18,y+18);terrainLayerCtx.moveTo(x+14,y);terrainLayerCtx.lineTo(x+6,y+20);terrainLayerCtx.stroke();}
    else{for(let i=0;i<2;i++){const ox=seeded01(seed+i)*tile;terrainLayerCtx.beginPath();terrainLayerCtx.moveTo(x+ox,y+16);terrainLayerCtx.lineTo(x+ox+1,y+11);terrainLayerCtx.stroke();}}
    terrainLayerCtx.restore();
  }
  terrainDirty=false;
}
function drawTerrainLayer(){ if(terrainDirty)rebuildTerrainLayer(); ctx.drawImage(terrainLayer, cameraOffset.x, cameraOffset.y, canvas.width*cameraZoom, canvas.height*cameraZoom); }

function drawSettlement(sid,s){const p=worldToScreen(s.x,s.y);const base=Math.max(8,Math.min(28,8+(s.population||0)*.7))*cameraZoom;const seed=hashInt(sid);ctx.save();ctx.strokeStyle='rgba(225,208,180,.28)';ctx.fillStyle='rgba(205,185,155,.32)';const structureCount=clamp((s.structures||[]).length||Math.ceil((s.population||1)/5),2,10);for(let i=0;i<structureCount;i++){const a=(i/structureCount)*Math.PI*2+seeded01(seed+i);const rad=base*(.35+.55*seeded01(seed+i+20));const x=p.x+Math.cos(a)*rad,y=p.y+Math.sin(a)*rad;const size=Math.max(3,base*.17);ctx.fillRect(x-size/2,y-size/2,size,size*.8);ctx.strokeRect(x-size/2,y-size/2,size,size*.8);ctx.beginPath();ctx.moveTo(x-size*.6,y-size/2);ctx.lineTo(x,y-size);ctx.lineTo(x+size*.6,y-size/2);ctx.stroke();}
ctx.strokeStyle='rgba(212,191,168,.16)';for(let i=0;i<3;i++){const a=(i/3)*Math.PI*2+seeded01(seed+100);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+Math.cos(a)*base*1.7,p.y+Math.sin(a)*base*1.7);ctx.stroke();}
if((s.structures||[]).some(v=>/temple|shrine/i.test(String(v)))||s.religion_leaning){ctx.strokeStyle='rgba(220,190,125,.55)';ctx.beginPath();ctx.moveTo(p.x,p.y-base*.7);ctx.lineTo(p.x,p.y+base*.2);ctx.moveTo(p.x-base*.25,p.y-base*.35);ctx.lineTo(p.x+base*.25,p.y-base*.35);ctx.stroke();}
ctx.fillStyle='rgba(235,230,222,.9)';ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText(s.name||'Settlement',p.x,p.y-base-6);ctx.restore();}

function getDisplayPosition(cid,c){let d=displayPositions.get(cid);if(!d){d={x:c.x,y:c.y,lastX:c.x,lastY:c.y};displayPositions.set(cid,d);}d.lastX=d.x;d.lastY=d.y;d.x+=(c.x-d.x)*(reducedMotion?1:.18);d.y+=(c.y-d.y)*(reducedMotion?1:.18);return d;}
function drawCreatureFigure(cid,c){const d=getDisplayPosition(cid,c),p=worldToScreen(d.x,d.y);if(p.x<-30||p.x>canvas.width+30||p.y<-30||p.y>canvas.height+30)return;const moving=Math.hypot(c.x-d.x,c.y-d.y)>.2;const child=(c.age??20)<12;const scale=(child ? 0.72 : 1)*cameraZoom;const bob=reducedMotion?0:(moving?Math.sin(animationClock*.018+Number(cid))*1.5:Math.sin(animationClock*.006+Number(cid))*.45);const size=Math.max(3.5,(c.size||5)*scale);const [r,g,b]=c.color||[200,160,100];ctx.save();ctx.translate(p.x,p.y+bob);ctx.strokeStyle=`rgba(${r},${g},${b},.95)`;ctx.fillStyle=`rgba(${r},${g},${b},.85)`;ctx.lineWidth=Math.max(1,scale*.8);ctx.beginPath();ctx.arc(0,-size*1.3,size*.55,0,Math.PI*2);ctx.fill();ctx.fillRect(-size*.5,-size*.75,size,size*1.25);const step=moving?Math.sin(animationClock*.025+Number(cid))*size*.25:0;ctx.beginPath();ctx.moveTo(-size*.2,size*.5);ctx.lineTo(-size*.45+step,size*1.3);ctx.moveTo(size*.2,size*.5);ctx.lineTo(size*.45-step,size*1.3);ctx.stroke();const occ=c.occupation||'';ctx.beginPath();if(occ==='builder'){ctx.moveTo(size*.55,-size*.3);ctx.lineTo(size*1.3,-size*.9);ctx.moveTo(size*1.05,-size*1.05);ctx.lineTo(size*1.45,-size*.65);}else if(occ==='warrior'){ctx.rect(size*.55,-size*.8,size*.6,size*.9);}else if(occ==='priest'||occ==='elder'){ctx.moveTo(size*.7,-size*.8);ctx.lineTo(size*.7,size*1.2);}else if(occ==='trader'){ctx.rect(-size*1.15,-size*.4,size*.55,size*.8);}else if(occ==='forager'){ctx.arc(size*.85,-size*.1,size*.35,0,Math.PI*2);}else if(occ==='artist'){ctx.moveTo(size*.55,-size*.4);ctx.lineTo(size*1.25,-size*.1);ctx.lineTo(size*.65,size*.2);}ctx.stroke();if(Number(cid)===selectedCreatureId){ctx.strokeStyle='rgba(240,220,180,.6)';ctx.beginPath();ctx.arc(0,0,size*2.2,0,Math.PI*2);ctx.stroke();}ctx.restore();}

function drawWorld(){canvas.dataset.cameraX=String(cameraOffset.x);canvas.dataset.cameraY=String(cameraOffset.y);canvas.dataset.cameraZoom=String(cameraZoom);ctx.clearRect(0,0,canvas.width,canvas.height);const grad=ctx.createLinearGradient(0,0,canvas.width,canvas.height);grad.addColorStop(0,'#090b10');grad.addColorStop(1,'#06070b');ctx.fillStyle=grad;ctx.fillRect(0,0,canvas.width,canvas.height);if(!worldData)return;drawTerrainLayer();for(const [sid,s] of Object.entries(worldData.settlements||{}))drawSettlement(sid,s);for(const [cid,c] of Object.entries(worldData.creatures||{}))if(c.alive)drawCreatureFigure(cid,c);drawParticles();}
function frame(ts){animationClock=ts;if(ts-lastFrameDraw>=33){lastFrameDraw=ts;if(observerTargetOffset){const k=reducedMotion?1:.12;cameraOffset.x+=(observerTargetOffset.x-cameraOffset.x)*k;cameraOffset.y+=(observerTargetOffset.y-cameraOffset.y)*k;if(Math.hypot(observerTargetOffset.x-cameraOffset.x,observerTargetOffset.y-cameraOffset.y)<1)observerTargetOffset=null;}if(observerMode && ts-lastObserverFocusAt>2600){focusObserverTarget();lastObserverFocusAt=ts;}drawWorld();}requestAnimationFrame(frame);}

async function openCreatureModal(cid){try{const c=await apiJson(`/api/creature/${cid}`);selectedCreatureId=cid;selectedCreatureData=c;document.getElementById('modal-name').textContent=c.name||'Unknown';document.getElementById('modal-tags').innerHTML=[c.religion_name,c.religious_role,c.occupation,c.current_goal_display].filter(Boolean).map(v=>`<span class="tag">${escapeHtml(v)}</span>`).join('');document.getElementById('modal-body').innerHTML=`<div class="section-label">Life</div><div>Age ${c.age} · ${escapeHtml(c.personality_tag||'')}</div><div class="section-label">Belief</div><div>Strength ${(Number(c.belief_strength||0)*100).toFixed(0)}% · ${escapeHtml(c.religion_name||'No named tradition')}</div><div class="section-label">Understanding</div><div>${escapeHtml(Object.entries(c.deity_interpretation||{}).map(([k,v])=>`${k}: ${v}`).join(' · ')||'No settled interpretation')}</div><div class="section-label">Memory</div>${(c.memories||[]).slice(-8).reverse().map(m=>`<div class="memory-item"><span class="tick">t${m.tick}</span> ${escapeHtml(m.description)}</div>`).join('')||'<div>No durable memories yet.</div>'}`;document.getElementById('modal-backdrop').classList.add('open');document.getElementById('creature-modal').classList.add('open');}catch(error){showNotice(`Inspection failed: ${error.message}`);}}
function closeModal(){document.getElementById('modal-backdrop').classList.remove('open');document.getElementById('creature-modal').classList.remove('open');}
function togglePanel(panel){panel.classList.toggle('collapsed');const entries=panel.querySelector('#chronicle-entries');if(entries)entries.style.display=panel.classList.contains('collapsed')?'none':'block';}
document.getElementById('modal-backdrop').addEventListener('click',closeModal);

async function saveWorld(){try{const data=await apiJson('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});showNotice(`World saved at tick ${data.tick}.`);}catch(error){showNotice(`Save failed: ${error.message}`);}}
async function loadWorld(){try{const data=await apiJson('/api/load');showNotice(`World restored from tick ${data.saved_tick}.`);await fetchWorld();await fetchPowers();}catch(error){showNotice(`Load failed: ${error.message}`);}}
async function exportWorld(){try{const data=await apiJson('/api/export');const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`tiny_gods_world_${data.tick||0}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);}catch(error){showNotice(`Export failed: ${error.message}`);}}
function importWorld(){const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.addEventListener('change',()=>{const file=input.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=async()=>{try{const payload=JSON.parse(String(reader.result));const data=await apiJson('/api/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});showNotice(`World imported at tick ${data.tick}.`);await fetchWorld();await fetchPowers();}catch(error){showNotice(`Import failed: ${error.message}`);}};reader.readAsText(file);},{once:true});input.click();}

function hidePanel(id){const panel=document.getElementById(id);if(panel)panel.style.display='none';}
async function showHistoryBrowser(){const panel=document.getElementById('history-panel'),content=document.getElementById('history-content');panel.style.display='block';content.textContent='Loading history…';try{const [chronicle,lenses]=await Promise.all([apiJson('/api/chronicle'),apiJson('/api/world_lenses')]);const people=(worldData?.historical_identities||[]).filter(x=>x.entity_type==='creature').sort((a,b)=>b.importance_score-a.importance_score).slice(0,10);content.innerHTML=`<h4>Events</h4>${chronicle.slice(-30).reverse().map(e=>`<div><b>t${e.tick}</b> ${escapeHtml(e.title||e.event_type)} — ${escapeHtml(e.description)}</div>`).join('')}<h4>People remembered</h4>${people.map(p=>`<div>${escapeHtml(p.name)} · importance ${Number(p.importance_score||0).toFixed(1)}</div>`).join('')||'<div>No named historical people yet.</div>'}<h4>Settlements</h4>${(lenses.settlements||[]).map(s=>`<div>${escapeHtml(s.name)} · ${escapeHtml(s.stage||'unknown')} · ${s.population} souls</div>`).join('')}<h4>Traditions</h4>${(lenses.religions||[]).map(r=>`<div>${escapeHtml(r.name)} · ${r.members} adherents</div>`).join('')}`;}catch(error){content.textContent=`History unavailable: ${error.message}`;}}
async function showLineageView(){const panel=document.getElementById('lineage-panel'),content=document.getElementById('lineage-content');panel.style.display='block';if(!selectedCreatureData){content.textContent='Inspect a creature first, then return here to follow their family.';return;}content.textContent='Loading lineage…';try{const data=await apiJson(`/api/lineage/${selectedCreatureData.family}`);content.innerHTML=`<h4>Family ${data.family_id}</h4><div>${(data.members||[]).map(m=>`${m.alive?'●':'○'} ${escapeHtml(m.name)} · age ${m.age}`).join('<br>')||'No known members.'}</div><h4>Known parents / ancestors</h4><div>${(data.ancestry||[]).map(a=>`${a.alive?'●':'○'} ${escapeHtml(a.name)}`).join('<br>')||'No recorded parents.'}</div><h4>Recent family events</h4><div>${(data.life_events||[]).map(e=>escapeHtml(typeof e==='string'?e:JSON.stringify(e))).join('<br>')||'No notable family events yet.'}</div>`;}catch(error){content.textContent=`Lineage unavailable: ${error.message}`;}}
async function showTheologyCompare(){const panel=document.getElementById('theology-panel'),content=document.getElementById('theology-content');panel.style.display='block';content.textContent='Comparing traditions…';try{const ids=Object.keys(worldData?.factions||{}).slice(0,8);const religions=await Promise.all(ids.map(id=>apiJson(`/api/religion/${id}`)));content.innerHTML=religions.length?religions.map(r=>`<section style="margin-bottom:14px"><b>${escapeHtml(r.name)}</b><div>${escapeHtml(r.belief_summary||'No consensus')}</div><div>Claims: ${(r.doctrine_claims||[]).map(escapeHtml).join(' · ')||'none fixed'}</div><div>Rituals: ${(r.ritual_practices||[]).map(escapeHtml).join(' · ')||'none fixed'}</div><small>${r.parent_tradition?`Descended from ${escapeHtml(r.parent_tradition)}. `:''}${r.members_alive} living adherents.</small></section>`).join(''):'<div>No organized traditions yet. Individual interpretations still differ.</div>'; }catch(error){content.textContent=`Theology unavailable: ${error.message}`;}}
function ensureStoryPanel(){let p=document.getElementById('story-panel');if(p)return p;p=document.createElement('div');p.id='story-panel';p.style.cssText='display:none;position:fixed;z-index:60;right:20px;bottom:120px;width:min(380px,88vw);max-height:60vh;overflow:auto;background:rgba(10,9,14,.95);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px 20px';p.innerHTML='<h3 style="color:var(--accent)">Living Threads</h3><div id="story-content"></div><button class="power-btn" onclick="hidePanel(\'story-panel\')">Close</button>';document.body.appendChild(p);return p;}
function showStoryThreads(){const p=ensureStoryPanel(),content=p.querySelector('#story-content');p.style.display='block';const threads=worldData?.current_story_threads||[];content.innerHTML=threads.length?threads.slice().sort((a,b)=>b.importance-a.importance).map(t=>`<article style="margin:10px 0"><b>${escapeHtml(t.description)}</b><div>${escapeHtml(t.kind)} · ${escapeHtml(t.stage)} · importance ${Number(t.importance||0).toFixed(1)}</div></article>`).join(''):'<div>No strong thread has emerged yet. Keep watching.</div>';}
function updateObserverUi(){const btn=document.getElementById('observer-btn'),status=document.getElementById('observer-status');if(btn)btn.textContent=observerMode?'Observer: ON':'Observer: OFF';if(status)status.textContent=observerMode?'Observer mode is following autonomous activity. Touch the world to take control.':'Observer mode disabled. Actions will change the world.';}
function toggleObserverMode(){observerMode=!observerMode;observerTargetOffset=null;if(observerMode)selectedPower='observe';updateObserverUi();renderPowers();}
function focusObserverTarget(){if(!worldData)return;const thread=(worldData.current_story_threads||[]).slice().sort((a,b)=>b.importance-a.importance)[0];let target=null;if(thread?.involved_settlements?.length){target=worldData.settlements?.[thread.involved_settlements[0]];}if(!target){target=Object.values(worldData.settlements||{}).sort((a,b)=>(b.population||0)-(a.population||0))[0];}if(!target){target=Object.values(worldData.creatures||{}).find(c=>c.alive);}if(target)centerCameraOn(target.x,target.y);}

function closeOnboarding(){localStorage.setItem('tiny-gods-onboarding-v1','dismissed');document.getElementById('onboarding-overlay').style.display='none';}
function reopenOnboarding(){document.getElementById('onboarding-overlay').style.display='flex';}
function setupUtilityButtons(){const toolbar=document.getElementById('observer-btn')?.parentElement;if(toolbar&&!document.getElementById('story-btn')){const story=document.createElement('button');story.id='story-btn';story.className='power-btn';story.textContent='Stories';story.addEventListener('click',showStoryThreads);toolbar.insertBefore(story,document.getElementById('observer-btn'));const help=document.createElement('button');help.className='power-btn';help.textContent='Help';help.addEventListener('click',reopenOnboarding);toolbar.appendChild(help);}if(localStorage.getItem('tiny-gods-onboarding-v1')==='dismissed')document.getElementById('onboarding-overlay').style.display='none';}

reducedMotionQuery.addEventListener?.('change', e => { reducedMotion=e.matches; particles.splice(0,particles.length); });
document.addEventListener('keydown', e => {ensureAudioFromGesture();if(e.key==='Escape'){closeModal();['history-panel','lineage-panel','theology-panel','story-panel'].forEach(hidePanel);}const idx=Number(e.key)-1;if(idx>=0&&idx<powerDefinitions.length)selectPower(powerDefinitions[idx].kind);});
setupUtilityButtons();
if (window.matchMedia('(max-width: 600px)').matches) {
  const chronicle = document.getElementById('chronicle-panel');
  const entries = document.getElementById('chronicle-entries');
  if (chronicle) chronicle.classList.add('collapsed');
  if (entries) entries.style.display = 'none';
}
fetchWorld(); fetchPowers();
setInterval(fetchWorld, 750); setInterval(fetchPowers, 2000);
requestAnimationFrame(frame);

// Export globals used by existing inline onclick attributes.
Object.assign(window,{togglePanel,closeModal,saveWorld,loadWorld,exportWorld,importWorld,showHistoryBrowser,showLineageView,showTheologyCompare,toggleObserverMode,hidePanel,closeOnboarding,reopenOnboarding,showStoryThreads});
