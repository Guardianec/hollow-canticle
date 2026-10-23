# Changelog

## 0.3.0 — 2026-10-23 (review build)

- Added archetype body/stance profiles, articulated elbows and knees, support grips,
  asymmetric armor, a clawed Beast, and the Saint's removable mantle and revealed crown.
- Replaced Actor state-pose blocks with sampled multijoint clips, directional cuts,
  distinct thrust/sweep/smash/grab/feint tracks, weapon executions, and transition blending.
- Added overlapping preparations with immutable impact reservations and longer
  spacing around evasive attacks. Enemies reposition and avoid striking through allies.
- Added contextual mixups, deep-floor sequences, authored encounter pairs, and
  behavioral Patient, Relentless, and Armored elite traits.
- Added phase-two Saint sequences and a delayed floor echo that can be escaped.
- Changed Oathkeeper's normal parry window from 240 to 220 ms; perfect timing remains
  85 ms. Empty parries add guard damage and reduce the normal window, with reset on
  a successful deflection or quiet interval. Input buffering remains.
- Added weapon/type-specific trails, a blue-white parry core, biome-colored impact
  debris/ripples, contact shadows, cool rim light, and contact-timed execution impacts.
- Added combat-wide/boss/finisher framing and a combat lab with compositions,
  elites, biome/depth/pattern selection, clip scrubbing, stepping, and timing telemetry.
- Expanded regression coverage to 52 tests. Preserved dungeon/navigation, relics,
  saves, and the v0.2 deployment. Human full-run balance sign-off remains outstanding.

## 0.2.0 — 2026-10-23

- Replaced the flat Canvas room board with a WebGL 2.5D world: irregular raised
  platforms, physical bridges and stairways, tall architecture, lower ruins, and a following camera.
- Rebuilt seeded floor topology with turning main routes, guaranteed loops, side
  branches, protected exits, secrets, and ten authored spatial grammars.
- Shared geometry now drives navigation, collision, decoration, lighting anchors,
  and placement. Added enemy pathfinding around voids and visible encounter gates.
- Added a low-angle cinematic duel presentation, combat-detail articulated rigs,
  distinct weapon meshes/trails, impact bursts, recoil, and finisher framing.
- Added local torch lighting, shadows, bloom, foreground visibility cutouts,
  biome atmosphere, animated water/cloth, fungi/roots, frost, machinery, and transition dressing.
- Reworked HUD, discovered minimap, quiet titles, and QA graph/performance tools.
- Preserved v1 saves and combat timing values. Corrected ice momentum for camera-relative movement.
- Added geometry/navigation/camera tests, production chunking, visual comparison docs,
  a generated original stone material, and dependency/asset credits.

## 0.1.0 — 2026-10-23

- Added seeded, branching dungeon floors, recovery routes, secrets, and endless descent.
- Added buffered parry combat, perfect deflections, counters, posture, dodges, adaptive finishers, and Focus resonance.
- Added eight enemy archetypes, a two-phase guardian, four weapon identities, and eighteen event-driven relics.
- Added five biomes, deep-floor mutations, encounter modifiers, procedural masonry, particles, light pools, and generated audio.
- Added safe training, rewards, pause, settings, a death chronicle, weapon unlocks, and versioned local saves.
- Added deterministic tests, 10,000-floor stress validation, CI, and a GitHub Pages workflow.
