import * as Phaser from 'phaser';
import { Renderer, VIEW } from './renderer';
import { World } from './world';
import type { Action } from './combat';

export class DungeonScene extends Phaser.Scene {
  painter!: Renderer;
  private keys = new Set<string>();
  private texture!: Phaser.Textures.CanvasTexture;
  private cleanups: (() => void)[] = [];
  constructor(private world: World) {
    super('dungeon');
  }
  create(): void {
    this.texture = this.textures.createCanvas('the-descent', VIEW.width, VIEW.height)!;
    this.add.image(0, 0, 'the-descent').setOrigin(0);
    this.painter = new Renderer(this.texture.getContext(), this.world);
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
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.world.mode !== 'playing') return;
      this.world.audio.unlock();
      this.world.input(pointer.rightButtonDown() ? 'parry' : 'attack');
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.world.mode === 'playing')
        this.world.mouseAim = this.painter.screenToWorld(pointer.x, pointer.y);
    });
    this.events.once('shutdown', () => this.cleanups.forEach((fn) => fn()));
  }
  update(_time: number, delta: number): void {
    const held = (...keys: string[]) => keys.some((key) => this.keys.has(key));
    this.world.movement = {
      x: Number(held('d', 'arrowright')) - Number(held('a', 'arrowleft')),
      y: Number(held('s', 'arrowdown')) - Number(held('w', 'arrowup')),
    };
    // Bounded steps keep timing consistent while avoiding catch-up damage after a suspended tab.
    let remaining = Math.min(delta / 1000, 0.1) * (this.world.debug ? this.world.timeScale : 1);
    while (remaining > 0) {
      const step = Math.min(remaining, 1 / 120);
      this.world.update(step);
      remaining -= step;
    }
    this.painter.draw(Math.min(delta / 1000, 0.05));
    this.texture.refresh();
  }
}
