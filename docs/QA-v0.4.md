# v0.4.0 QA record

Validated locally on 2026-10-23 against the production build. This is a review
candidate, not complete release acceptance or experienced-player balance sign-off.

## Baseline and scope

- Accepted baseline: `17dd5e932f48609993fee133185265fe0e701400`.
- Review branch: `codex/v0.4.0-arsenal-ranged-loot`.
- Baseline installation, lint, 52 tests and production build passed before changes.
- Four Pilgrims, additional melee moves, ranged simulation and enemies, reflection,
  consumables, buffs, loot, save migration and focus controls are implemented.
- The follow-up control correction takes precedence over the original gameplay
  player-outline request: the focused enemy is outlined. The menu still outlines
  the selected Pilgrim.

## Automated checks

`npm install`, `npm run lint`, `npm run test` and `npm run build` passed.
The final suite contains **92 passing tests across six files**. Installation adds
no dependencies. The local Node 22.12 host reports a transitive ESLint engine
warning; Node 24 LTS is recommended in the README.

The existing procedural suite retains 10,000-floor checks for connectivity,
reciprocal doors, budgets, biome composition, route accessibility and shape diversity.
New checks cover:

- Swept arrow/orb collision, thin targets, room/obstacle stops, team filtering,
  ordinary parry, perfect reflection, reflected breaks and immunity to reflected shots.
- Dodge/finisher protection, simulation pause/hit stop, camera-independent travel,
  projectile capacity and all four charge/cast/recharge definitions.
- Expanded chains, counters, defense buffers, heavy commitment, dodge attacks and
  preserving Lancer chain attacks while moving.
- Inventory bounds, interrupted item use, timed healing, refreshing buffs, wards,
  pickup collection, room/floor persistence and restart reset.
- Seeded loot, pity, variable offerings, rarity, 10,000 loot rolls, 10,000 eligible
  encounter compositions, biome/cost constraints and ranged spacing regressions.
- V1 migration, damaged saves, local run history bounds/storage failures, focused
  targets, cycling, directional mouse selection and dead-target fallback.
- Fifty physically checked procedural floors: ranged spawns have a clear body
  footprint and remain connected to the player's navigation surface.
- Two separate audits of 200 six-floor journeys, described below.

The final UI-only changes adapt single-choice reward width/hints and use two
character columns on narrow screens. They were checked in production, with lint
and build repeated. The test-name edit changes no test behavior.

## Production input and visual checks

Served the built `dist` on localhost port 5207 and tested in the desktop app's
browser using actual keyboard, mouse and laboratory controls. Captures are real
WebGL frames, including deliberately paused/stepped laboratory scenarios. No world
state was injected through browser evaluation. Console warning/error checks were empty.

Focus correction:

- In close combat, computed canvas cursor is `none`; a living target is selected.
- Actual mouse movement changes the selected enemy; Tab and Shift+Tab also cycle.
- Enemy title, posture, attack target, camera and shell outline follow the selection.
- The player has no gameplay shell outline. Its existing rim light remains.
- Forced exploration restores cursor `auto`, free aim and the `free` focus marker.
- Pause restores menu interaction. Capture is requested on a combat click when
  available. This browser did not grant pointer lock, so the uncaptured gesture
  fallback was tested; unlimited captured mouse movement needs broader browser QA.

Other observed checks:

| Scenario                                  | Observed result                                                                                                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Oathkeeper / Warden + Archer              | Melee deflection and counter performed. Archer corner/retreat stalls found and repaired. Arrow reflection separately verified against a single Archer; the entire combined sequence was not certified. |
| Moth / Veilblade + Acolyte                | Quick chained inputs and knife release captured; mixed encounter targeting exercised. Full encounter victory not certified.                                                                            |
| Lancer / Bellbreaker + Archer             | Committed Javelin release and spent charge captured. Spacing reviewed; full scenario victory not certified.                                                                                            |
| Bellbearer / Bellbreaker + two Veilblades | Last Toll travelling wave and posture hit captured with three opponents.                                                                                                                               |
| Arrow defense                             | Ordinary defense and perfect reflection triggered with real K input and frame stepping. A returned arrow hit and broke a fresh Archer.                                                                 |
| Magic defense                             | Perfect orb reflection triggered; separate compression-ring contact effect captured.                                                                                                                   |
| Offerings                                 | Physical Crimson Vial dropped and collected with E. Ash Cordial used with Q, duration displayed, carried through a floor change.                                                                       |
| Boss                                      | Both Saint phases rendered in the foundry with focus outline and phase presentation. This is not a human boss-clear result.                                                                            |
| Rewards                                   | Actual one-relic dialog checked after variable-choice sizing/hint fix.                                                                                                                                 |
| Responsive menu                           | Desktop, 768×1024 and 390×844 checked. At 390 pixels, document width is 390 and dialog width is 338; no horizontal overflow. Mobile gameplay is not supported.                                         |

