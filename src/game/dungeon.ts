import { BIOMES, ENEMIES } from './data';
import { Random, recentWeight } from './random';

export type RoomKind =
  | 'start'
  | 'combat'
  | 'elite'
  | 'treasure'
  | 'shrine'
  | 'hazard'
  | 'healing'
  | 'secret'
  | 'exit'
  | 'boss';
export type Modifier = 'Quiet' | 'Darkness' | 'Resonant' | 'Blood pact' | 'Unstable' | 'Silence';
export interface Room {
  id: number;
  x: number;
  y: number;
  kind: RoomKind;
  name: string;
  template: string;
  variant: number;
  links: number[];
  enemies: string[];
  budget: number;
  modifier: Modifier;
  elite: 'Patient' | 'Relentless' | 'Armored';
  visited: boolean;
  cleared: boolean;
  claimed: boolean;
}
export interface Floor {
  depth: number;
  biome: number;
  hybrid: number | null;
  rooms: Room[];
  seed: string;
}
export interface Obstacle {
  x: number;
  y: number;
  radius: number;
  type: 'pillar' | 'rubble' | 'tomb';
}

const templates = [
  'cloister',
  'nave',
  'gallery',
  'crossing',
  'ossuary',
  'sanctum',
  'cistern',
  'bastion',
];
const roomNames: Record<RoomKind, string[]> = {
  start: ['The Threshold', 'Pilgrim’s Rest'],
  combat: [
    'Hall of the Unremembered',
    'The Broken Procession',
    'Watch of Ash',
    'The Silent Crossing',
  ],
  elite: ['The Last Vigil', 'Chamber of Judgement'],
  treasure: ['A Forgotten Offering', 'The Reliquary'],
  shrine: ['Shrine of the Unsaid', 'A Candle for No One'],
  hazard: ['The Sinking Walk', 'Passage of Thorns'],
  healing: ['The Quiet Well', 'Sanctuary of Breath'],
  secret: ['Behind the Prayer', 'The Hidden Choir'],
  exit: ['The Descent'],
  boss: ['The Unrung Belfry'],
};

export function makeFloor(seed: string, depth: number): Floor {
  const rng = new Random(`${seed}:floor:${depth}`);
  const biome = (depth - 1) % BIOMES.length;
  const hybrid = depth > 5 ? (biome + rng.int(1, 4)) % 5 : null;
  const rooms: Room[] = [];
  const history: string[] = [];
  const add = (x: number, y: number, kind: RoomKind): number => {
    const template = rng.weighted(templates, (t) => recentWeight(t, history.slice(-3)));
    history.push(template);
    const budget =
      kind === 'boss' ? 10 : kind === 'elite' ? 8 : Math.min(9, 3 + Math.floor(depth / 2));
    const enemies = encounter(rng, kind, budget, biome, depth);
    const room: Room = {
      id: rooms.length,
      x,
      y,
      kind,
      name: rng.pick(roomNames[kind]),
      template,
      variant: rng.int(0, 3),
      links: [],
      enemies,
      budget,
      modifier:
        enemies.length && depth > 1
          ? rng.pick([
              'Quiet',
              'Quiet',
              'Darkness',
              'Resonant',
              'Blood pact',
              'Unstable',
              'Silence',
            ] as const)
          : 'Quiet',
      elite: rng.pick(['Patient', 'Relentless', 'Armored'] as const),
      visited: false,
      cleared: !enemies.length,
      claimed: false,
    };
    rooms.push(room);
    return room.id;
  };
  const link = (a: number, b: number) => {
    rooms[a].links.push(b);
    rooms[b].links.push(a);
  };
  // A readable spine with optional loops. Rewards never gate the mandatory route.
  const start = add(0, 1, 'start');
  const first = add(1, 1, 'combat');
  const middle = add(2, 1, 'combat');
  const guardian = add(3, 1, depth % 3 === 0 ? 'boss' : 'elite');
  const exit = add(4, 1, 'exit');
  link(start, first);
  link(first, middle);
  link(middle, guardian);
  link(guardian, exit);
  const upper = add(1, 0, rng.pick(['shrine', 'healing'] as const));
  const trap = add(2, 0, 'hazard');
  const upperReward = add(3, 0, 'treasure');
  link(first, upper);
  link(upper, trap);
  link(trap, upperReward);
  link(upperReward, guardian);
  const lower = add(1, 2, 'treasure');
  const challenge = add(2, 2, rng.pick(['combat', 'elite'] as const));
  const rest = add(3, 2, 'healing');
  link(first, lower);
  link(lower, challenge);
  link(challenge, rest);
  link(rest, guardian);
  if (rng.next() > 0.35) link(middle, trap);
  if (rng.next() > 0.35) link(middle, challenge);
  const secret = add(4, 0, 'secret');
  link(upperReward, secret);
  rooms[start].visited = true;
  return { seed, depth, biome, hybrid, rooms };
}

