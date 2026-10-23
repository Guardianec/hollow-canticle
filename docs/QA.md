# v0.1.0 QA record

Validated locally on 2026-10-23. This records observed checks, not a claim of
cross-browser certification or completed human balance playtesting.

## Automated

31 Vitest checks pass. The suite covers:

- Seed replay, separate streams, weighted selection, anti-repeat weighting, and seed sanitation.
- 10,000 generated floors through depth 10,000: connected rooms, reachable exit,
  reciprocal adjacent doors, obstacle clearance, encounter budgets, biome affinity,
  reward/recovery availability, and fair group composition.
- Perfect/normal/failed parries, dodge immunity, un-parryable attacks, greatblade
  heavy counters, weapon windows, posture pressure, and buffered inputs.
- Corrupt and unknown save versions, validated fields, and save round-tripping.
- Movement and collision, actor separation, counters, guard break/recovery,
  finishers, relic selection, two guardian phases, death, replay, pausing,
  backtracking, biome descent, training safety, and bounded deep-run health.
- Every enemy × every weapon in a short simulated exchange; one attack token in groups.
- Relic healing, wards, burns, Focus, and the shockwave regression in a single duel.

Final commands: `npm install`, `npm run lint`, `npm run test`, `npm run build`.
Lint and strict TypeScript pass. Production build succeeds. Test runtime is about
17 seconds on this machine. Node 22.12 reports a visitor-key dependency engine
recommendation; CI is configured for Node 24.

## Browser checks

The built `dist/` was served with Vite preview and opened in the app's browser.

- Main menu, seeded setup, entering the first duel, and exploration-to-combat framing.
- Keyboard movement, strike, deflection, evade, E interaction, and pause.
- Safe training: live ordinary and perfect parries, a guard execution, and the
  tutorial completion dialog. Slowed QA timing was used to inspect the parries.
- Death summary, same-seed replay, and pause seed display.
- Settings from a paused run; assistance/reduced-motion values surviving reload.
- Guardian first execution enters phase two; second execution clears the encounter
  and opens a relic choice. QA guard-break tools were used for those phase checks.
- Keyboard relic selection closes the dialog and adds the chosen relic to the run.
- Spear switching and a Drowned Cantor encounter in the flooded biome via QA tools.
- QA depth changes across the five biome families and a frozen-foundry mutation at depth 10,000.
- Main menu at 1440×900 and 768×1024; 390×844 menu and loadout dialog, including the
  keyboard requirement notice. No clipping or unintended horizontal overflow observed.
- No captured production console errors or warnings during those checks.

Screenshots in `docs/screenshots/` are actual browser captures. The menu and relic
screenshots show the normal presentation; QA tools are hidden behind the reward dialog.

## Practical limits

Combat balance still needs experienced human players and longer uninterrupted runs.
No controller, touch gameplay, active-run resume, or ranged support enemy is included.
Performance on low-end devices and browsers outside this environment is unmeasured.
GitHub CI and Pages workflows are configured but have not run remotely because no
GitHub remote is connected. The static build itself was verified locally.
