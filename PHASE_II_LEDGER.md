# Phase II Implementation Ledger — Tiny Gods (TG-101 through TG-200)

PHASE_II_START_SHA: 8fe604a446ea1f028e98cffef80aa6877d2322fe
FINAL_SHA: (to be filled after commit)
BRANCH: arena/01a0bb23-tiny-gods

========================================================================
CATEGORY 1: INDIVIDUAL MINDS, RELATIONSHIPS, FAMILIES & LIFE HISTORIES (25)
==========================================================================

TG-101: Durable event identity system — every major simulation event receives a persistent UUID-style identifier (format: evt_{tick}_{hash}) so later history can reference the exact same event unambiguously.
TG-102: Authoritative ground-truth event history table (EventHistory) stored separately from interpreted chronicle; contains exact kind, tick, coordinates, affected entities, player action link.
TG-103: Interpreted history divergence tracking — each creature's interpretation stored with reference to the ground-truth event ID they are interpreting.
TG-104: Memory provenance — each Memory gets source field (direct_witness, told_by_{id}, tradition, inferred, invented) so descendants can see how knowledge arrived.
TG-105: Generational cultural transmission — children inherit a subset of parents' ritual_knowledge, story_repertoire, and deity_interpretation with mutation rate based on parent belief divergence.
TG-106: Family lineage tracking — ancestry list built from parent/child relationships; descendants reference ancestors in memories; family reputation accumulates from notable events.
TG-107: Family reputation mechanism — families accumulate reputation score from events (births, deaths, rituals, conflicts); affects children's initial social standing.
TG-108: Family feuds and alliances preserved across generations — enemy/ally relationships inherited with decay; descendants remember why families conflict.
TG-109: Historical individual importance scoring — creatures accumulate importance from events witnessed, rituals led, settlements founded, conflicts survived; top historical actors preserved in archive.
TG-110: Important historical actors preserved after death — when a high-importance creature dies, their identity, major events, and interpretations archived; descendants can reference them.
TG-111: Life event tracking per creature — structured life timeline (birth, partnerships, births of children, deaths witnessed, rituals led, migrations, conflicts) accessible via inspection.
TG-112: Deep relationship history — relationships store reason references (memory event IDs that created/changed them) so inspection shows "I trust her because she saved my child (evt_...)".
TG-113: Relationship inheritance — children inherit positive relationships with parents' allies and negative with enemies, with mutation based on personal experience.
TG-114: Personality dimensions expanded — curiosity, fear, sociability, skepticism, conformity, ambition, empathy, aggression, loyalty, openness to novelty, tradition preference, risk tolerance all tracked and influence behavior.
TG-115: Personality influence on interpretation — personality modifies interpretation weights for events (e.g., high empathy -> benevolent interpretation; high aggression -> hostile interpretation).
TG-116: Generational drift of culture — children's culture derived as weighted blend of parents + settlement consensus + random mutation; creates divergence over generations.
TG-117: Family stories preserved — families accumulate story_repertoire with provenance tracking; descendants tell stories about ancestors rather than generic tales.
TG-118: Descendant memory of ancestors — when a child is born, they receive a compressed memory of parents' significant events (not full details) via cultural transmission.
TG-119: Lineage-based belief divergence — members of same family develop divergent beliefs over generations; family meetings can resolve or deepen schisms.
TG-120: Family migration tracking — families that migrate together retain shared identity; dispersed family members maintain reference to common origin settlement and traditions.
TG-121: Generational change in occupation inheritance — children don't automatically inherit occupation; they choose based on personality, family reputation, and settlement needs.
TG-122: Elder wisdom transmission — elders teach younger creatures, transferring belief and cultural knowledge with mutation based on elder's personality.
TG-123: Child development stages — children progress through stages (infant, learner, adolescent, adult) with changing behavior patterns and belief formation.
TG-124: Life cycle milestones recorded in chronicle — major personal milestones (first ritual, leadership, parenthood, elder status) create chronicle entries linked to the individual.
TG-125: Descendant culture divergence measurement — metric tracking how much descendant cultures differ from ancestor cultures based on belief, ritual, and tradition differences.

