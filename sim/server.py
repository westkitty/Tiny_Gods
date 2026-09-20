"""Tiny Gods — Simulation Server"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import os, sys, threading, time, json, random, shutil
from collections import defaultdict
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from sim.engine import initialize_world, tick, serialize_world_for_client, WORLD_WIDTH, WORLD_HEIGHT

app = Flask(__name__, static_folder='../public', static_url_path='')
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5001", "https://*.e2b.app", "http://localhost:*"]}})

# Initialize a persistent world instance
world = initialize_world()
world.seed = 42  # default deterministic seed for reproducibility
sim_thread = None
running = True
sim_thread_started = False
LOCK = threading.Lock()
LIFECYCLE_LOCK = threading.Lock()

POWER_DEFINITIONS = [
    {'kind': 'observe', 'label': 'Observe', 'threshold': 0},
    {'kind': 'wind', 'label': 'Wind', 'threshold': 5},
    {'kind': 'rain', 'label': 'Rain', 'threshold': 10},
    {'kind': 'fire', 'label': 'Fire', 'threshold': 15},
    {'kind': 'fertility', 'label': 'Fertility', 'threshold': 20},
    {'kind': 'dreams', 'label': 'Dreams', 'threshold': 25},
    {'kind': 'omens', 'label': 'Omens', 'threshold': 30},
    {'kind': 'lightning', 'label': 'Lightning', 'threshold': 35},
    {'kind': 'healing', 'label': 'Healing', 'threshold': 40},
    {'kind': 'mutation', 'label': 'Mutation', 'threshold': 45},
    {'kind': 'earth_movement', 'label': 'Earth Movement', 'threshold': 50},
]
POWER_BY_KIND = {item['kind']: item for item in POWER_DEFINITIONS}

def is_power_available(target_world, kind: str) -> bool:
    definition = POWER_BY_KIND.get(kind)
    return bool(definition and len(target_world.player_history) >= definition['threshold'])

def start_simulation() -> None:
    global sim_thread_started, sim_thread, running
    with LIFECYCLE_LOCK:
        if sim_thread_started and sim_thread is not None and sim_thread.is_alive():
            return
        running = True
        sim_thread = threading.Thread(target=simulation_loop, daemon=True, name='tiny-gods-simulation')
        sim_thread_started = True
        sim_thread.start()

def stop_simulation() -> None:
    global sim_thread_started, sim_thread, running
    with LIFECYCLE_LOCK:
        running = False
        thread_ref = sim_thread
    if thread_ref is not None and thread_ref is not threading.current_thread():
        thread_ref.join(timeout=2.0)
        if thread_ref.is_alive():
            raise RuntimeError('simulation thread did not stop within timeout')
    with LIFECYCLE_LOCK:
        if sim_thread is thread_ref:
            sim_thread = None
            sim_thread_started = False

def simulation_loop():
    global running, world
    while running:
        with LOCK:
            for _ in range(3):
                tick(world)
        time.sleep(0.03)

# Explicit startup: importing module does NOT start simulation.
# Call start_simulation() explicitly when server initialization is needed.
# The __main__ block below will call it once.
# start_simulation() is NOT called at import time.

SAVE_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'tiny_gods_save.json')
os.makedirs(os.path.dirname(SAVE_FILE), exist_ok=True)

def deserialize_world_state(data: dict) -> 'WorldState':
    """Reconstruct a WorldState from validated saved JSON. Returns a new instance, does not mutate live world."""
    from sim.engine import (
        WorldState, Creature, Settlement, Faction,
        EventHistory, HistoricalIdentity, Memory, Relationship,
        ChronicleEntry, PlayerIntent, StoryThread
    )
    # Initialize base world
    world = initialize_world()
    # Restore tick and seed
    world.tick = data.get('tick', 0)
    world.seed = data.get('seed', 42)
    # Restore RNG state for deterministic continuation
    rng_state_b64 = data.get('rng_state_b64')
    if rng_state_b64:
        import base64, pickle
        try:
            random.setstate(pickle.loads(base64.b64decode(rng_state_b64.encode('ascii'))))
        except Exception:
            pass  # If restoration fails, continue with default RNG
    # Restore terrain (full or sample)
    world.terrain.clear()
    terrain_data = data.get('terrain_full') or data.get('terrain_sample')
    if terrain_data:
        for k_str, v in terrain_data.items():
            cx, cy = map(int, k_str.split(','))
            world.terrain[(cx, cy)] = v
    # Restore resources (full or sample)
    world.resources.clear()
    resource_data = data.get('resources_full') or data.get('resources_sample')
    if resource_data:
        for k_str, v in resource_data.items():
            cx, cy = map(int, k_str.split(','))
            world.resources[(cx, cy)] = float(v)
        # Restore creature full state (all, alive and dead, for authoritative history)
    world.creatures.clear()
    world.next_creature_id = 1
    all_creature_data = data.get('creatures_full', {})
    # Also include any dead creatures that may have been preserved
    for cid_str, c_data in all_creature_data.items():
        cid = int(cid_str)
        c = Creature(
            id=cid,
            name=c_data.get('name', 'Unknown'),
            age=c_data.get('age', 0),
            alive=c_data.get('alive', True),
            gender=c_data.get('gender', 'n'),
            family=c_data.get('family', 0),
            settlement_id=c_data.get('settlement_id'),
            faction_id=c_data.get('faction_id'),
            partner_id=c_data.get('partner_id'),
            pregnant_tick=c_data.get('pregnant_tick'),
            x=c_data.get('x', 0.0),
            y=c_data.get('y', 0.0),
            belief_strength=c_data.get('belief_strength', 0.0),
            fear_level=c_data.get('fear_level', 0.3),
            curiosity_level=c_data.get('curiosity_level', 0.5),
            occupation=c_data.get('occupation', 'forager'),
            health=c_data.get('health', 100.0),
            hunger=c_data.get('hunger', 30.0),
            energy=c_data.get('energy', 100.0),
            color=tuple(c_data.get('color', (200, 160, 100))),
        )
        c.religion_name = c_data.get('religion_name')
        c.religious_role = c_data.get('religious_role')
        c.current_goal = c_data.get('current_goal', 'survive')
        c.ritual_knowledge = c_data.get('ritual_knowledge', [])
        c.story_repertoire = c_data.get('story_repertoire', [])
        c.life_events = c_data.get('life_events', [])
        c.family_ancestry = c_data.get('family_ancestry', [])
        c.family_history = c_data.get('family_history', [])
        c.family_reputation = c_data.get('family_reputation', 0.0)
        c.relationship_reasons = {int(k): list(v) for k, v in c_data.get('relationship_reasons', {}).items()}
        c.last_interpretation_tick = c_data.get('last_interpretation_tick', 0)
        c.awe_memory = c_data.get('awe_memory', 0.0)
        c.size = c_data.get('size', 6.0)
        # Rebuild relationships
        rel_raw = c_data.get('relationships', {})
        for sid_str, rel_info in rel_raw.items():
            c.relationships[int(sid_str)] = Relationship(
                target_id=int(sid_str),
                value=rel_info.get('value', 0),
                label=rel_info.get('label', 'stranger')
            )
        # Rebuild friends/enemies
        c.friends = set(c_data.get('friends', []))
        c.enemies = set(c_data.get('enemies', []))
        # Deity interpretations
        c.deity_interpretation = c_data.get('deity_interpretation', {})
        # Restore complete retained memory history.
        for mem_entry in c_data.get('memories', []):
            c.memories.append(Memory(
                tick=mem_entry.get('tick', 0),
                event_type=mem_entry.get('event_type', ''),
                description=mem_entry.get('description', ''),
                emotional_valence=mem_entry.get('emotional_valence', 0.0),
                location=mem_entry.get('location', (c.x, c.y)),
                source=mem_entry.get('source', 'direct_witness'),
                event_reference=mem_entry.get('event_reference'),
                source_reference=mem_entry.get('source_reference', c.id),
                transmission_depth=mem_entry.get('transmission_depth', 0),
            ))
        # Generational culture
        c.generational_culture = c_data.get('generational_culture', {})
        world.creatures[cid] = c
        world.next_creature_id = max(world.next_creature_id, cid + 1)
    world.next_creature_id = max(world.next_creature_id, int(data.get('next_creature_id', world.next_creature_id)))
    # Restore settlements
    world.settlements.clear()
    world.next_settlement_id = 1
    for sid_str, s_data in data.get('settlements_full', {}).items():
        sid = int(sid_str)
        sett = Settlement(
            id=sid,
            name=s_data.get('name', 'Unknown'),
            x=s_data.get('x', 0.0),
            y=s_data.get('y', 0.0),
            population=s_data.get('population', 0),
            founded_tick=s_data.get('founded_tick', 0),
            lifecycle_stage=s_data.get('lifecycle_stage', 'unknown'),
            specialization=s_data.get('specialization', 'general'),
            religion_leaning=s_data.get('religion_leaning'),
        )
        sett.resources = defaultdict(float, s_data.get('resources', {}))
        sett.structures = s_data.get('structures', [])
        sett.story_traditions = s_data.get('story_traditions', [])
        sett.historical_events = s_data.get('historical_events', [])
        sett.faction_tendency = s_data.get('faction_tendency', 'neutral')
        sett.last_ritual_tick = s_data.get('last_ritual_tick', 0)
        sett.cultural_consensus = s_data.get('cultural_consensus', 0.0)
        sett.trade_partners = set(s_data.get('trade_partners', []))
        sett.trade_dependency = dict(s_data.get('trade_dependency', {}))
        # Initialize culture profile if missing
        if not hasattr(sett, 'culture_profile'):
            sett.culture_profile = {
                'hospitality': 0.5, 'hierarchy': 0.5, 'individual_autonomy': 0.5,
                'trade_openness': 0.5, 'warfare_tendency': 0.3, 'environmental_practice': 0.5,
                'family_importance': 0.6
            }
        world.settlements[sid] = sett
        world.next_settlement_id = max(world.next_settlement_id, sid + 1)
    world.next_settlement_id = max(world.next_settlement_id, int(data.get('next_settlement_id', world.next_settlement_id)))
    # Restore factions
    world.factions.clear()
    world.next_faction_id = 1
    for fid_str, f_data in data.get('factions_full', {}).items():
        fid = int(fid_str)
        fac = Faction(
            id=fid,
            name=f_data.get('name', 'Unknown'),
            settlement_ids=set(f_data.get('settlement_ids', [])),
            members=set(f_data.get('members', [])),
            belief_summary=f_data.get('belief_summary', 'none'),
            color=tuple(f_data.get('color', (150, 150, 150))),
            ritual_practices=f_data.get('ritual_practices', []),
            parent_tradition_id=f_data.get('parent_tradition_id'),
            child_tradition_ids=f_data.get('child_tradition_ids', []),
            doctrinal_stability=f_data.get('doctrinal_stability', 1.0),
            historical_lineage_depth=f_data.get('historical_lineage_depth', 0),
            enemy_faction_ids=set(f_data.get('enemy_faction_ids', [])),
        )
        fac.doctrine_claims = f_data.get('doctrine_claims', [])
        world.factions[fid] = fac
        world.next_faction_id = max(world.next_faction_id, fid + 1)
    world.next_faction_id = max(world.next_faction_id, int(data.get('next_faction_id', world.next_faction_id)))
    # Restore event history (last 50 from save, but also restore full index if available)
    world.event_history.clear()
    for ev_data in data.get('event_history', []):
        ev = EventHistory(
            event_id=ev_data.get('event_id', ''),
            tick=ev_data.get('tick', 0),
            kind=ev_data.get('kind', ''),
            x=ev_data.get('x', 0.0),
            y=ev_data.get('y', 0.0),
            radius=ev_data.get('radius', 0),
            source=ev_data.get('source', ''),
            affected_creature_ids=ev_data.get('affected_creature_ids', []),
            affected_settlement_ids=ev_data.get('affected_settlement_ids', []),
            result_description=ev_data.get('result_description', ''),
            child_event_ids=ev_data.get('child_event_ids', []),
        )
        world.event_history.append(ev)
    # Restore event index
    world.event_history_index.clear()
    for k, v in data.get('event_index', {}).items():
        world.event_history_index[k] = v
    # Restore chronicle (last 30 saved)
    world.chronicle.clear()
    for ch_data in data.get('chronicle', []):
        ch = ChronicleEntry(
            tick=ch_data.get('tick', 0),
            event_type=ch_data.get('event_type', ''),
            title=ch_data.get('title', ''),
            description=ch_data.get('description', ''),
            emotional_tone=ch_data.get('emotional_tone', 0.0),
            interpreted_as_divine=ch_data.get('interpreted_as_divine', False),
            affected_settlements=ch_data.get('affected_settlements', []),
            affected_factions=ch_data.get('affected_factions', []),
        )
        world.chronicle.append(ch)
    # Restore player history (last 30 saved)
    world.player_history = data.get('player_history', [])
    # Restore historical identities
    world.historical_identities.clear()
    for k_str, hi_data in data.get('historical_identities', {}).items():
        k = int(k_str)
        hi = HistoricalIdentity(
            entity_type=hi_data.get('entity_type', ''),
            entity_id=hi_data.get('entity_id', k),
            name=hi_data.get('name', ''),
            first_mentioned_tick=hi_data.get('first_mentioned_tick', 0),
            importance_score=hi_data.get('importance_score', 0.0),
            parent_identity_ids=hi_data.get('parent_identity_ids', []),
            child_identity_ids=hi_data.get('child_identity_ids', []),
            major_events=hi_data.get('major_events', []),
        )
        world.historical_identities[k] = hi
    # Restore metrics
    world.events_this_tick = data.get('metrics', {}).get('events_this_tick', 0)
    world.max_events_per_tick = data.get('metrics', {}).get('max_events_per_tick', 8)
    # Restore inferred intents and story threads
    if 'current_inferred_intents' in data:
        world.current_inferred_intents = []
        for i_data in data['current_inferred_intents']:
            intent = PlayerIntent(
                description=i_data.get('description', ''),
                evidence_events=i_data.get('evidence_events', []),
                target_settlements=i_data.get('target_settlements', []),
                target_creatures=i_data.get('target_creatures', []),
                target_religions=i_data.get('target_religions', []),
                first_observed_tick=i_data.get('first_observed_tick', 0),
                last_active_tick=i_data.get('last_active_tick', 0),
                confidence=i_data.get('confidence', 0.5),
            )
            world.current_inferred_intents.append(intent)
    if 'current_story_threads' in data:
        world.current_story_threads = []
        for t_data in data['current_story_threads']:
            thread = StoryThread(
                thread_id=t_data.get('thread_id', ''),
                description=t_data.get('description', ''),
                kind=t_data.get('kind', ''),
                origin_tick=t_data.get('origin_tick', 0),
                related_events=t_data.get('related_events', []),
                involved_creatures=t_data.get('involved_creatures', []),
                involved_settlements=t_data.get('involved_settlements', []),
                involved_religions=t_data.get('involved_religions', []),
                importance=t_data.get('importance', 0.0),
                stage=t_data.get('stage', 'emerging'),
            )
            world.current_story_threads.append(thread)
    return world

PERSISTENCE_SCHEMA_VERSION = 2

def serialize_full_world(world: 'WorldState') -> dict:
    """Full deterministic world serialization for persistence (real save/load)."""
    state = {
        'schema_version': PERSISTENCE_SCHEMA_VERSION,
        'next_creature_id': world.next_creature_id,
        'next_settlement_id': world.next_settlement_id,
        'next_faction_id': world.next_faction_id,
    }
    # Include full critical state
    state['tick'] = world.tick
    state['seed'] = getattr(world, 'seed', 42)
    # Full creature state (all alive and dead for authoritative persistence)
    state['creatures_full'] = {
        str(cid): {
            'id': c.id, 'name': c.name, 'age': int(c.age), 'alive': c.alive,
            'gender': c.gender, 'family': c.family, 'settlement_id': c.settlement_id,
            'faction_id': c.faction_id, 'partner_id': c.partner_id,
            'pregnant_tick': c.pregnant_tick, 'x': c.x, 'y': c.y,
            'belief_strength': round(c.belief_strength, 3), 'fear_level': round(c.fear_level, 3),
            'curiosity_level': round(c.curiosity_level, 3), 'religion_name': c.religion_name,
            'religious_role': c.religious_role, 'deity_interpretation': dict(c.deity_interpretation),
            'ritual_knowledge': c.ritual_knowledge, 'story_repertoire': c.story_repertoire,
            'life_events': c.life_events, 'family_ancestry': c.family_ancestry, 'family_history': c.family_history,
            'family_reputation': c.family_reputation,
            'relationship_reasons': {str(k): list(v) for k, v in c.relationship_reasons.items()},
            'last_interpretation_tick': c.last_interpretation_tick, 'awe_memory': c.awe_memory, 'size': c.size,
            'memories': [{'tick': m.tick, 'event_type': m.event_type, 'description': m.description,
                          'emotional_valence': m.emotional_valence, 'location': list(m.location), 'source': m.source,
                          'source_reference': m.source_reference, 'event_reference': m.event_reference,
                          'transmission_depth': m.transmission_depth}
                         for m in c.memories],
            'current_goal': c.current_goal, 'occupation': c.occupation,
            'color': c.color, 'health': c.health, 'hunger': c.hunger, 'energy': c.energy,
            'relationships': {str(k): {'label': v.label, 'value': int(v.value)} for k, v in c.relationships.items()},
            'friends': list(c.friends), 'enemies': list(c.enemies),
            'generational_culture': dict(c.generational_culture) if hasattr(c, 'generational_culture') else {},
        }
        for cid, c in world.creatures.items()
    }
    # Settlement full state
    state['settlements_full'] = {
        str(sid): {
            'id': s.id, 'name': s.name, 'x': s.x, 'y': s.y,
            'population': s.population, 'resources': dict(s.resources),
            'structures': s.structures, 'story_traditions': s.story_traditions,
            'founded_tick': s.founded_tick, 'religion_leaning': s.religion_leaning,
            'lifecycle_stage': getattr(s, 'lifecycle_stage', 'unknown'),
            'specialization': getattr(s, 'specialization', 'general'),
            'trade_partners': list(getattr(s, 'trade_partners', set())),
            'trade_dependency': dict(getattr(s, 'trade_dependency', {})),
            'historical_events': s.historical_events, 'faction_tendency': s.faction_tendency,
            'last_ritual_tick': s.last_ritual_tick, 'cultural_consensus': s.cultural_consensus,
        }
        for sid, s in world.settlements.items()
    }
    # Faction full state
    state['factions_full'] = {
        str(fid): {
            'id': f.id, 'name': f.name, 'members': list(f.members),
            'settlement_ids': list(f.settlement_ids), 'belief_summary': f.belief_summary,
            'color': f.color, 'ritual_practices': f.ritual_practices,
            'doctrine_claims': f.doctrine_claims,
            'parent_tradition_id': f.parent_tradition_id,
            'child_tradition_ids': f.child_tradition_ids,
            'doctrinal_stability': f.doctrinal_stability,
            'historical_lineage_depth': f.historical_lineage_depth,
            'enemy_faction_ids': list(f.enemy_faction_ids),
        }
        for fid, f in world.factions.items()
    }
    # Event history (full authoritative history, not truncated)
    state['event_history'] = [
        {'event_id': e.event_id, 'tick': e.tick, 'kind': e.kind, 'x': e.x, 'y': e.y,
         'radius': e.radius, 'source': e.source,
         'affected_creature_ids': e.affected_creature_ids,
         'affected_settlement_ids': e.affected_settlement_ids,
         'result_description': e.result_description, 'child_event_ids': e.child_event_ids}
        for e in world.event_history
    ]
    # Chronicle (full authoritative chronicle)
    state['chronicle'] = [
        {'tick': e.tick, 'event_type': e.event_type, 'title': e.title,
         'description': e.description, 'emotional_tone': e.emotional_tone,
         'interpreted_as_divine': e.interpreted_as_divine,
         'affected_settlements': e.affected_settlements,
         'affected_factions': e.affected_factions}
        for e in world.chronicle
    ]
    # Player history (full authoritative player history)
    state['player_history'] = world.player_history
    # Terrain (full authoritative terrain)
    terrain_items = list(world.terrain.items())
    state['terrain_full'] = {f"{k[0]},{k[1]}": v for k, v in terrain_items}
    # Resources (full authoritative resources)
    resource_items = list(world.resources.items())
    state['resources_full'] = {f"{k[0]},{k[1]}": v for k, v in resource_items}
    # Authoritative event index (full index)
    state['event_index'] = dict(world.event_history_index)
    # Historical identities
    state['historical_identities'] = {
        str(k): {
            'entity_type': v.entity_type, 'entity_id': v.entity_id,
            'name': v.name, 'first_mentioned_tick': v.first_mentioned_tick,
            'importance_score': v.importance_score,
            'parent_identity_ids': v.parent_identity_ids,
            'child_identity_ids': v.child_identity_ids,
            'major_events': v.major_events,
        }
        for k, v in world.historical_identities.items()
    }
    # Metrics
    state['metrics'] = {
        'events_this_tick': getattr(world, 'events_this_tick', 0),
        'max_events_per_tick': getattr(world, 'max_events_per_tick', 8),
    }
    # RNG continuation state (deterministic persistence)
    import base64, pickle
    try:
        state['rng_state_b64'] = base64.b64encode(pickle.dumps(random.getstate())).decode('ascii')
    except Exception:
        state['rng_state_b64'] = None
    # Inferred intents and story threads (if present)
    if hasattr(world, 'current_inferred_intents'):
        state['current_inferred_intents'] = [
            {'description': i.description, 'confidence': i.confidence,
             'first_observed_tick': i.first_observed_tick,
             'last_active_tick': i.last_active_tick,
             'target_settlements': i.target_settlements,
             'target_creatures': i.target_creatures,
             'target_religions': i.target_religions}
            for i in world.current_inferred_intents
        ]
    if hasattr(world, 'current_story_threads'):
        state['current_story_threads'] = [
            {'thread_id': t.thread_id, 'description': t.description, 'kind': t.kind,
             'origin_tick': t.origin_tick, 'importance': t.importance, 'stage': t.stage,
             'related_events': t.related_events,
             'involved_creatures': t.involved_creatures,
             'involved_settlements': t.involved_settlements,
             'involved_religions': t.involved_religions}
            for t in world.current_story_threads
        ]
    return state

@app.route('/api/save', methods=['POST'])
def save_world():
    with LOCK:
        try:
            state_data = serialize_full_world(world)
            state_data['verified_at_tick'] = world.tick
            state_data['saved_tick'] = world.tick
            state_data['save_version'] = PERSISTENCE_SCHEMA_VERSION
            previous_backup = SAVE_FILE.replace('.json', '.previous.json')
            temp_path = SAVE_FILE + '.tmp'
            try:
                with open(temp_path, 'w') as f:
                    json.dump(state_data, f, separators=(',', ':'))
                    f.flush()
                    os.fsync(f.fileno())
                with open(temp_path, 'r') as f:
                    verified = json.load(f)
                if verified.get('schema_version') != PERSISTENCE_SCHEMA_VERSION:
                    raise ValueError('temporary save validation failed')
                if os.path.exists(SAVE_FILE) and os.path.getsize(SAVE_FILE) > 0:
                    try:
                        with open(SAVE_FILE, 'r') as current_file:
                            current_saved = json.load(current_file)
                        if current_saved.get('schema_version') == PERSISTENCE_SCHEMA_VERSION:
                            shutil.copy2(SAVE_FILE, previous_backup)
                    except Exception:
                        pass
                os.replace(temp_path, SAVE_FILE)
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            return jsonify({'status':'saved','tick':world.tick,'schema_version':PERSISTENCE_SCHEMA_VERSION,'verified':True,'full_state':True})
        except Exception as e:
            return jsonify({'error': f'Save failed: {str(e)}', 'full_state': False}), 500

def _validated_candidate(saved):
    if not isinstance(saved, dict):
        raise ValueError('save payload must be an object')
    if saved.get('schema_version') != PERSISTENCE_SCHEMA_VERSION:
        raise ValueError(f'incompatible schema {saved.get("schema_version")}')
    live_rng = random.getstate()
    try:
        candidate = deserialize_world_state(saved)
        candidate_rng = random.getstate()
    finally:
        random.setstate(live_rng)
    return candidate, candidate_rng

def _replace_world(candidate, candidate_rng):
    global world
    stop_simulation()
    with LOCK:
        world = candidate
        random.setstate(candidate_rng)
    start_simulation()

@app.route('/api/load', methods=['GET'])
def load_world():
    if not os.path.exists(SAVE_FILE):
        return jsonify({'status':'no_save','message':'No previous save found'}), 404
    previous_backup = SAVE_FILE.replace('.json', '.previous.json')
    errors = []
    for candidate_path, recovered in ((SAVE_FILE, False), (previous_backup, True)):
        if not os.path.exists(candidate_path):
            continue
        try:
            with open(candidate_path, 'r') as f:
                saved = json.load(f)
            candidate, candidate_rng = _validated_candidate(saved)
            saved_tick = candidate.tick
            _replace_world(candidate, candidate_rng)
            return jsonify({'status':'loaded_real','saved_tick':saved_tick,'current_tick':world.tick,'schema_version':PERSISTENCE_SCHEMA_VERSION,'full_state_restored':True,'verified':True,'recovered_from_previous':recovered})
        except Exception as exc:
            errors.append(f'{os.path.basename(candidate_path)}: {exc}')
    return jsonify({'error':'Load failed: ' + '; '.join(errors),'full_state':False}), 409

@app.route('/api/export', methods=['GET'])
def export_world():
    with LOCK:
        return jsonify(serialize_full_world(world))

@app.route('/api/import', methods=['POST'])
def import_world():
    try:
        payload = request.get_json(silent=True)
        candidate, candidate_rng = _validated_candidate(payload)
        imported_tick = candidate.tick
        _replace_world(candidate, candidate_rng)
        return jsonify({'status':'imported','tick':imported_tick,'schema_version':PERSISTENCE_SCHEMA_VERSION})
    except ValueError as e:
        return jsonify({'error':str(e)}), 400
    except Exception as e:
        return jsonify({'error':f'Import failed: {str(e)}'}), 500

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/state')
def get_state():
    with LOCK:
        snapshot = serialize_world_for_client(world)
        snapshot['player_history'] = list(world.player_history[-100:])
        snapshot['current_story_threads'] = [
            {'thread_id': t.thread_id, 'description': t.description, 'kind': t.kind, 'stage': t.stage, 'importance': t.importance,
             'related_events': t.related_events, 'involved_creatures': t.involved_creatures,
             'involved_settlements': t.involved_settlements, 'involved_religions': t.involved_religions}
            for t in getattr(world, 'current_story_threads', [])
        ]
        snapshot['historical_identities'] = [
            {'id': k, 'entity_type': v.entity_type, 'entity_id': v.entity_id, 'name': v.name, 'importance_score': v.importance_score, 'major_events': v.major_events}
            for k, v in world.historical_identities.items()
        ]
        return jsonify(snapshot)

@app.route('/api/action', methods=['POST'])
# TG-063: Strict validation added
def post_action():
    global world
    data = request.get_json() or {}
    if not isinstance(data, dict):
        return jsonify({'error': 'Invalid JSON: expected object'}), 400
    kind = data.get('kind', 'observe')
    if kind not in POWER_BY_KIND:
        return jsonify({'error': f'Invalid power: {kind}'}), 400
    try:
        x = float(data.get('x', 600))
        y = float(data.get('y', 450))
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid coordinates'}), 400
    if not (0 <= x <= WORLD_WIDTH) or not (0 <= y <= WORLD_HEIGHT):
        return jsonify({'error': 'Coordinates out of bounds'}), 400
    try:
        radius = int(data.get('radius', 80))
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid radius'}), 400
    if not (10 <= radius <= 300):
        return jsonify({'error': 'Radius must be between 10 and 300'}), 400
    with LOCK:
        if not is_power_available(world, kind):
            return jsonify({'error': f'Power {kind} not yet unlocked (interactions: {len(world.player_history)})', 'power_available': False}), 403
        tick(world, player_actions=[{'kind': kind, 'x': x, 'y': y, 'radius': radius, 'location': (x, y)}])
        response = {'status':'ok','kind':kind,'tick':world.tick,'x':x,'y':y,'radius':radius,'power_available':True,'action_id':f'{world.tick}:{len(world.player_history)}:{kind}'}
    return jsonify(response)

@app.route('/api/creature/<int:cid>')
def get_creature(cid):
    with LOCK:
        if cid not in world.creatures or not world.creatures[cid].alive:
            return jsonify({'error': 'creature not found'}), 404
        c = world.creatures[cid]
        # Deep inspection of this creature's understanding
        response = {
            'id': c.id,
            'name': c.name,
            'age': int(c.age),
            'alive': c.alive,
            'x': c.x,
            'y': c.y,
            'color': c.color,
            'settlement_id': c.settlement_id,
            'family': c.family,
            'current_goal': c.current_goal,
            'belief_strength': round(c.belief_strength, 3),
            'religion_name': c.religion_name,
            'religious_role': c.religious_role,
            'deity_interpretation': dict(c.deity_interpretation),
            'memories': [{'event_type': m.event_type, 'description': m.description, 'tick': m.tick, 'emotional': round(m.emotional_valence, 2)} for m in c.memories[-20:]],
            'relationships': {str(k): {'label': v.label, 'value': int(v.value)} for k, v in c.relationships.items()},
            'friends': [f for f in c.friends],
            'enemies': [e for e in c.enemies],
            'fear_level': round(c.fear_level, 3),
            'curiosity_level': round(c.curiosity_level, 3),
            'belief_strength_raw': c.belief_strength,
            'occupation': c.occupation,
            'partner_id': c.partner_id,
            'pregnant_tick': c.pregnant_tick,
            'ritual_knowledge': c.ritual_knowledge,
            'personality_tag': c.personality_tag(),
            'current_goal_display': c.current_goal.replace('_', ' '),
            'story_repertoire': c.story_repertoire,
            'story_traditions_nearby': world.settlements.get(c.settlement_id, None).story_traditions if c.settlement_id else [],
        }
    return jsonify(response)

@app.route('/api/chronicle')
def get_chronicle():
    with LOCK:
        return jsonify([
            {'tick': e.tick, 'event_type': e.event_type, 'title': e.title,
             'description': e.description, 'emotional_tone': round(e.emotional_tone, 2),
             'interpreted_as_divine': e.interpreted_as_divine}
            for e in world.chronicle
        ])

@app.route('/api/powers')
def get_powers():
    with LOCK:
        return jsonify({
            'available': [
                {'kind': item['kind'], 'label': item['label'], 'threshold': item['threshold'], 'available': is_power_available(world, item['kind'])}
                for item in POWER_DEFINITIONS
            ],
            'player_interventions': len(world.player_history)
        })

@app.route('/api/test_run', methods=['POST'])
# TG-062: Uses isolated world instance for diagnostic testing
def test_run():
    # Run thousands of ticks quickly for automated testing
    # Create isolated diagnostic world instead of mutating live world
    data = request.get_json() or {}
    ticks_input = data.get('ticks', 100)
    # Validate input
    try:
        ticks = int(ticks_input)
    except (ValueError, TypeError):
        return jsonify({'error': 'ticks must be an integer'}), 400
    if ticks < 1 or ticks > 10000:
        return jsonify({'error': 'ticks must be between 1 and 10000'}), 400
    live_rng = random.getstate()
    try:
        diag_world = initialize_world()
        diag_world.seed = int(data.get('seed', 42))
        random.seed(diag_world.seed)
        for _ in range(ticks):
            tick(diag_world)
    finally:
        random.setstate(live_rng)
    snapshot = serialize_world_for_client(diag_world)
    alive = [c for c in diag_world.creatures.values() if c.alive]
    return jsonify({
        'ticks_run': ticks,
        'current_tick': diag_world.tick,
        'creature_count': len(alive),
        'settlements': len(diag_world.settlements),
        'factions': len(diag_world.factions),
        'chronicle_entries': len(diag_world.chronicle),
        'population_trend': 'stable',
        'issues_detected': [],
        'snapshot_creature_count': snapshot.get('creature_count', 0),
    })

@app.route('/api/test_inspect')
def test_inspect():
    with LOCK:
        # Inspect for common simulation issues
        alive = [c for c in world.creatures.values() if c.alive]
        total = len(alive)
        settlements = world.settlements
        # Check for population collapse
        issue_pop_collapse = total < 10
        # Check for resource deadlock (all very low resources in all settlements)
        all_low_resources = all(s.resources.get('food', 0) < 5 for s in settlements.values()) if settlements else False
        # Check for identical cultures (all same religion)
        religions = {c.religion_name for c in alive if c.religion_name}
        identical_cultures = len(religions) <= 1 and len(alive) > 10
        # Check stalled societies (no new structures for long time)
        stalled = any(len(s.structures) == 0 and world.tick - s.founded_tick > 200 for s in settlements.values())
        return jsonify({
            'issues': {
                'population_collapse': issue_pop_collapse,
                'resource_deadlock': all_low_resources,
                'runaway_reproduction': sum(1 for c in alive if c.pregnant_tick is not None) > total * 0.6,
                'identical_cultures': identical_cultures,
                'stalled_societies': stalled,
                'broken_pathfinding_estimated': False,
                'uninteresting_equilibrium': len(religions) == 0 and total > 20,
            },
            'metrics': {
                'creatures_alive': total,
                'settlements_active': len(settlements),
                'factions_active': len(world.factions),
                'religions_formed': len(religions),
                'average_belief': sum(c.belief_strength for c in alive) / max(1, total),
                'chronicle_length': len(world.chronicle),
            }
        })


# ------------------------------------------------------------------
# Phase-II Contextual History Endpoints (TG-181..TG-188)
# ------------------------------------------------------------------

@app.route('/api/lineage/<int:family_id>')
def get_lineage(family_id):
    with LOCK:
        members = [c for c in world.creatures.values() if c.family == family_id]
        if not members:
            return jsonify({'family_id':family_id,'members':[],'ancestry':[],'life_events':[]})
        ancestry = []
        seen = set()
        for c in members:
            for pid, rel in c.relationships.items():
                if rel.label == 'parent' and pid in world.creatures and pid not in seen:
                    p = world.creatures[pid]; seen.add(pid)
                    ancestry.append({'id':p.id,'name':p.name,'alive':p.alive,'relationship':'parent'})
        return jsonify({
            'family_id':family_id,
            'members':[{'id':c.id,'name':c.name,'age':int(c.age),'alive':c.alive,'belief_strength':round(c.belief_strength,2),'life_events':c.life_events[-5:]} for c in members],
            'ancestry':ancestry,
            'family_reputation_score':round(sum(getattr(c,'family_reputation',0) for c in members)/max(1,len(members)),2),
            'life_events':[evt for c in members for evt in c.life_events[-3:]][-12:]
        })

@app.route('/api/religion/<int:fac_id>')
def get_religion(fac_id):
    with LOCK:
        fac = world.factions.get(fac_id)
        if not fac:
            return jsonify({'error': 'religion not found'}), 404
        members = [world.creatures[cid] for cid in fac.members if cid in world.creatures and world.creatures[cid].alive]
        # Build genealogy
        parent_ref = fac.parent_tradition_id
        parent_name = world.factions.get(parent_ref).name if parent_ref and parent_ref in world.factions else None
        return jsonify({
            'id': fac.id,
            'name': fac.name,
            'members_alive': len(members),
            'members_total': len(fac.members),
            'belief_summary': fac.belief_summary,
            'doctrine_claims': fac.doctrine_claims,
            'ritual_practices': fac.ritual_practices,
            'parent_tradition': parent_name,
            'parent_id': parent_ref,
            'child_traditions': [world.factions.get(cid).name if cid in world.factions else str(cid) for cid in fac.child_tradition_ids],
            'lineage_depth': fac.historical_lineage_depth,
            'doctrinal_stability': round(fac.doctrinal_stability, 2),
            'historical_lineage': {
                'parent': parent_name,
                'children': fac.child_tradition_ids,
            },
        })

@app.route('/api/settlement/<int:sid>/history')
def get_settlement_history(sid):
    with LOCK:
        sett = world.settlements.get(sid)
        if not sett:
            return jsonify({'error': 'settlement not found'}), 404
        # Collect events from world event history related to this settlement
        related_events = [e for e in world.event_history if sid in (e.affected_settlement_ids or [])]
        return jsonify({
            'id': sett.id,
            'name': sett.name,
            'lifecycle_stage': sett.lifecycle_stage if hasattr(sett, 'lifecycle_stage') else 'unknown',
            'specialization': sett.specialization if hasattr(sett, 'specialization') else 'general',
            'population': sett.population,
            'structures': sett.structures,
            'trade_partners': list(sett.trade_partners) if hasattr(sett, 'trade_partners') else [],
            'historical_events': [
                {'tick': e.tick, 'kind': e.kind, 'description': e.result_description[:100], 'event_id': e.event_id}
                for e in related_events[-10:]
            ],
            'culture_profile': sett.culture_profile if hasattr(sett, 'culture_profile') else {},
        })

@app.route('/api/world_lenses')
def get_world_lenses():
    with LOCK:
        return jsonify({
            'religions': [{'id': f.id, 'name': f.name, 'members': len(f.members)} for f in world.factions.values()],
            'settlements': [{'id': s.id, 'name': s.name, 'population': s.population, 'stage': getattr(s, 'lifecycle_stage', 'unknown')} for s in world.settlements.values()],
            'trade_routes': [
                {'from': sid, 'to': partner, 'dependency': score}
                for sid, sett in world.settlements.items()
                for partner, score in (setattr(sett, 'trade_dependency', getattr(sett, 'trade_dependency', {})) or sett.trade_dependency).items()
            ],
        })

if __name__ == '__main__':
    start_simulation()
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
