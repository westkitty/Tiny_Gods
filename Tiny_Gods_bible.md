# Tiny Gods Project Bible

## 2026-09-19 — Corrective closure

Implementation commit: `d640a842414b9ce6fa4362fa758dfe4e9d00afc4`
Branch: `arena/01a0bb23-tiny-gods`
Baseline repaired: `27ef5481faa97f54d87e447c5789c90d8233ffc0`

### What changed
- Repaired simulation lifecycle deadlock/restart semantics and hardened stop behavior.
- Made persistence authoritative and recoverable: dead historical people, retained memories/provenance, RNG continuation, atomic save, previous-good recovery and real export/import.
- Centralized power unlock authority and fixed action coordinate transport.
- Replaced layered inline browser behavior with one `public/app.js` owner.
- Repaired action success semantics, VFX replay, mobile pointer gestures, reduced-motion runtime handling and audio lifecycle.
- Implemented real lineage, theology, story-thread, history, observer and persisted onboarding surfaces.
- Reworked terrain, settlement and creature Canvas presentation within the existing architecture.
- Repaired the live ritual-formation empty-supporter crash.
- Replaced false-green source-presence tests with a 19-test executable regression suite.

### Validation
- 19 focused regressions PASS.
- Python compile PASS; JavaScript parse PASS; Git diff check PASS.
- 13 Phase-II legacy verification functions PASS.
- Legacy multi-seed (3x500), 200-tick intervention and 1000-tick automated inspection functions PASS.
- Live seeded API stress PASS; live simulation tick advanced with no server traceback.
- Actual browser proof: `docs/closure-proof/desktop.png` (1440x900) and `docs/closure-proof/mobile.png` (390x844).
- The 2000-tick rapid and 3000-tick autonomous extended soaks were started but intentionally stopped after >5 minutes of parallel runtime without a failure result; they remain UNVERIFIED rather than falsely PASS.

### Protected identity
Tiny Gods remains an autonomous civilization/religion/history simulation driven by indirect divine intervention. No RTS/city-builder direct-control system, tech tree or framework rewrite was introduced.
