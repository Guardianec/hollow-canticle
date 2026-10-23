export type BuffId = 'water' | 'iron' | 'oil' | 'moth' | 'salt' | 'ash' | 'glass' | 'ward';
export interface BuffDef {
  id: BuffId;
  name: string;
  glyph: string;
  duration: number;
  damage?: number;
  pressure?: number;
  incoming?: number;
  incomingPosture?: number;
  speed?: number;
  recharge?: number;
  counter?: number;
  healing?: number;
}
export const BUFFS: BuffDef[] = [
  { id: 'water', name: 'Quiet Water', glyph: '≈', duration: 8, healing: 25 / 8 },
  { id: 'iron', name: 'Iron Incense', glyph: '♜', duration: 15, incomingPosture: 0.65 },
  { id: 'oil', name: 'Bell Oil', glyph: '♧', duration: 12, pressure: 1.2 },
  { id: 'moth', name: 'Moth Draught', glyph: '⋈', duration: 12, speed: 1.15 },
  { id: 'salt', name: 'Pilgrim Salt', glyph: '✧', duration: 14, counter: 1.3 },
  { id: 'ash', name: 'Ash Cordial', glyph: '⌇', duration: 16, recharge: 1.6 },
  { id: 'glass', name: 'Glass Tonic', glyph: '◇', duration: 12, damage: 1.35, incoming: 1.2 },
  { id: 'ward', name: 'Warding Thread', glyph: '⌘', duration: 20 },
];
export interface ActiveBuff {
  id: BuffId;
  startedAt: number;
  duration: number;
  stacks: 1;
  source: string;
}
export class Buffs {
  active: ActiveBuff[] = [];
  add(id: BuffId, time: number, source = 'item'): void {
    const def = BUFFS.find((b) => b.id === id)!;
    this.active = this.active.filter((b) => b.id !== id);
    this.active.push({ id, startedAt: time, duration: def.duration, stacks: 1, source });
  }
  expire(time: number): void {
    this.active = this.active.filter((b) => time < b.startedAt + b.duration);
  }
  consume(id: BuffId): boolean {
    const had = this.active.some((b) => b.id === id);
    this.active = this.active.filter((b) => b.id !== id);
    return had;
  }
  modifier(
    key: 'damage' | 'pressure' | 'incoming' | 'incomingPosture' | 'speed' | 'recharge' | 'counter',
  ): number {
    return this.active.reduce(
      (value, b) => value * (BUFFS.find((d) => d.id === b.id)![key] ?? 1),
      1,
    );
  }
  get healing(): number {
    return this.active.reduce((n, b) => n + (BUFFS.find((d) => d.id === b.id)!.healing ?? 0), 0);
  }
  clear(): void {
    this.active = [];
  }
}
