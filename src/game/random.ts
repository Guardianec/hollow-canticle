/** All generated content uses this PRNG; rendering never consumes the content stream. */
export class Random {
  private state: number;
  constructor(seed: string) {
    let value = 2166136261;
    for (const c of seed) value = Math.imul(value ^ c.charCodeAt(0), 16777619);
    this.state = value >>> 0;
  }
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  pick<T>(items: readonly T[]): T {
    if (!items.length) throw new Error('Cannot choose from an empty collection');
    return items[this.int(0, items.length - 1)];
  }
  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  weighted<T>(items: readonly T[], weight: (item: T) => number): T {
    const total = items.reduce((sum, item) => sum + Math.max(0, weight(item)), 0);
    if (total <= 0) return this.pick(items);
    let roll = this.next() * total;
    for (const item of items) {
      roll -= Math.max(0, weight(item));
      if (roll <= 0) return item;
    }
    return items[items.length - 1];
  }
}

export const recentWeight = (id: string, history: readonly string[]): number =>
  history.includes(id) ? 0.18 : 1;

export function normalizeSeed(value: string): string {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9 _-]/g, '')
      .slice(0, 40) || 'CANDLE-001'
  );
}
