# Architecture

The application uses TypeScript, Phaser 4, Vite, and native HTML dialogs. No React or backend.

- `src/main.ts` owns startup, the Phaser configuration, UI refresh, and opt-in QA exposure.
- `game/scene.ts` owns input, bounded 120 Hz simulation steps, focus-loss pausing, and frame rendering.
- `game/world.ts` owns the current run, player/enemy state, rewards, relic dispatch, and transitions.
- `game/combat.ts` contains pure defense resolution, posture calculation, input buffering, and finisher selection.
- `game/dungeon.ts` builds room graphs, budgeted encounters, door positions, and authored obstacle arrangements.
- `game/data.ts` centralizes timings, weapon rules, enemy combinations, biomes, and relic hook definitions.
- `game/random.ts` centralizes seeded PRNG, weighted choices, history suppression, and seed normalization.
- `game/save.ts` validates versioned local data and tolerates denied browser storage.
- `game/renderer.ts` draws cached procedural rooms and animated actors, effects, camera framing, and HUD.
- `game/audio.ts` synthesizes distinct cues and a combat-sensitive ambient drone.
- `src/ui.ts` owns main menu, setup, pause, settings, field guide, Chronicle, reward, summary, and QA panels.

## Simulation and state

Player states are idle, attack, parry, dodge, hurt, stagger, finisher, and dead.
Enemy states are idle/approach, tell, active, recovery, broken, and dead. Timers use
simulation seconds. InputBuffer keeps a short pending action; defensive cancels are
allowed near attack recovery. Pausing clears pending actions. Frame gaps are bounded
so a tab suspension cannot apply a long burst of damage. One enemy owns the attack
token during tell/active, while another may reposition. Guard break releases it.

The renderer uses an original 2.5D projection on a CanvasTexture displayed by Phaser's
Canvas renderer. Room masonry and decoration are cached on entry. Dynamic actors are
depth sorted with pillars. Camera zoom and midpoint tracking ease between exploration
and duels. Particles have short lives and a 260-particle cap. Re-entering a room reuses
its graph state but reconstructs its visual cache. Cleared enemies stay cleared.

## Generation

Each floor uses `seed:floor:depth`. A safe threshold connects a combat spine to an
elite/guardian and exit. Optional upper/lower loops contain rewards, hazards, a
challenge, and healing. A secret attaches to a reward branch. Some cross links are
seeded. Eight room arrangements have four orientations (32 composition variants).
Recent template choices are downweighted, rather than forbidden.

Encounters use biome affinities, costs, budget limits, and a speed compatibility
constraint. The primary biome changes by depth; floors after five gain a second
biome's materials and environmental rules. Mandatory connectivity never depends on
a secret or reward. Topology is intentionally constrained in v0.1; this is a grammar,
not an unrestricted random walk.

Loot has an independent seeded stream. Art and impact particles have separate streams,
so decorative draws cannot change encounter or reward choices. Same seed + depth
reproduces content; it does not reproduce physical combat input.

## Relics and persistence

Relics declare an event, effect, and amount. The event dispatcher applies them to
the run. Break state is set before dispatch, preventing chained shockwave recursion
from breaking the same enemy twice. The save holds settings, tutorial completion,
discoveries, counters, embers, and weapon unlocks; never an active fight. Unknown
save versions start from safe defaults. Storage exceptions leave a playable session.

## QA

`?debug` reveals spawn, weapon, depth, relic, health, guard, modifier, and slow-motion
tools plus live timing state and collision/range overlays. The game exposes a local
`window.canticle` reference only under that flag for development. No data is uploaded.
Pure rule tests and world simulations cover timings and run transitions. A stress
test checks 10,000 floors, including depth 10,000, for connectivity and content validity.