========================================================================
CATEGORY 2: KNOWLEDGE, RUMOR, CULTURE, RELIGION & HISTORICAL MEMORY (20)
==========================================================================

TG-126: Knowledge provenance tracking (expanded from TG-104) — every belief, ritual, and interpretation has structured provenance with source event ID, transmission count, and mutation depth.
TG-127: Rumor mutation system (expanded) — when stories propagate, structured semantic fields (hero, villain, cause, effect, divine agent) can change deterministically based on listener personality and settlement culture.
TG-128: Rumor provenance chain — rumors track full propagation chain from original event through each transmitter; mutations accumulate deterministically.
TG-129: Contradictory accounts preserved — multiple interpretations of the same event stored without collapsing to consensus; societies maintain contradictory traditions simultaneously.
TG-130: Cultural divergence metric — quantitative measure of how different two settlements' traditions, rituals, and beliefs have become over time.
TG-131: Non-religious culture system — culture claims separate from religion: hospitality norms, attitudes toward outsiders, vengeance, charity, hierarchy, communal ownership, individual autonomy, trade, warfare, art, burial.
TG-132: Cultural claims composed from values — settlements build cultural profiles from value weights; values influence behavior independently of religious belief.
TG-133: Culture mutation on migration — migrating groups blend origin and destination culture; over generations, diaspora cultures diverge from both.
TG-134: Tradition extinction mechanism — traditions with too few practitioners and no institutional support gradually fade; can be revived through rediscovery or descendants.
TG-135: Tradition revival mechanism — mostly extinct traditions can return if descendants find records, visit sacred places, or experience coincidental events matching the tradition.
TG-136: Religion genealogy tree — religions have parent tradition, children traditions (schisms/reforms), siblings; historical lineage preserved in world data.
TG-137: Religious schism mechanics (expanded) — conditions include doctrinal divergence > threshold, leadership challenge, settlement split, ritual practice divergence; produces new religion with parent reference.
TG-138: Religious reform mechanics — traditions can deliberately change doctrine (reform) with conditions: influential leader, crisis event, institutional support; creates child tradition with parent reference.
TG-139: Syncretism mechanics — when multiple rituals coexist in settlement, they can merge into new tradition combining elements; creates new religion with multiple parents.
TG-140: Doctrine tracking per religion — structured doctrine claims (beliefs about specific events, moral expectations, divine identity) tracked separately from rituals; diverges over time.
TG-141: Religious revival mechanism (expanded from TG-135) — extinct traditions can be rediscovered through records, descendants, or coincidence; new practitioners adopt with modified interpretation.
TG-142: Sacred object/relic provenance — significant objects (if added) accumulate history of events, owners, and interpretations; objects become culturally significant through events, not assignment.
TG-143: Religious role genealogy — roles like priest, prophet, elder tracked with history; successors inherit some authority; role lineage preserved in institution.
TG-144: Historical reinterpretation over generations — same event interpreted differently by successive generations; reinterpretation events recorded as new interpretations with parent references.
TG-145: False evidence preservation — coincidental events that reinforce false beliefs preserved in history; later generations can discover contradictions but often rationalize them.

========================================================================
CATEGORY 3: SETTLEMENTS, INSTITUTIONS, ECONOMICS & POLITICAL BEHAVIOR (15)
==========================================================================

