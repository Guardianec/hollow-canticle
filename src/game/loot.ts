import { RELICS, type Relic } from './data';
import { ITEMS } from './items';
import { Random } from './random';
import type { RoomKind } from './dungeon';

export type LootKind = 'nothing' | 'embers' | 'item' | 'healing' | 'blessing' | 'relic';
export const LOOT_WEIGHTS: Record<LootKind, number> = {
  nothing: 25,
  embers: 20,
  item: 20,
  healing: 6,
  blessing: 5,
  relic: 24,
};
export interface Loot {
  kind: LootKind;
  item?: string;
  amount?: number;
}
export class LootDirector {
  private rng: Random;
  private misses = 0;
  readonly pool: Relic[];
  constructor(seed: string) {
    this.rng = new Random(seed + ':v04:loot');
    this.pool = this.rng
      .shuffle(RELICS.filter((r) => r.rarity !== 'Sacred'))
      .slice(0, 9)
      .concat(this.rng.shuffle(RELICS.filter((r) => r.rarity === 'Sacred')).slice(0, 2));
  }
  roll(room: RoomKind, forced?: LootKind): Loot {
    const chance =
      room === 'boss'
        ? 1
        : room === 'secret'
          ? 0.95
          : room === 'treasure'
            ? 0.9
            : room === 'elite'
              ? 0.72
              : 0.24;
    const kind =
      forced ??
      (room === 'shrine'
        ? this.rng.next() < 0.3
          ? 'relic'
          : 'blessing'
        : this.rng.next() < Math.min(1, chance + this.misses * 0.025)
          ? 'relic'
          : this.rng.weighted(
              ['nothing', 'embers', 'item', 'healing', 'blessing'] as const,
              (k) => LOOT_WEIGHTS[k],
            ));
    if (kind === 'relic') this.misses = 0;
    else this.misses = Math.min(6, this.misses + 1);
    if (kind === 'item')
      return {
        kind,
        item: this.rng.weighted(ITEMS, (i) =>
          i.id === 'silver' ? 0.3 : ['crimson', 'water'].includes(i.id) ? 0.65 : 1,
        ).id,
      };
    return {
      kind,
      amount: kind === 'embers' ? this.rng.int(1, 3) : kind === 'healing' ? 12 : undefined,
    };
  }
  choices(owned: Relic[], room: RoomKind): Relic[] {
    const pool = this.pool.filter(
      (r) => !owned.some((o) => o.id === r.id) && (room !== 'boss' || r.rarity !== 'Faded'),
    );
    const result: Relic[] = [];
    const count = room === 'boss' || room === 'secret' ? 3 : this.rng.int(1, 3);
    for (let i = 0; i < count && pool.length; i++) {
      const selected = this.rng.weighted(pool, (r) =>
        r.rarity === 'Faded'
          ? 6
          : r.rarity === 'Rare'
            ? 3
            : room === 'boss' || room === 'secret'
              ? 2
              : 0.5,
      );
      result.push(selected);
      pool.splice(pool.indexOf(selected), 1);
    }
    return result;
  }
}