export function encounter(
  rng: Random,
  kind: RoomKind,
  budget: number,
  biome: number,
  depth: number,
): string[] {
  if (kind === 'boss') return ['boss'];
  if (kind === 'elite')
    return [
      rng.pick(ENEMIES.filter((e) => e.cost >= 4 && e.id !== 'boss' && e.affinity.includes(biome)))
        .id,
    ];
  if (kind !== 'combat') return [];
  if (depth === 1 && budget === 3) return [rng.pick(['warden', 'spear'])];
  const pool = ENEMIES.filter(
    (e) => e.id !== 'boss' && e.cost <= budget && e.affinity.includes(biome),
  );
  const first = rng.pick(pool);
  const result = [first.id];
  // One heavy/fast specialist and at most one support. Only one attack token is issued.
  if (depth > 1) {
    const support = pool.filter(
      (e) => e.cost <= budget - first.cost && (first.speed < 110 || e.speed < 110),
    );
    if (support.length && rng.next() > 0.3) result.push(rng.pick(support).id);
  }
  return result;
}

export function obstaclesFor(room: Room, biome: number): Obstacle[] {
  const layouts: Record<string, Obstacle[]> = {
    cloister: [
      { x: 300, y: 240, radius: 28, type: 'pillar' },
      { x: 820, y: 240, radius: 28, type: 'pillar' },
      { x: 300, y: 540, radius: 28, type: 'pillar' },
      { x: 820, y: 540, radius: 28, type: 'pillar' },
    ],
    nave: [
      { x: 340, y: 240, radius: 24, type: 'pillar' },
      { x: 780, y: 240, radius: 24, type: 'pillar' },
      { x: 340, y: 540, radius: 24, type: 'pillar' },
      { x: 780, y: 540, radius: 24, type: 'pillar' },
    ],
    gallery: [
      { x: 280, y: 230, radius: 34, type: 'tomb' },
      { x: 840, y: 530, radius: 34, type: 'tomb' },
    ],
    crossing: [
      { x: 350, y: 230, radius: 24, type: 'rubble' },
      { x: 770, y: 530, radius: 24, type: 'rubble' },
    ],
    ossuary: [
      { x: 270, y: 220, radius: 35, type: 'tomb' },
      { x: 850, y: 220, radius: 35, type: 'tomb' },
      { x: 270, y: 550, radius: 30, type: 'tomb' },
      { x: 850, y: 550, radius: 30, type: 'tomb' },
    ],
    sanctum: [
      { x: 300, y: 380, radius: 29, type: 'pillar' },
      { x: 820, y: 380, radius: 29, type: 'pillar' },
    ],
    cistern: [
      { x: 300, y: 250, radius: 32, type: 'rubble' },
      { x: 820, y: 510, radius: 32, type: 'rubble' },
    ],
    bastion: [
      { x: 320, y: 230, radius: 28, type: 'pillar' },
      { x: 800, y: 230, radius: 28, type: 'pillar' },
      { x: 320, y: 530, radius: 28, type: 'rubble' },
      { x: 800, y: 530, radius: 28, type: 'rubble' },
    ],
  };
  if (room.kind === 'boss') return layouts.cloister;
  return layouts[room.template].map((o) => ({
    ...o,
    x: room.variant % 2 ? 1120 - o.x : o.x,
    y: room.variant > 1 ? 760 - o.y : o.y,
    type: biome === 4 && o.type === 'tomb' ? 'rubble' : o.type,
  }));
}

export function reachable(floor: Floor, from = 0): Set<number> {
  const seen = new Set<number>([from]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++)
    for (const id of floor.rooms[queue[i]].links) {
      if (!seen.has(id)) {
        seen.add(id);
        queue.push(id);
      }
    }
  return seen;
}

export function doorPosition(a: Room, b: Room): { x: number; y: number } {
  return { x: b.x > a.x ? 1040 : b.x < a.x ? 80 : 560, y: b.y > a.y ? 674 : b.y < a.y ? 86 : 380 };
}
