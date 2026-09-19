# Tiny Gods — 100 Improvement Ledger

## Category 1: Gameplay / Emergent World (TG-001..030)
- TG-001: eyewitness vs second-hand knowledge system
- TG-002: rumor propagation between nearby creatures
- TG-003: story mutation as stories pass between creatures
- TG-004: unreliable memory with emotional decay
- TG-005: settlement-specific cultural histories
- TG-006: culture-specific interpretation weights
- TG-007: false pattern detection mechanism
- TG-008: correlation mistaken for divine intent
- TG-009: confirmation bias in belief updates
- TG-010: skepticism propagation when contradictions observed
- TG-011: agnosticism as intermediate belief state
- TG-012: atheism formation when belief remains very low
- TG-013: conversion mechanics (belief shift due to strong events)
- TG-014: apostasy when interpretations conflict
- TG-015: heresy as deviation from settlement religion
- TG-016: doctrinal disagreement between settlements
- TG-017: religious schism when belief divergence exceeds threshold
- TG-018: religious syncretism when multiple rituals coexist
- TG-019: sect formation from ritual practice divergence
- TG-020: sacred place creation near ritual emergence sites
- TG-021: sacred bloodline myth formation
- TG-022: chosen-family myth from repeated player salvation
- TG-023: saints and prophets emerging from significant life events
- TG-024: ritual invention through collective practice
- TG-025: ritual evolution over time
- TG-026: failed rituals reducing collective belief
- TG-027: coincidentally successful rituals becoming reinforced
- TG-028: taboo formation from disaster memories
- TG-029: festivals as recurring settlement rituals
- TG-030: pilgrimage behavior toward sacred locations

## Category 2: God Powers / Belief / Religion (TG-031..045)
- TG-031: deeper belief dimensions (existence, certainty, fear, gratitude, hostility)
- TG-032: awe dimension tracking extraordinary events
- TG-033: perceived benevolence vs wrath in deity_interpretation
- TG-034: perceived intentionality tracking
- TG-035: cultural consensus metric per settlement
- TG-036: doctrinal stability tracking per faction
- TG-037: interpretation dictionaries fixed (duplicate key removal)
- TG-038: contradictory interpretation evidence preserved
- TG-039: diminishing novelty for repeated same-power use
- TG-040: miracle saturation reducing belief impact
- TG-041: habituation reducing emotional response to same event
- TG-042: skepticism caused by contradictory interventions
- TG-043: ritual expectation when repeated patterns occur
- TG-044: communities expecting repeated miracles
- TG-045: player absence itself interpreted as meaningful

## Category 3: Minimal UI / UX / Input / Accessibility (TG-046..060)
- TG-046: collapsible chronicle panel
- TG-047: compact power palette (much smaller footprint)
- TG-048: keyboard shortcuts for powers (1-0 keys)
- TG-049: creature inspection without accidental divine intervention
- TG-050: targeting preview indicator before click confirmation
- TG-051: reduced permanent screen space usage for title
- TG-052: responsive mobile layout improvements
- TG-053: keyboard-operable pan with arrow keys
- TG-054: focus indicators for interactive elements
- TG-055: reduced-motion CSS support
- TG-056: sufficient text contrast verification
- TG-057: minimum 44px touch targets
- TG-058: semantic buttons with proper labels
- TG-059: ARIA labels for canvas and controls
- TG-060: hotkey help overlay

## Category 4: Backend / State / API / Persistence (TG-061..075)
- TG-061: deterministic world seed parameter
- TG-062: isolated test world for /api/test_run
- TG-063: strict API validation with deterministic errors
- TG-064: bounded coordinates validation
- TG-065: bounded radius validation
- TG-066: structured JSON error responses
- TG-067: server-authoritative power availability
- TG-068: clean server lifecycle (start/stop ownership)
- TG-069: deterministic replay support (seed + history)
- TG-070: save current world to file
- TG-071: load saved world from file
- TG-072: world state versioning in save format
- TG-073: atomic persistence (write temp then rename)
- TG-074: bounded chronicle history growth
- TG-075: bounded creature memory growth

## Category 5: Performance / Rendering / Data Transfer (TG-076..085)
- TG-076: spatial indexing for nearby creature queries
- TG-077: optimized creature serialization (smaller payload)
- TG-078: reduced chronicle transfer (last 15 instead of 30 when appropriate)
- TG-079: requestAnimationFrame ownership cleanup
- TG-080: world/screen coordinate reuse (cached transforms)
- TG-081: off-screen object culling
- TG-082: device pixel ratio awareness
- TG-083: efficient terrain drawing (tile batching)
- TG-084: reduced network payload size
- TG-085: bounded creature count enforcement

## Category 6: Testing / Determinism / Observability (TG-086..095)
- TG-086: deterministic replay test (same seed + same actions = same results)
- TG-087: save/load round-trip verification
- TG-088: relationship integrity verification after simulation
- TG-089: family integrity verification
- TG-090: reproduction bounds verification (no runaway)
- TG-091: resource integrity verification
- TG-092: religion diversity across 5+ seeds verification
- TG-093: long-run stability verification (5000 ticks)
- TG-094: isolated test simulation verification
- TG-095: real failing exit status in test runner

## Category 7: Maintainability / Documentation / Running (TG-096..100)
- TG-096: truthful README (direct file opening documented correctly)
- TG-097: server lifecycle documentation
- TG-098: clean module separation (simulation vs Flask vs frontend)
- TG-099: validated installation process documented
- TG-100: preview URL verified and working
