import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeFloor } from '../src/game/dungeon';
import { LootDirector, LOOT_WEIGHTS } from '../src/game/loot';
import { ITEMS } from '../src/game/items';
import { World } from '../src/game/world';
import { defaultSave, recordRun, RUN_HISTORY_KEY } from '../src/game/save';
import { canStand, pathBetween } from '../src/game/geometry';
import type { Relic } from '../src/game/data';

beforeEach(() => {
  vi.stubGlobal('location', { search: '' });
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
});

describe('procedural journey audit', () => {
  it('records at most ten local summaries and recovers damaged or unavailable storage', () => {
    const w = new World(defaultSave()),
      write = vi.fn();
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify(Array.from({ length: 20 }, () => ({}))),
      setItem: write,
    });
    expect(recordRun('LOCAL', 'sword', 2, w.stats)).toBe(true);
    expect(write.mock.calls[0][0]).toBe(RUN_HISTORY_KEY);
    expect(JSON.parse(write.mock.calls[0][1])).toHaveLength(10);
    vi.stubGlobal('localStorage', { getItem: () => '{bad', setItem: write });
    expect(recordRun('LOCAL', 'sword', 2, w.stats)).toBe(true);
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw Error('blocked');
      },
    });
    expect(recordRun('LOCAL', 'sword', 2, w.stats)).toBe(false);
  });
  it('simulates 200 completionist six-floor reward journeys with attrition and rarity accounting', () => {
    const counts = Object.fromEntries(Object.keys(LOOT_WEIGHTS).map((k) => [k, 0]));
    let ordinary = 0,
      ordinaryRelics = 0,
      healingSupply = 0,
      consecutiveEmpty = 0,
      maxDrought = 0;
    const relicsByFloor = Array.from({ length: 6 }, () => 0);
    for (let seed = 0; seed < 200; seed++) {
      const loot = new LootDirector(`JOURNEY-${seed}`),
        owned: Relic[] = [];
      for (let depth = 1; depth <= 6; depth++) {
        const floor = makeFloor(`JOURNEY-${seed}`, depth);
        for (const room of floor.rooms.filter((r) =>
          ['combat', 'elite', 'boss', 'treasure', 'shrine', 'secret'].includes(r.kind),
        )) {
          const reward = loot.roll(room.kind);
          counts[reward.kind]++;
          if (room.kind === 'combat') {
            ordinary++;
            ordinaryRelics += Number(reward.kind === 'relic');
          }
          if (reward.kind === 'relic') {
            consecutiveEmpty = 0;
            const choice = loot.choices(owned, room.kind)[0];
            if (choice) {
              owned.push(choice);
              relicsByFloor[depth - 1]++;
            }
          } else {
            consecutiveEmpty++;
            maxDrought = Math.max(maxDrought, consecutiveEmpty);
          }
          if (reward.kind === 'healing') healingSupply += reward.amount!;
          if (reward.item) {
            const item = ITEMS.find((i) => i.id === reward.item)!;
            healingSupply += item.heal ?? (item.id === 'water' ? 25 : 0);
          }
        }
      }
      expect(owned.length).toBeLessThanOrEqual(11);
    }
    expect(ordinaryRelics / ordinary).toBeLessThan(0.38);
    expect(maxDrought).toBeGreaterThanOrEqual(3);
    expect(relicsByFloor[5]).toBeLessThan(relicsByFloor[0]);
    console.info(
      'JOURNEY_AUDIT',
      JSON.stringify({
        seeds: 200,
        floors: 1200,
        counts,
        ordinaryRelicPercent: +((ordinaryRelics / ordinary) * 100).toFixed(2),
        healingFromRandomLootPerFloor: +(healingSupply / 1200).toFixed(2),
        relicsPerFloor: relicsByFloor.map((n) => +(n / 200).toFixed(2)),
        maxDrought,
      }),
    );
  });
  it('keeps relics meaningful on main routes with one optional reward branch per floor', () => {
    const byFloor = [0, 0, 0, 0, 0, 0];
    let ordinary = 0,
      ordinaryRelics = 0;
    for (let seed = 0; seed < 200; seed++) {
      const loot = new LootDirector(`ROUTE-${seed}`),
        owned: Relic[] = [];
      for (let depth = 1; depth <= 6; depth++) {
        const floor = makeFloor(`ROUTE-${seed}`, depth);
        const branch =
          floor.rooms.find((r) => r.kind === (seed % 2 ? 'treasure' : 'shrine')) ??
          floor.rooms.find((r) => r.kind === 'treasure')!;
        for (const room of [...floor.rooms.slice(1, 4), branch]) {
          const roll = loot.roll(room.kind);
          if (room.kind === 'combat') {
            ordinary++;
            ordinaryRelics += Number(roll.kind === 'relic');
          }
          if (roll.kind === 'relic') {
            const chosen = loot.choices(owned, room.kind)[0];
            if (chosen) {
              owned.push(chosen);
              byFloor[depth - 1]++;
            }
          }
        }
      }
    }
    expect(byFloor[4]).toBeGreaterThan(40);
    console.info(
      'ROUTE_AUDIT',
      JSON.stringify({
        seeds: 200,
        relicsPerFloor: byFloor.map((n) => +(n / 200).toFixed(2)),
        ordinaryRelicPercent: +((ordinaryRelics / ordinary) * 100).toFixed(2),
      }),
    );
  });
  it('converts exhausted relic pools into a rare consumable without free healing', () => {
    const w = new World(defaultSave());
    w.start('EXHAUSTED', 'sword');
    w.relics = [...w.loot.pool];
    w.player.hp = 20;
    w.openReward();
    expect(w.player.hp).toBe(20);
    expect(w.pickups[0].item).toBe('silver');
    expect(w.mode).toBe('playing');
  });
  it('places ranged support on reachable floor away from masonry across procedural rooms', () => {
    let checked = 0;
    for (let seed = 0; seed < 50; seed++) {
      const w = new World(defaultSave());
      w.start(`SPAWN-${seed}`, 'sword');
      w.floor = makeFloor(w.seed, 2 + (seed % 5));
      for (const room of w.floor.rooms.filter((r) =>
        r.enemies.some((id) => ['archer', 'hexer'].includes(id)),
      )) {
        w.enterRoom(room.id);
        for (const e of w.enemies.filter((e) => ['archer', 'hexer'].includes(e.def.id))) {
          expect(canStand(room, e.x, e.y, 24)).toBe(true);
          expect(w.obstacles.every((o) => Math.hypot(e.x - o.x, e.y - o.y) > o.radius + 24)).toBe(
            true,
          );
          expect(pathBetween(room, { x: 560, y: 380 }, e).length).toBeGreaterThan(0);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(25);
  });
});