## Ordinary play attempts

These use normal seed entry, movement through doors and combat inputs, rather than
laboratory encounter injection. They are **three short opening attempts**, not
several completed multi-floor playthroughs.

| Seed             | Observed outcome                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `V04-NATURAL-A`  | Spearman opening, ranged hit and perfect melee deflection; death at about 33 seconds, no kills.                                                                    |
| `CANDLE-1I4N8WL` | Warden opening, chain pressure, guard break and E finisher; one kill/clear. Crimson Vial restored 74 to 100 HP. Room reopened without a relic. Ended through menu. |
| `V04-NATURAL-C`  | Spearman opening, melee/ranged pressure, break and E finisher; one kill/clear. Vial restored 87 to 100 HP. Ended through menu.                                     |

These checks establish working inputs and a non-guaranteed ordinary reward. They
do not establish deep-run balance, healing attrition, encounter win rates or the
subjective value of late-run passives.

## Loot and journey measurements

Ordinary base relic chance is 24%, with 2.5 percentage points of pity per miss,
capped at +15 and reset on a relic outcome. Elite/treasure/secret bases are
72%/90%/95%; boss is 100% strong; shrine is 30% relic/70% temporary blessing.
Ordinary non-relic relative weights are 25 empty, 20 embers, 20 consumable,
6 healing and 5 blessing. These conditional weights are not unconditional percentages.

Each run exposes nine non-Sacred and two Sacred possibilities from 22 total relics.
Choices vary from one to three. Faded/Rare/Sacred weights are 6/3/0.5, with Sacred
weight 2 in boss/secret choices; bosses exclude Faded. Exhaustion yields a physical
Silver Powder pickup, rather than a duplicate relic or free healing.

| Audit                                                                       | Ordinary relic rolls | Acquired relics by successive floor     |
| --------------------------------------------------------------------------- | -------------------- | --------------------------------------- |
| 200 seeded six-floor main routes plus one optional reward branch each floor | 26.63%               | 1.84 / 1.90 / 2.12 / 1.81 / 1.67 / 1.03 |
| 200 seeded six-floor completionist routes                                   | 25.24%               | 6.08 / 4.68 / 0.24 / 0 / 0 / 0          |

Completionist outcome counts: 1,318 empty, 1,029 embers, 985 item, 318 healing,
1,380 blessing and 7,505 relic-category rolls. A relic-category roll after pool
exhaustion is not a relic acquisition. Longest sampled non-relic-category drought
was five reward interactions. The completionist pool exhausts early; this is a
known pacing limitation for players who clear every branch.

Random loot supplied an average **7.08 potential healing HP per floor** in that
completionist audit. This counts direct healing and healing-item potential, excludes
the starting vial, wells and descent recovery, and ignores satchel limits, damage,
interruptions and overhealing. It is supply accounting, not observed healing usage
or proof that attrition is balanced.

The audits walk generated reward routes without simulating human combat. They
measure deterministic availability and frequency, not player survival or enjoyment.

## Performance

No new runtime dependencies. Final application chunk: **186.54 kB / 63.89 kB gzip**
versus the accepted baseline's 138.69 / 48.95 kB. CSS is 27.98 / 7.47 kB gzip.
Three.js is 596.88 / 148.07 kB; Phaser is unchanged at 1,367.11 / 357.02 kB.

Projectiles are capped at 48; projectile meshes, trails and defense effects are
pooled. Outline shells share source geometry; only the focused gameplay enemy's
shells draw. Menu rendering has a disposal path.

Short visible ordinary-play samples were around 60 FPS. Paused laboratory scenes
sampled 56–60 FPS, approximately 284–660 render calls and 380k–913k triangles
depending on room/camera. Paused scenes measure rendering, not sustained combat.
Background-throttled samples were excluded. There was no controlled baseline GPU
comparison, integrated-GPU stress test, minimum-FPS measurement or speedup claim.

## Outstanding acceptance

Several unassisted multi-floor runs, the complete mixed scenario A sequence,
deep-run item/relic balance, experienced-player combat feedback, sustained GPU
profiling and multiple-browser captured-pointer checks remain. Narrow-layout
camera occlusion still needs broader review. The finite relic pool especially
needs completionist pacing feedback. These prevent calling this full release
acceptance, despite the passing implementation regressions.

See [visual review](VISUAL_REVIEW-v0.4.md), [README](../README.md) and
[roadmap](../ROADMAP.md) for features, controls and remaining work.