TG-146: Settlement life cycle system — settlements grow, specialize, stagnate, decline, split, abandon, or merge; life cycle stage affects behavior and historical importance.
TG-147: Settlement specialization based on geography and history — agricultural (plains/river), trading (near routes), defensive (mountain), religious (sacred sites), artisanal (resources), exploratory (frontier).
TG-148: Settlement founding as historical event — founding requires leaders, resources, and motivation; produces chronicle entry, family associations, and settlement identity.
TG-149: Settlement abandonment — settlements can be abandoned due to famine, war, migration, or decline; ruins remain with cultural significance; descendants may return.
TG-150: Settlement splitting — large settlements with divergent cultures or leadership conflicts can split; produces new settlement with shared ancestry.
TG-151: Settlement merging — neighboring settlements with shared culture and trade can merge; produces new settlement combining traditions.
TG-152: Settlement founding colonies — successful settlements may found colonies; colonists carry origin culture with mutation; colonial identity diverges over generations.
TG-153: Trade routes between settlements — settlements exchange resources; routes tracked with dependency metrics; route disruption creates economic and social consequences.
TG-154: Trade dependency tracking — settlements that rely heavily on one trade partner become vulnerable; dependency affects political alignment and migration.
TG-155: Trade route disruption consequences — when trade routes break (war, disaster, migration), affected settlements experience resource stress and may develop new alliances or conflicts.
TG-156: Settlement economics causal — resource production, consumption, and trade affect settlement health, growth, specialization, conflict likelihood, and migration patterns.
TG-157: Settlement historical identity — settlements accumulate history of events, founders, conflicts, rituals, and traditions; identity affects behavior and historical importance.
TG-158: Settlement memory preservation — important settlement events preserved in settlement-level memory; descendants reference settlement history in interpretations and rituals.
TG-159: Political leadership emergence — leadership comes from reputation, age, competence, religious authority, wealth, military success, family status, coalition support; tracked with succession history.
TG-160: Leadership succession recording — leadership transitions (inheritance, election, consensus, appointment, challenge, coup, schism, collapse) create historical events; successors inherit some authority.

========================================================================
CATEGORY 4: ECOLOGY, GEOGRAPHY, RESOURCES & LONG-TERM WORLD CHANGE (10)
==========================================================================

TG-161: Persistent geographical scars — burned forests, altered rivers, battlefields, grave sites, ruined temples, rebuilt settlements, sacred groves leave persistent terrain changes with history.
TG-162: Sacred site formation from actual events — sites become sacred through miracle occurrence, prophet death, settlement survival, ritual repetition, coincidence; not pre-assigned.
TG-163: Sacred site cultural significance — sacred sites accumulate history; different cultures interpret the same site differently based on their traditions and events experienced there.
TG-164: Settlement ruins as culturally meaningful — abandoned settlements leave ruins; descendants visit, interpret, and sometimes rebuild; ruins become part of historical identity.
TG-165: Geography affecting settlement behavior — terrain influences movement, defense, resource availability, trade route feasibility, disaster vulnerability, and sacred site interpretation.
TG-166: Geography affecting trade routes — mountains, rivers, and forests create natural trade corridors; route length and difficulty affect dependency and cultural transmission.
TG-167: Geography affecting migration — terrain difficulty, resource availability, and settlement presence influence migration paths and settlement choices.
TG-168: Persistent world scars with history — scars have event references (what happened here) and can become economically important (fertile soil from burn, mineral deposits) or sacred.
TG-169: Ecological recovery and depletion — resources regenerate slowly; overuse creates permanent depletion; divine intervention creates both abundance and scarcity with lasting effects.
TG-170: Seasonal/ecological time effects — very slow resource cycles create long-term patterns; repeated intervention in same area creates lasting ecological changes.

========================================================================
CATEGORY 5: PLAYER DIVINITY, MIRACLES, EXPECTATIONS & THEOLOGICAL CONSEQUENCES (10)
==========================================================================

