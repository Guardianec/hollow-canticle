import type { Strike } from './data';

export interface Reservation {
  enemy: number;
  at: number;
  until: number;
  special: boolean;
}

/** Committed impact times never move in response to player input. */
export class ThreatDirector {
  readonly reservations: Reservation[] = [];
  clear(): void {
    this.reservations.length = 0;
  }
  release(enemy: number): void {
    for (let i = this.reservations.length - 1; i >= 0; i--)
      if (this.reservations[i].enemy === enemy) this.reservations.splice(i, 1);
  }
  prune(time: number): void {
    for (let i = this.reservations.length - 1; i >= 0; i--)
      if (this.reservations[i].until < time) this.reservations.splice(i, 1);
  }
  reserve(enemy: number, time: number, strike: Strike, depth: number): boolean {
    this.prune(time);
    if (this.reservations.some((r) => r.enemy === enemy)) return false;
    const special = ['smash', 'sweep', 'grab'].includes(strike.kind);
    const at = time + strike.windup;
    // Even mixed dodge/parry sequences leave a full evade cooldown between threats.
    if (
      this.reservations.some(
        (r) => Math.abs(r.at - at) < (special || r.special ? 0.72 : depth >= 5 ? 0.4 : 0.48),
      )
    )
      return false;
    if (this.reservations.filter((r) => r.at > time).length >= 2) return false;
    this.reservations.push({ enemy, at, until: at + 0.72, special });
    return true;
  }
}
