# Architecture — v0.3

The simulation is a 2D action game. Three.js provides a render-only 2.5D world; it does
not add a 3D physics engine or duplicate combat entities. Phaser runs the scene clock
in headless mode. Native input and HTML UI sit above the WebGL canvas.

## Runtime

- `main.ts`: startup, headless Phaser, UI refresh, optional local QA reference.
- `game/scene.ts`: input, camera-relative movement, raycast aiming, bounded 120 Hz
  simulation steps, focus loss, renderer lifecycle, and brief encounter entry slowdown.
- `game/world.ts`: authoritative player/enemy states, combat, rewards, progression,
  and shared navigation collision. Weapon windows and damage values remain in `data.ts`.
- `combat.ts`: pure defense resolution, pressure formulas, buffering, finisher naming.
- `dungeon.ts`: seeded macro graph, progression roles, encounters, topology, and ports.
- `geometry.ts`: authored unions of platforms/arms/alcoves, elevations, semantic tiles,
  light anchors, decorations, flood-fill validation, and obstacle-aware navigation.
- `presentation/architecture.ts`: physical floor slabs, foundations, bridges, arches,
  masonry, props, gates, landmarks, biome surfaces, and lower ruins.
- `presentation/materials.ts`: shared materials, original image texture, procedural
  fabric, low-cost beveled blocks, room batches, and player visibility cutout shader.
- `presentation/actors.ts`: articulated humanoids, enemy silhouettes, weapon meshes,
  cloth deformation, support-hand targeting, combat LOD, and per-joint mesh merging.
- `presentation/profiles.ts`: proportions, stance, guard, cloth scale, and gait vocabulary.
- `presentation/animation.ts`: normalized multijoint keyframes, semantic attack families,
  archetype/phase variants, hit-window metadata, and pure sampling.
- `threat.ts`: immutable committed impact reservations, preparation budget, and defense spacing.
- `presentation/camera.ts`: high exploration framing, close perspective duet framing,
  interpolation, contact/finisher framing, screen/world mapping, movement basis.
- `presentation/effects.ts`: streamed spark lines, trails, radial impacts, contact light,
  and attack ground cues, derived from simulation events.
- `presentation/renderer.ts`: floor/actor lifecycle, nearby lights, animation, layered
  atmosphere, water, bloom/output, quality switching, GPU-resource disposal, telemetry.
- `presentation/hud.ts`: restrained resource meters, discovered map, posture, prompts,
  training cues, and quiet announcements.
- `audio.ts`, `save.ts`, `random.ts`, `ui.ts`: synthesized cues/biome air, validated local
  persistence, independent deterministic streams, and menus/QA tools respectively.

## Coordinates and simulation

Player and enemy coordinates remain local to the active area. The renderer places
that area within the floor's global layout using a fixed cell pitch and a 0.025 scale.
Neighbors are rendered before entry, including their connecting bridges. Crossing a
port preserves progression state and interpolates the visible traversal across the
bridge. Floors after a stairway are regenerated and use a short descent fade.

The renderer queries elevation without changing combat distances or defensive
windows. Camera orientation controls movement basis; mouse rays intersect the ground
and convert back to local simulation coordinates. Tests exercise this conversion in
the close camera. World state is shared between exploration and combat representations.

The duel camera activates for a nearby significant single opponent or a finisher.
Groups use combat-wide framing that fits the living combatants. The same articulated entity gains finer visible
armor detail during close presentation; there is no second health or timing model.
Finishers retain the close view after the enemy leaves the living-target list.

## Generation pipeline

Seed → turning main path → optional cycle → branch growth/shortcuts → protected
exit and secret leaf → biome-weighted architecture grammar → shared navigation
surface → encounter composition → elevation → semantic decoration → lighting.

The exit has only its guardian connection. Required navigation never depends on a
secret. A generation-history penalty suppresses recently used architecture. Each
archetype has a clear fighting lane, with irregular traversal modules around it.
Flood fills verify portals and generated floor components. Pathfinding is invoked
for blocked enemy approaches rather than running for every frame of every actor.

Decoration uses its own seed and semantic locations: edge rubble/foliage, architectural
columns/banners, story features outside passage lanes, torch anchors, and lower ruins.
The stair area blends the next biome's materials and introduces its features. Deep
mutations layer environmental rules and art rather than merely applying a tint.

## Rendering costs and ownership

Each room has shared instanced batches, allowing native room-level frustum culling.
A custom 20-triangle beveled block replaces expensive generic rounded cubes. Rigid
actor pieces merge by material within animated joints; the cape remains deformable.
One directional light casts a bounded shadow map; six nearest torches illuminate the
scene without shadow maps. High quality adds bloom, fog sprites, and atmosphere.

World impacts feed a capped stream of lines and short-lived effect meshes. Room
changes clear actor ownership; floor changes release unique geometry, materials,
instancing buffers, and sprite materials. Shared material/geometry resources persist.
No reference image is used by the runtime. The original generated stone material is
an albedo/bump input, not a prerendered scene.

## Persistence

The v1 save schema remains compatible: settings, discoveries, weapon unlocks, tutorial,
embers, and counters. No saved gameplay state is rewritten for the visual overhaul.
Unknown/malformed saves retain safe defaults. Active runs still do not resume on reload.

## Combat presentation and coordination

Simulation state/time maps to normalized clip time; an enemy contact is at 0.58,
matching the tell-to-active boundary. Rendering never fires damage events. Player
startup/recovery and execution contact are also sampled from simulation time. Joint
rotation blends are render-only. Elbows/knees articulate separately; two-handed
weapons use bounded analytic support-hand targeting, not terrain or full-body IK.

Profiles distinguish the disciplined Warden, asymmetric Aegis, sideways Duelist,
linear Lancer, low Reaver, upright robed Cantor, heavy Bellbreaker, hunched clawed
Sporebound, and elongated Saint. Motion recipes share semantic foundations while
altering multi-joint poses, guard, cadence, and stride per archetype. Death and
some recoveries still share a foundation and need further authored polishing.

Two enemies may prepare at once. Commitments reserve impact time with at least
480 ms between ordinary attacks (400 ms at depth 5+) and 720 ms around specials.
The reservation persists briefly after contact; interrupted enemies release it.
Patterns branch only between commitments. The phase-two Saint marks a floor
location before its delayed echo; leaving it or evading avoids the returning hit.

The combat laboratory replaces the active test floor, clears reservations/effects,
and isolates run/relic progression from the saved Chronicle. Clip scrubbing and
explicit camera selection are debug-only. A paused lab camera can snap to its
selected frame for inspection; normal camera transitions remain interpolated.
