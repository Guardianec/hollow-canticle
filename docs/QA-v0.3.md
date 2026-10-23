# v0.3.0 review-build QA

2026-10-23. Branch: `codex/v0.3.0-combat-art-overhaul`.
Baseline: `57a9ff69883c5e42c91a311afca4327ce977dd49` (v0.2.0).
This records completed checks and remaining acceptance work, not full balance sign-off.

## Technical validation

- `npm install`: succeeded, zero audit vulnerabilities; no new dependencies. The host
  Node 22.12 emits the existing eslint-visitor-keys engine recommendation; CI uses Node 24.
- `npm run lint`: passed (ESLint and TypeScript).
- `npm run test`: **52 passed across four files**, including the existing 10,000-floor
  stress suite, geometry/navigation, save/relic, combat, and all enemy/weapon simulation cases.
- New coverage: concurrent preparations, impact spacing at shallow/deep depths, mixed
  special attacks, reservation cleanup, finite/deterministic clip sampling, semantic
  attack/phase differences, tell/player-startup contact alignment, the actual spear
  transform hierarchy, empty parries/reset, delayed echo damage/escape, committed
  strike immutability, authored compositions, lab save isolation, group and boss framing.
- `npm run build`: passed. The production app chunk is about 139 kB (49 kB gzip);
  Three.js/Phaser vendor chunks are unchanged. No extra runtime asset requests were added.

The sandbox blocked Vitest temporary-cache renames; tests succeeded with normal host
cache access. Headroom stored the attached brief under hash
`d030fde39444593c9b09fb69`; its compression proxy was unreachable and returned no savings.
Source review used targeted reads; traffic is not automatically compressed.

## Browser checks

Production `dist/` served locally on port 4180. Captured warnings/errors: none.

- Seeded-run setup through the ordinary menu at `V03-NATURAL`.
- Laboratory normal and perfect Warden parries with real input and fixed-step advance;
  the perfect case recorded 1 parry / 1 perfect and 18 Focus.
- Guard break, E execution, contact-time impact, and post-execution camera hold.
- Two-handed spear contact preview; Bellbreaker + Reaver group composition and framing.
- The Saint's phase-I mantle and phase-II exposed crown/armor; both fit the revised frame.
- Ruins and shrine exploration framing; foundry boss surroundings.
- The four player weapon selections and laboratory pose controls load successfully.

Captures use actual production WebGL frames and visible laboratory controls. Some are
frozen semantic-clip previews; they are not all naturally reached combat moments.
The laboratory button remains visible so the capture context is explicit.

## Performance observations

The final Warden deflection capture reported approximately 334 draw calls / 534k
triangles, including render passes. Camera/frustum changes make this unsuitable as
a controlled before/after measurement. Background in-app tabs frequently reported
1 FPS; those readings are excluded from performance conclusions. An earlier active
v0.3 sample reported 60 FPS, but no sustained hardware benchmark was completed.

Particles retain the 260 cap; rigid parts merge per joint, shared geometry/materials
remain in use, and close detail retains its LOD switch. Extra articulated joints and
two-hand targeting add actor work. No claim of a measured speedup is made.

## Remaining acceptance work

- Several ordinary full runs, unassisted early/deep/elite/boss balance testing, and
  experienced-player failure-rate evaluation remain outstanding. Browser automation
  throttling makes precise live reaction play unreliable; lab checks and automated
  simulations do not replace this work.
- Visuals remain constructed low-poly art, substantially below the painted reference
  in organic detail, materials, and motion polish. See the honest visual comparison.
- Semantic motion foundations and some death/recovery choreography are shared.
  Support-hand reach is bounded, with no full-body or terrain IK.
- Camera avoidance uses framing and the existing architecture visibility cutout;
  it does not perform complete mesh-based wall avoidance in every chamber.
- Contact positions approximate combat contact, rather than physical blade collision.
  Biome reactions are inexpensive colored debris/ripples, without destruction or fluid physics.
- No ranged enemies were added. Normal generated encounters remain at most two enemies;
  the laboratory supports up to three.

The branch is a review candidate. No merge, production deployment, or release tag
is part of this work; the deployed v0.2.0 remains the baseline.
