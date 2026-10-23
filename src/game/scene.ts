import * as Phaser from 'phaser';
import { Renderer } from './renderer';
import { World } from './world';
import type { Action } from './combat';

export class DungeonScene extends Phaser.Scene {
  painter!: Renderer;
  private keys = new Set<string>();
  private cleanups: (() => void)[] = [];
  constructor(private world: World) {
    super('dungeon');
  }
  create(): void {
    this.painter = new Renderer(document.querySelector('#game')!, this.world);
    const down = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('input,select,textarea,dialog')) return;
      const key = event.key.toLowerCase();
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key))
        event.preventDefault();
      this.keys.add(key);
      if (event.repeat) return;
      const actions: Record<string, Action> = {
        j: 'attack',
        k: 'parry',
        ' ': 'dodge',
        e: 'interact',
        q: 'technique',
      };
      if (actions[key]) this.world.input(actions[key]);
    };
    const up = (event: KeyboardEvent) => this.keys.delete(event.key.toLowerCase());
    const blur = () => {
      this.keys.clear();
      if (this.world.mode === 'playing') this.world.pause();
    };
    const visibility = () => {
      if (document.hidden) blur();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    this.cleanups.push(
      () => window.removeEventListener('keydown', down),
      () => window.removeEventListener('keyup', up),
      () => window.removeEventListener('blur', blur),
      () => document.removeEventListener('visibilitychange', visibility),
    );
    const pointerDown = (pointer: PointerEvent) => {
      if (this.world.mode !== 'playing') return;
      this.world.audio.unlock();
      this.world.input(pointer.button === 2 ? 'parry' : 'attack');
    };
    const pointerMove = (pointer: PointerEvent) => {
      const rect = this.painter.canvas.getBoundingClientRect();
      if (this.world.mode === 'playing')
        this.world.mouseAim = this.painter.screenToWorld(
          pointer.clientX - rect.left,
          pointer.clientY - rect.top,
        );
    };
    const contextMenu = (event: Event) => event.preventDefault();
    this.painter.canvas.addEventListener('pointerdown', pointerDown);
    this.painter.canvas.addEventListener('pointermove', pointerMove);
    this.painter.canvas.addEventListener('contextmenu', contextMenu);
    this.cleanups.push(() => this.painter.destroy());
    this.events.once('shutdown', () => this.cleanups.forEach((fn) => fn()));
  }
  update(_time: number, delta: number): void {
    const held = (...keys: string[]) => keys.some((key) => this.keys.has(key));
    this.world.movement = this.painter.movement(
      Number(held('d', 'arrowright')) - Number(held('a', 'arrowleft')),
      Number(held('s', 'arrowdown')) - Number(held('w', 'arrowup')),
    );
    // Bounded steps keep timing consistent while avoiding catch-up damage after a suspended tab.
    let remaining =
      Math.min(delta / 1000, 0.1) *
      (this.world.debug
        ? this.world.timeScale
        : this.painter.director.entryRemaining > 0
          ? 0.55
          : 1);
    while (remaining > 0) {
      const step = Math.min(remaining, 1 / 120);
      this.world.update(step);
      remaining -= step;
    }
    this.painter.draw(Math.min(delta / 1000, 0.05));
  }
}