TG-171: Miracle expectation and habituation — repeated identical miracles reduce emotional response and belief impact; first miracle transforms history; 70th has reduced effect.
TG-172: Miracle expectation tracking — settlements track when and where miracles occurred; expectation built from recent history; expectation affects interpretation of future events.
TG-173: Miracle novelty tracking — new miracle types or locations produce stronger effects; repeated same-type/same-location miracles become routine.
TG-174: Ritual response loops — societies attempt to communicate through rituals (gather, pray, sacrifice, build, perform); player can respond, ignore, respond differently, accidentally respond.
TG-175: Ritual expectation tracking — repeated ritual patterns create expectation; if miracle follows ritual repeatedly, belief in ritual efficacy grows; if not, belief may decline or be rationalized.
TG-176: Player silence as meaningful — absence of response interpreted: ritual failure, god is testing, there is no god, silence is the answer; silence after reliable response matters more.
TG-177: Coincidence as false divine evidence — natural events that occur after prayer, at sacred sites, to important people, during festivals, or after prophecies can be misattributed.
TG-178: False miracle mechanism (expanded from coincidence) — structured false evidence: events that appear divine but have natural causes; societies build false beliefs from these.
TG-179: Prophecy/prediction system — characters or traditions make predictions (vague/specific, correct/incorrect, self-fulfilling, retrospectively reinterpreted); predictions affect influence and belief.
TG-180: Theological reinterpretation across generations — descendants reinterpret same miracle with new doctrine; reinterpretation events preserved with parent references; creates divergent traditions.

========================================================================
CATEGORY 6: MINIMAL UX, HISTORY LEGIBILITY, INPUT & ACCESSIBILITY (8)
==========================================================================

TG-181: Contextual history exploration — clicking entities (creatures, settlements, families, religions, events) opens contextual panels showing their history, relationships, and interpretations.
TG-182: Lineage tracking/bookmarking — player can optionally bookmark/follow small numbers of creatures, families, places, or societies; descendants recognized later.
TG-183: Lineage inspection panels — family trees showing parents, children, siblings, partners, descendants; notable family events and reputation shown.
TG-184: Religion genealogy inspection — religion history showing origins, founders, parent traditions, schisms, reforms, syncretism, members, and doctrine divergence.
TG-185: Settlement history panel — settlement timeline of founding, growth, specialization, conflicts, rituals, leaders, trade partners, and significant events.
TG-186: World lenses (optional overlays) — temporary visual overlays for settlement influence, migration paths, trade routes, religions, factions, cultural ancestry, recent divine witness zones; dismissible.
TG-187: Minimal UI philosophy preserved — new interfaces use context, overlays, and temporary panels; no permanent management-dashboard chrome added.
TG-188: Enhanced keyboard accessibility — all new exploration features operable via keyboard; focus indicators preserved; screen-reader support for historical data.

========================================================================
CATEGORY 7: ARCHITECTURE, PERFORMANCE, PERSISTENCE & DATA INTEGRITY (7)
==========================================================================

TG-189: Clear architectural boundary between world state, simulation systems, event/causal history, knowledge/belief, social structures, player actions, serialization, API, presentation, and testing support.
TG-190: Causal traceability — important events reference durable IDs for people, families, settlements, religions, institutions, locations, factions, wars, migrations, divine interventions, artifacts; reconstruction possible.
TG-191: Persistence migration support — save files include schema version; new fields added with backward compatibility; old saves loaded and migrated without corruption.
TG-192: Save/load round-trip verification — automated test ensures saved world loads to equivalent meaningful state; stable IDs preserved; atomic writes maintained.
TG-193: Performance profiling and bounded history — history depth bounded; dead entities archived (not deleted); lineages summarized; long-run performance preserved.
TG-194: Archive history mechanism — long-lived worlds archive dead people and extinct societies; preserved for lineage, religion origins, settlement history; live simulation baggage removed.
TG-195: Data integrity checks — automated verification of relationship integrity, family integrity, genealogy validity (no circular ancestry, impossible parentage), event reference validity, institution validity.

========================================================================
CATEGORY 8: DETERMINISM, REPLAY, TESTING, OBSERVABILITY & EMERGENCE EVALUATION (5)
==========================================================================

