# v0.2.0 QA record

Validated locally on 2026-10-23. This records observed checks, not cross-browser
certification or completed human balance playtesting. [The v0.1 record](QA-v0.1.md)
preserves the original baseline.

## Automated verification

`npm install`, `npm run lint`, `npm run test`, and `npm run build` succeeded.
All **40 tests across three files pass**, including:

- 10,000 seeded floors: connectivity, reciprocal adjacent links, protected reachable
  exit, at least one cycle, branching, room counts, budgets, biome affinities,
  recovery/rewards, secret access, and fair encounter compositions.
- All ten authored geometries: required ports and spawn lanes remain reachable.
  Five hundred decorated floors receive additional physical-surface checks;
  the large stress suite checks obstacle-aware routes on its first 250 floors.
- Deterministic geometry/decoration, topology diversity, shape selection, and navigation.
- Camera projection/unprojection during a duel and on elevated stairs; groups return
  to overview; ice drift follows both simulation axes and remains bounded.
- Existing perfect/normal/failed defense, dodge, unblockable, posture, counters,
  input buffering, four weapons, guardian phases, rewards, save validation, death,
  replay, pausing, separation, relic interactions, and deep-run regressions.

The final full suite took about 17 seconds on this machine. Strict TypeScript and
ESLint pass. npm reported zero dependency vulnerabilities. Installed Node 22.12 emits
an engine recommendation for eslint-visitor-keys (22.13+); Node 24 is recommended.
Material refinements were subsequently linted, built, and checked in production.

## Production browser checks

The production `dist/` was served through Vite preview on port 4174.

- Normal seeded setup and movement through a real arch/bridge into the first encounter;
  gate closure, map discovery, camera following, and the enlarged world composition.
- Live training: a perfect deflection, posture break, and E execution. The camera
  retains the close view through the enemy's death and returns toward exploration.
- Depth 2 elite encounter with Pilgrim's Reach; close camera, monk silhouette, weapon.
- Depth 3 guardian: first execution activates phase II, second clears the fight and
  opens a relic choice; keyboard 1 selects the relic and resumes the run.
- All five biome families: water/cool shrine lights, fungi/roots, snow/icicles,
  foundry/furnace/cracked molten surface, and ruins. No shader errors observed.
- Additional seeds `CANDLE-27` and `CHASM-904`, regenerated through the visible QA tools.
- Unprotected Bellbreaker damage leads to a real death summary; same-seed replay
  starts a fresh run with the seed preserved.
- Generation graph displays the seed, biome, room archetypes, budgets, modifiers,
  and links. Closing it returns to the pause menu; resuming restores play.
- Atmospheric quality off/on renders successfully and restores the chosen setting.
  Pause/settings/replay remain keyboard accessible.
- Main menu and settings at 768x1024; document clipping prevents focus restoration
  from scrolling the viewport and cropping the header. The viewport override was reset.
- Captured production console: no errors or warnings during the final checks.

QA depth, enemy-spawn, invincibility, and guard-break controls were used to reach
specific encounters efficiently. Training perfect-parry screenshots used tenth-speed
timing and the visible frame-pause tool. F2 hides the tools for capture. These are
actual WebGL gameplay frames, with no injected artwork or staged background scene.
The exploration comparison was captured during ordinary keyboard traversal.

## Screenshot review

[Visual review](VISUAL_REVIEW.md) places the v0.1 capture, new exploration, new duel,
five environments, and supplied target alongside their correct labels. Captures live
in `docs/screenshots/v02/`. The earlier `combat-iteration.jpg` is an intermediate
development capture, not the final effect. `finisher-after.jpg` records a real execution.

Review drove changes to camera angle/scale, wall masses, broken edges, lower ruins,
warm/cool light pools, material roughness, actor mesh merging, finer trails, parry
rays, fungal caps, and molten crust. Gameplay was checked again after these changes.

## Performance observations

At 1280x720, active local production samples reported 58-60 FPS during training,
guardian, and elite checks. Examples: guardian 460 calls / 726k triangles, training
555 calls / 944k triangles, and a different seeded encounter 700 calls / 1,043k
triangles. A low-quality exploration sample reported 60 FPS, 111 calls / 226k triangles.
These include render passes and are samples, not a sustained benchmark or minimum FPS.
The in-app browser throttles inactive tabs; those 1 FPS samples are excluded.

Room-level instancing/culling, 20-triangle beveled blocks, per-joint actor merging,
six nearby point lights, a bounded shadow map, capped effects, DPR capped at 1.5,
and a low-cost quality fallback control costs. The stone PNG is about 4.3 MB;
production JavaScript totals about 546 KB gzip across application, Three, and Phaser.
Low-end devices, other GPUs, and other browsers remain unmeasured.

## Remaining limits

Art is visibly low-poly and modular; it does not meet the concept's painterly character,
sculpture, and animation fidelity. Water uses surface/light approximations, not real
reflections. Some stone modules remain repetitive, and biome-specific architecture
could be more extensive. Human balance testing and long uninterrupted runs remain
necessary. No controller, touch combat, active-run resume, or ranged support enemy.
GitHub CI/Pages are configured but have not run remotely: no Git remote is connected.
