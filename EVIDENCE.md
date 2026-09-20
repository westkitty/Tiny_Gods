# Tiny Gods — Corrective Closure Evidence

Repository: `westkitty/Tiny_Gods`
Branch: `arena/01a0bb23-tiny-gods`
Corrective baseline: `27ef5481faa97f54d87e447c5789c90d8233ffc0`
Date: 2026-09-19

## Evidence rule

A source string is not treated as proof of runtime behavior. Runtime claims below are backed by executable tests, live Flask requests, seeded simulation stress or actual browser rendering. Static checks are used only for static invariants such as duplicate function ownership, external URL absence and generated-file exclusions.

## Verified repairs

### Server lifecycle — PASS

- Importing `sim.server` does not start the simulation thread.
- `start_simulation()` is idempotent.
- `stop_simulation()` joins outside the lifecycle lock and refuses to forget a thread that failed to stop.
- Stop → restart creates one new live thread.
- `/api/load` validates/deserializes before replacing the live world, stops without recursive lock acquisition, replaces under the world lock and restarts exactly once.
- Regression tests execute the lifecycle and load paths; they do not infer them from source text.

### Persistence / recovery — PASS

- Schema remains `PERSISTENCE_SCHEMA_VERSION = 2`.
- Persistence serializes authoritative terrain, resources, player history, event history, chronicle, factions, settlements, historical identities, story threads, inferred intents, alive and dead creatures and retained creature memories.
- Creature persistence now preserves memory location/provenance, family history/reputation, relationship reasons, awe/interpreter state and visual size instead of silently defaulting those values after load.
- RNG continuation state is saved and restored.
- Save writes a same-directory temporary file, flushes + `fsync`s, validates JSON, preserves a valid previous-good save and atomically replaces the primary with `os.replace`.
- Load falls back to the previous-good file when the primary is corrupt.
- `/api/export` returns the full persistence representation; `/api/import` validates in isolation and replaces the live world only on success.
- Generated `data/*.json` save files remain excluded from Git.

### Diagnostic isolation — PASS

`/api/test_run` validates its tick count and restores the live Python RNG state after the isolated diagnostic run. Regression coverage compares RNG state before and after the endpoint.

### Power authority and coordinates — PASS

- `POWER_DEFINITIONS` is the single server-side unlock table used by `/api/powers` and `/api/action`.
- Boundary behavior is regression-tested.
- Browser actions send `{kind, x, y, radius}`; the prior `cy` bug is gone.
- Accepted action responses return the coordinates/radius used by the server.

### Browser behavior architecture — PASS for implemented paths

`public/index.html` now loads one authoritative behavior file: `public/app.js`.

Verified static invariants:
- one `sendAction()` owner
- one `openCreatureModal()` owner
- one animation-loop owner
- no old `originalSendAction` wrapper
- no duplicate touch declaration block
- no Google Fonts request
- no fake "To fully import..." flow
- no periodic replay of recent `player_history` as fresh VFX

Behavior implemented in the single owner:
- server-backed power availability and disabled locked controls
- rejected actions do not trigger success presentation
- successful actions trigger presentation once
- Web Audio is initialized/resumed from a user gesture and oscillator nodes disconnect after playback
- distinct wind/rain/fire/fertility/dream/omen/lightning/healing/mutation/earth VFX forms
- reduced-motion media-query changes are observed at runtime and reduce/clear Canvas effects
- Pointer Events distinguish tap, drag and pinch; drag pans and pinch zooms without casting
- real save/load/export/import controls
- first-run onboarding persists in `localStorage` and can be reopened with Help
- story threads use `current_story_threads`
- history uses chronicle/world-lens/historical identity data
- lineage calls `/api/lineage/<family_id>` and includes dead family members
- theology calls real `/api/religion/<id>` data
- observer mode blocks intervention and follows actual world entities/story-linked settlements

### Rendering / game feel — PASS for implemented corrective scope

- Terrain uses real serialized terrain coordinates with deterministic procedural marks for forest, river, mountain, scarred/burned and ground detail.
- Settlement rendering is a deterministic composition of multiple tiny structures, paths and sacred cues based on settlement state rather than a single glowing circle.
- Creatures are procedural figures (head/torso/legs) with age scaling, interpolated motion and drawn role/tool cues rather than occupation emoji as the primary body.
- The prior ritual-formation crash (`random.choice(supporters)` with an empty supporter list) was reproduced from live runtime evidence, repaired with a safe leader pool and regression-tested.

## Executed verification

### Focused regression suite

`/tmp/tinygods-closure-venv/bin/python tests/regression_tests.py`

Result: **19 tests PASS, exit 0**.

Coverage includes lifecycle, deadlock-free load, diagnostic RNG isolation, unlock thresholds, action coordinates, persistence field roundtrip, non-truncated authoritative save data, previous-good recovery, export/import safety, RNG continuation, JavaScript syntax/ownership, local-first runtime, lineage/theology endpoints, VFX non-replay, generated-save exclusion and the ritual-formation empty-supporter regression.

### Syntax / diff checks

- `python3 -m compileall -q sim tests` — PASS
- `node --check public/app.js` — PASS
- `git diff --check` — PASS
- AST scan of top-level functions in `sim/server.py` and `sim/engine.py` — no duplicate definitions
- JS function-owner scan — no duplicate named function owners

### Live seeded server stress

Against the live Flask server on the final corrective code:

- seed 1: 300 diagnostic ticks, 44 creatures, 3 settlements, 3 factions
- seed 42: 300 diagnostic ticks, 44 creatures, 3 settlements, 3 factions
- seed 99: 300 diagnostic ticks, 44 creatures, 3 settlements, 3 factions
- live simulation tick advanced during a two-second observation window
- server log scan showed no Python traceback or simulation-thread exception during this stress pass

### Legacy simulation coverage

The legacy `tests/test_simulation.py` verification functions were exercised without treating its buffered monolithic wrapper as an instant gate:

- 13 Phase-II verification functions — **PASS**
- `test_multiple_civilizations` (3 x 500 ticks) — **PASS**
- `test_player_intervention_impact` (200 lightning-intervention ticks) — **PASS**
- `test_automated_inspection` (1,000 varied ticks) — **PASS**
- `test_rapid_advance` (2,000 ticks) — extended soak started but intentionally stopped after more than five minutes of parallel wall time without a failure result; **NOT CLAIMED PASS**
- `test_long_term_equilibrium` (3,000 autonomous ticks) — extended soak started but intentionally stopped after more than five minutes of parallel wall time without a failure result; **NOT CLAIMED PASS**

The uncompleted 2,000/3,000-tick soaks are a performance-duration evidence gap, not a hidden failure. They are not counted as passing tests.

### Browser proof

Actual browser output is stored in `docs/closure-proof/`:

- `desktop.png` — 1440x900
- `mobile.png` — 390x844

Desktop evaluated DOM contained runtime-created `Stories`, `Help`, `Observer: OFF` and an active power control, proving `public/app.js` executed. Headless Chromium emitted macOS display-link warnings while still producing valid PNGs; no corresponding Flask/Python application exception was observed.

## Remaining evidence boundary

- The closure screenshots prove browser rendering at desktop and mobile viewport dimensions. They do not substitute for physical-device multi-touch testing or audio-listening quality judgment.
- Historical Tier-III/Tier-IV "before" screenshots that were never captured cannot be reconstructed retroactively and remain documented as a historical evidence limitation.
- The heavyweight legacy `tests/test_simulation.py` suite is tracked separately in `docs/TIER4_RELEASE_PROOF.md`; the focused closure gate does not convert a long-running legacy test into a fake instant PASS.