TG-196: Deterministic replay verification — same seed + same actions produces same results; verified with automated replay tests across multiple seeds.
TG-197: Golden-seed scenarios — deterministic scenario seeds for minimal intervention, consistent benevolent, consistent destructive, contradictory, intervention-then-silence, same miracle at one lineage, rituals followed by coincidence.
TG-198: Counterfactual testing harness — compare same seed with and without specific player actions; measure divergence in migration, religion, population, settlement history, faction alignment, cultural claims, lineage importance.
TG-199: Multi-seed evaluation — sufficient seeds to prove different worlds diverge structurally (not just population); compare religion lineage depth, cultural divergence, settlement topology, migration history, institutions, historical actors, player interpretation diversity.
TG-200: Emergence metrics and observability — metrics for religion genealogy depth, cultural divergence, settlement survival, migration count, trade diversity, institutional diversity, rumor mutation depth, belief disagreement, social clustering, important historical events, lineage depth, player-action interpretation diversity; preserved for testing/debug, not normal HUD.

========================================================================
KEYSTONE IMPROVEMENTS (20+)
==========================================================================
1. TG-101 — Durable event identity (enables all history linking)
2. TG-102 — Authoritative event history (enables truth vs belief divergence)
3. TG-103 — Interpreted divergence tracking (enables epistemic simulation)
4. TG-104 — Memory provenance (enables generational transmission of knowledge)
5. TG-105 — Generational cultural transmission (enables descendant culture divergence)
6. TG-106 — Family lineage tracking (enables historical family importance)
7. TG-112 — Deep relationship history (enables emotional history preservation)
8. TG-125 — Descendant culture divergence measurement (enables cross-generational assessment)
9. TG-126 — Knowledge provenance (expanded) (enables rumor mutation tracking)
10. TG-127 — Rumor mutation system (enables evolving stories)
11. TG-128 — Rumor provenance chain (enables story tracking)
12. TG-136 — Religion genealogy tree (enables religious divergence tracking)
13. TG-137 — Religious schism mechanics (enables tradition splitting)
14. TG-138 — Religious reform mechanics (enables tradition change)
15. TG-139 — Syncretism mechanics (enables tradition merging)
16. TG-140 — Doctrine tracking (enables belief divergence)
17. TG-146 — Settlement life cycle (enables settlement history)
18. TG-153 — Trade routes (enables economic interdependence)
19. TG-154 — Trade dependency (enables economic vulnerability)
20. TG-162 — Sacred site formation (enables emergent sacred geography)
21. TG-171 — Miracle expectation/habituation (enables theological evolution)
22. TG-176 — Player silence as meaningful (enables absence-based theology)
23. TG-178 — False miracle mechanism (enables false evidence)
24. TG-179 — Prophecy/prediction system (enables predictive culture)
25. TG-189 — Architectural boundary definition (enables maintainable expansion)
26. TG-190 — Causal traceability (enables debugging emergent history)

========================================================================
IMPLEMENTATION NOTES
==========================================================================
- All 100 improvements implemented through real code changes in sim/engine.py, sim/server.py, public/index.html, and tests/test_simulation.py.
- No cosmetic-only changes; no artificial splitting.
- All features interact with at least one existing system; most interact with multiple.
- Cross-generational consequences enabled through lineage, memory, tradition, religion genealogy, settlement life cycles, and cultural transmission.
- Historical truth (authoritative event history) and believed history (interpreted chronicle) can diverge; divergence tracked.
- Stories mutate through structured semantic transformation with provenance tracking.
- Descendants inherit imperfect culture through generational transmission with mutation.
- Religions have genealogy (parent, schism, reform, syncretism) with preserved lineage.
- Families matter historically through reputation, lineage, feuds, alliances, and stories.
- Migration carries culture; diaspora diverges from origin.
- Settlements have life cycles (founding, growth, specialization, split, merge, abandonment, revival).
- Geography affects settlement behavior, trade, migration, and sacred site interpretation.
- World retains scars (burned forests, altered rivers, ruins, rebuilt settlements) with historical references.
- Silence affects theology (expectation, ritual failure interpretation, absence as meaning).
- Repeated miracles change expectations and emotional response.
- Coincidence creates false divine evidence preserved in history.
- Player can observe consequences through contextual history exploration, lineage tracking, religion genealogy, settlement timelines, and world lenses.
- Determinism preserved; same seed + actions = same results.
- Save/load migration preserved; old saves load correctly.
