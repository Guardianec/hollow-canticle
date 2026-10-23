import { BALANCE, type Strike, type Weapon } from './data';

export type Defense = 'perfect' | 'parry' | 'dodge' | 'hit' | 'miss';
export interface DefenseInput {
  strike: Strike;
  distance: number;
  parryAge: number;
  dodgeAge: number;
  weapon: Weapon;
  assist: boolean;
  bonusWindow: number;
}
export function resolveDefense(input: DefenseInput): Defense {
  const { strike, distance, parryAge, dodgeAge, weapon, assist, bonusWindow } = input;
  if (distance > strike.reach + 24) return 'miss';
  if (dodgeAge >= 0 && dodgeAge <= BALANCE.dodgeInvulnerable) return 'dodge';
  const perfect = BALANCE.perfect + (assist ? 0.045 : 0);
  const window = weapon.parry + (assist ? 0.1 : 0) + bonusWindow;
  if (strike.kind === 'grab' || strike.kind === 'sweep') return 'hit';
  if (strike.kind === 'smash')
    return weapon.id === 'great' && parryAge >= 0 && parryAge < perfect ? 'perfect' : 'hit';
  if (parryAge >= 0 && parryAge <= perfect) return 'perfect';
  if (parryAge >= 0 && parryAge <= window) return 'parry';
  return 'hit';
}

export function posturePressure(
  base: number,
  focus: number,
  counter: boolean,
  spearCounter = false,
): number {
  return (
    base *
    (1 + Math.floor(Math.min(99, focus) / 34) * 0.12) *
    (counter ? (spearCounter ? 2 : 1.6) : 1)
  );
}

export type Action = 'attack' | 'parry' | 'dodge' | 'interact' | 'technique';
export class InputBuffer {
  private queue: { action: Action; until: number }[] = [];
  push(action: Action, time: number): void {
    this.queue = this.queue.filter((e) => e.action !== action);
    this.queue.push({ action, until: time + BALANCE.buffer });
  }
  consume(time: number, allowed: (action: Action) => boolean): Action | undefined {
    this.queue = this.queue.filter((e) => e.until >= time);
    const index = this.queue.findIndex((e) => allowed(e.action));
    if (index < 0) return;
    return this.queue.splice(index, 1)[0].action;
  }
  clear(): void {
    this.queue = [];
  }
}

export function finisherStyle(weapon: string, enemy: string, perfect: boolean): string {
  if (enemy === 'boss') return 'THE LAST TOLL';
  if (enemy === 'shield') return 'AEGIS SHATTERED';
  if (perfect) return 'SILVER REQUIEM';
  return weapon === 'great'
    ? 'FINAL JUDGEMENT'
    : weapon === 'spear'
      ? 'PILGRIM’S END'
      : weapon === 'twins'
        ? 'MOTH’S EMBRACE'
        : 'OATH FULFILLED';
}
