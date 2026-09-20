# Operational State — Tiny Gods

Project ID: westkitty/Tiny_Gods
Active branch: arena/01a0bb23-tiny-gods
Baseline for this repair: 27ef5481faa97f54d87e447c5789c90d8233ffc0

## Purpose
Tiny Gods is an autonomous civilization simulation in which the player is an unseen presence. Societies, families, beliefs and historical interpretations must remain autonomous; player agency is indirect through observation and divine interventions rather than direct RTS/city-builder control.

## Protected capabilities
- Autonomous simulation and deterministic/replay-oriented behavior.
- Creature inspection, relationships, families, settlements, religion and chronicle/history.
- Server-authoritative power unlocking.
- Durable versioned save/load without losing historical state.
- Local-first browser UI with no mandatory external services.
- Mobile/accessibility behavior and reduced-motion support.
- Existing branch only; main remains untouched.

## Known failures at repair start
- `/api/load` recursively acquires lifecycle lock and can deadlock.
- stop/start lifecycle cannot reliably restart after stop.
- frontend JavaScript has duplicate `const` declarations in touchstart.
- action payload sends `cy` instead of `y`.
- duplicate/wrapped `sendAction` can play success audio after failure and twice after success.
- repeated particle replay of already-completed interventions.
- mobile drag state does not actually pan and touchend can cast after movement.
- export/import UI is not full persistence export/import.
- lineage/theology surfaces are placeholders.
- duplicate `openCreatureModal` declaration can override real inspection.
- existing regression runner reports failures but exits zero and contains source-presence false positives.

## Current repair scope
Repair the above failures, strengthen the associated runtime/UI paths, add behavior-focused regression tests, run browser QA where available, update evidence truthfully, then commit and push this branch normally.

## Completion rule
No completion claim until Python/JS syntax, focused regression tests, existing simulation tests, browser smoke checks, Git diff checks and remote SHA verification are complete. Screenshot proof may remain blocked only if no usable local browser exists.

## Corrective closure result — 2026-09-19

### Verified working
- Lifecycle import/start/duplicate-start/stop/restart/load paths execute without recursive lifecycle locking.
- Full persistence roundtrip preserves dead historical people, retained memories/provenance, relationships, settlements/factions, histories, IDs and RNG continuation.
- Atomic save validation and previous-good recovery are regression-tested.
- `/api/test_run` validates input and preserves live RNG state.
- Power unlock authority is centralized and action coordinates preserve exact x/y.
- Browser behavior has one owner (`public/app.js`); JavaScript parses with Node.
- Save/load/export/import, onboarding/help, story threads, history, lineage, theology and observer controls are wired to real state/endpoints.
- Pointer input distinguishes tap/drag/pinch; reduced-motion updates affect Canvas runtime effects.
- Settlement/terrain/creature rendering no longer relies on the former single-circle/occupation-emoji presentation.
- Ritual formation no longer crashes when a newly named ritual has no faction-ready supporters.
- Actual browser proof exists at 1440x900 and 390x844 in `docs/closure-proof/`.

### Validation evidence
- `tests/regression_tests.py`: 19/19 PASS, nonzero exit on failure.
- `python3 -m compileall -q sim tests`: PASS.
- `node --check public/app.js`: PASS.
- `git diff --check`: PASS after evidence cleanup.
- Final live server stress: seeds 5 and 55 at 200 ticks each PASS; live tick advanced; no traceback in server log.
- Earlier final-code stress: seeds 1, 42 and 99 at 300 ticks each PASS with no server traceback.
- Desktop evaluated DOM included runtime-created Stories, Help, observer control and an active power control.

### Evidence boundaries
- Browser screenshots prove rendering and JavaScript execution at desktop/mobile viewport sizes, not physical-device multi-touch fidelity or subjective audio quality.
- Historical before-screenshots that were never captured cannot be recreated and remain an acknowledged historical evidence gap.
- Legacy coverage: 13 Phase-II functions PASS; 3x500 multi-seed PASS; 200-tick intervention PASS; 1000-tick automated inspection PASS. The 2000-tick rapid and 3000-tick autonomous soaks were started in parallel and intentionally stopped after >5 minutes without a failure result; they remain UNVERIFIED and are not claimed PASS.

### Pending delivery step
- Review staged diff, commit on `arena/01a0bb23-tiny-gods`, push normally and verify remote SHA equals local HEAD.
