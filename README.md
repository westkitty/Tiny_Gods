# TINY GODS

A polished emergent sandbox simulation. You are not their king. You are something they slowly decide might be a god.

## Play
NOTE: The frontend relies on `/api/*` endpoints, so opening `public/index.html` directly will not fully work. Use the server instead, or open the live preview URL. To play locally, run the server and visit `http://localhost:5001`.

```bash
pip install -r requirements.txt
python sim/server.py
```

Then visit `http://localhost:5001` (or the live preview at https://5001-ibbmmdn9o02pk8at7071b.e2b.app).

## Core Systems

### Autonomous Creatures
Every creature has persistent traits:
- name, age, family, friends, enemies
- fear, curiosity, belief, occupation
- memories of major events
- relationship values
- current goal

They autonomously:
- gather, build, trade, fight, love
- form families, explore, tell stories
- create rituals, establish settlements
- split into factions, remember disasters
- interpret coincidences

### Player Powers
Initially minimal. Over time you gain:
wind, rain, fire, fertility, dreams, omens, lightning, healing, mutation, earth movement

The critical mechanic: **creatures interpret what you do.**

- Lightning repeatedly strikes criminals → religion of divine punishment forms
- Constantly saving one bloodline → they declare themselves chosen
- Causing disasters → civilizations build temples to appease you
- Never intervening → some societies become atheistic
- Different communities develop contradictory religions from the exact same events

### Chronicle
History recorded from the creatures' imperfect, biased, contradictory perspective.

### Inspection
Click any creature to see their personal understanding of their world — their memories, interpretations, relationships, and beliefs.

## Testing
```bash
python tests/test_simulation.py
```
Runs rapid advances (2000 ticks), multiple civilizations across seeds, long-term equilibrium, player impact analysis, and automated inspection for:
- population collapse
- resource deadlocks
- runaway reproduction
- identical cultures
- stalled societies
- uninteresting equilibrium

## Assets
Generated procedural images in `/assets/` for visual atmosphere.
