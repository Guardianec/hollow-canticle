import * as Phaser from 'phaser';
import { DungeonScene } from './game/scene';
import { World } from './game/world';
import { loadSave } from './game/save';
import { Interface } from './ui';
import { VIEW } from './game/renderer';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-600.css';
import './styles/main.css';

const world = new World(loadSave());
const ui = new Interface(world);
const game = new Phaser.Game({
  type: Phaser.CANVAS,
  parent: 'game',
  width: VIEW.width,
  height: VIEW.height,
  backgroundColor: '#0a1116',
  transparent: false,
  antialias: true,
  scene: [new DungeonScene(world)],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  banner: false,
  audio: { noAudio: true },
  fps: { target: 60 },
});

setInterval(() => ui.update(), 100);
window.addEventListener('pagehide', () => world.audio.ambience(false, true));

// Deliberate local QA surface; never enabled unless the URL requests it.
if (world.debug) Object.assign(window, { canticle: { world, game, ui } });
