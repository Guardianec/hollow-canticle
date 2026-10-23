# Hollow Canticle — v0.2.0

A procedural action dungeon crawler about reading a blade, breaking a guard, and keeping an oath.

**v0.2 replaces the flat room board with a navigable, layered WebGL dungeon and a low-angle cinematic duel view.** The existing precision-combat simulation remains authoritative.

![v0.2 exploration](docs/screenshots/v02/exploration-after.jpg)

## Play

Use Node 24 LTS, then:

```sh
npm install
npm run dev
```

Choose **Learn the rhythm** for safe training, or **Begin the descent** for a seeded run.
Keyboard and mouse are required. Phone layouts provide a keyboard requirement notice.

```sh
npm run lint
npm run test
npm run build
npm run preview
```

Production files are in `dist/`. Everything runs as a static site, including fonts,
original stone texture, local saves, and synthesized audio. There is no backend,
account, analytics service, or runtime third-party asset request.

## The visual overhaul

- An angled exploration camera follows the player through raised platforms,
  bridges, stairs, ruined cloisters, courtyards, libraries, and chasm crossings.
- Foundations, lower bridges, distant towers, broken arches, statues, hanging cages,
  banners, chains, foliage, and fog establish several visible depth layers.
- Moonlight, six nearby torch lights, contact shadows, localized impact light, and
  restrained bloom contrast warm light with cool unlit stone.
- Significant single opponents trigger a low, over-the-shoulder camera. Articulated
  characters reveal combat detail; their simulation coordinates remain unchanged.
- Guards recoil, weapons sweep through distinct trails, perfect parries create a
  radial metal burst, and finishers hold a closer camera before returning to exploration.
- Groups and minor opponents keep a broader overview. Foreground architecture
  uses a dithered visibility cutout when it would hide the player.

![v0.2 cinematic duel](docs/screenshots/v02/combat-after.jpg)

See the [before/after and reference comparison](docs/VISUAL_REVIEW.md).

## Dungeon generation

Floors contain **14–19 areas**, including a turning main route, a protected guardian
and exit, at least one loop, recovery and reward branches, optional fights, and a
secret leaf. Topology itself varies by seed. Ten architectural grammars assemble
irregular platforms, connecting arms, alcoves, narrow bridges, and elevated sections.
The same surface definitions drive rendering, collision, and navigation.

A seeded semantic decoration pass populates edges, features, architecture, and light
anchors. Biome affinities, encounter budgets, compatible pairs, and recent-template
suppression control content. Enemies use navigation paths when a straight approach
would cross a gap. Room boundaries become real arches and closing gates.

Five biome families remain: **Forgotten Ruins, Drowned Shrine, Fungal Choir, Winter
Cloister, and Ember Foundry**. Water and waterfalls, giant fungi and roots, snow and
icicles, or lava, furnaces and mechanisms distinguish them. Stair areas introduce
materials from the next biome; deeper floors combine a second biome's features.

## Combat and controls

Vitality is life. Guard is posture damage accumulated toward a break. Deflect normal
strikes, evade sweeps/grabs/smashes, and answer a deflection with an immediate counter.
A greatblade can perfectly turn a smash. Maintain pressure to prevent guard recovery.
When guard breaks, approach and press E before the enemy regains its footing.

| Input           | Action                                                  |
| --------------- | ------------------------------------------------------- |
| WASD / arrows   | Move relative to the camera                             |
| Mouse           | Aim through ground raycasting and soft target selection |
| J / left mouse  | Strike / counter                                        |
| K / right mouse | Deflect                                                 |
| Space           | Evade                                                   |
| E               | Interact, cross a passage, or execute a broken opponent |
| Q               | Resonance at 100 Focus                                  |
| Esc             | Pause                                                   |
| 1 / 2 / 3       | Choose a relic                                          |

The existing eight enemy archetypes, two-phase Unrung Saint, four weapon identities,
and eighteen relics are retained. Embers unlock starting weapons in the Chronicle;
relic discoveries and settings persist. Active runs do not survive reloads.

## Architecture and validation

TypeScript and Phaser own scene lifecycle and fixed-step game simulation. Three.js
owns the render-only 2.5D world, articulated rigs, lights, particles, and camera.
HTML menus and HUD remain independent of the 3D scene. The game uses no 3D physics.

`npm test` runs combat/save regression tests, 10,000 seeded floor checks, physical
geometry and decoration validation, navigation tests, and camera-coordinate tests.
See [architecture](docs/ARCHITECTURE.md), [QA](docs/QA.md), and [design](docs/GAME_DESIGN.md).

Append `?debug` for enemy/weapon/relic tools, area and depth selection, live timing,
frame-rate/triangle telemetry, generation graph, seed regeneration, and slow motion.

## Performance and accessibility

Static architecture is instanced per room for frustum culling. Beveled blocks use a
small mesh; rigid armor parts merge per animated joint. There are six nearby torch
lights and one shadow-casting moonlight. Particles are capped, and old floor resources
are released on descent. Renderer dependencies are separate production chunks.

Settings include audio, parry assistance, reduced motion, impact flashes, camera
shake, and atmospheric quality. Turning atmospheric effects off also disables bloom
and shadow maps. Node 22.12 can build and test, but Node 24 avoids a linter dependency's
22.13 engine recommendation. Performance still depends on device/GPU and viewport.

## Deployment

CI validates pushes and pull requests. The Pages workflow builds and publishes from
`main`. Push to a GitHub repository, then choose **Settings → Pages → Source → GitHub
Actions**. Vite's relative base supports repository subpaths. This workspace has no
GitHub remote, so no public deployment or URL has been created.

## Scope

This is a substantial spatial and presentation change, with stylized low-poly actors.
It does not reproduce the concept's painted character/detail fidelity. Navigation is
2D; elevation is visual. Water reflections are approximations. There are no ranged
enemies, controller/touch controls, multiplayer, merchants, or mid-run saves.

See [v0.2.1 / v0.3 priorities](ROADMAP.md), [credits](CREDITS.md), and the [asset prompt](docs/ASSETS.md).
Code and original project assets are MIT; dependencies and fonts retain their licenses.
