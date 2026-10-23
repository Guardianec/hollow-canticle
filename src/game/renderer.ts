import { BALANCE, BIOMES } from './data';
import { doorPosition, type Obstacle } from './dungeon';
import { Random } from './random';
import { World, type Enemy, type Effect } from './world';

export const VIEW = { width: 1440, height: 900 };
const TAU = Math.PI * 2;
const serif = 'Georgia, "Times New Roman", serif';
const mono = '"Courier New", monospace';

function polygon(
  c: CanvasRenderingContext2D,
  points: number[][],
  fill: string,
  stroke?: string,
): void {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.stroke();
  }
}
function line(c: CanvasRenderingContext2D, points: number[][], color: string, width = 1): void {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}
function ellipse(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
): void {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  c.fillStyle = color;
  c.fill();
}
function glow(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha = 0.25,
): void {
  const gradient = c.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.22, color + '99');
  gradient.addColorStop(1, color + '00');
  c.save();
  c.globalAlpha = alpha;
  c.globalCompositeOperation = 'screen';
  c.fillStyle = gradient;
  c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  c.restore();
}
function text(
  c: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign = 'center',
  family = serif,
): void {
  c.font = `${Math.max(size, 12)}px ${family}`;
  c.fillStyle = color;
  c.textAlign = align;
  c.fillText(value, x, y);
}

export class Renderer {
  private floorCanvas = document.createElement('canvas');
  private cachedRevision = -1;
  private zoom = 1;
  private cx = 560;
  private cy = 380;
  private viewportY = 465;
  private cacheTime = 0;
  constructor(
    private c: CanvasRenderingContext2D,
    private world: World,
  ) {
    this.floorCanvas.width = 1200;
    this.floorCanvas.height = 900;
  }
  screenToWorld(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - 720) / this.zoom + this.cx,
      y: (y - this.viewportY) / (this.zoom * 0.82) + this.cy,
    };
  }
  draw(dt: number): void {
    const c = this.c,
      w = this.world,
      p = w.player;
    const menu = w.mode === 'menu';
    const target = w.target;
    const reduced = w.save.settings.reducedMotion;
    let targetZoom = menu ? 1.12 : w.combat ? 1.34 : 1.04;
    if (w.alive.length > 1) targetZoom = 1.17;
    if (p.state === 'finisher') targetZoom += reduced ? 0 : 0.12;
    const easing = reduced ? 1 : 1 - Math.exp(-dt * 3.3);
    this.zoom += (targetZoom - this.zoom) * easing;
    const targetX = menu ? 670 : target ? (p.x + target.x) / 2 : 560 + (p.x - 560) * 0.18;
    const targetY = target ? (p.y + target.y) / 2 : 380 + (p.y - 380) * 0.12;
    this.cx += (Math.min(690, Math.max(430, targetX)) - this.cx) * easing;
    this.cy += (Math.min(450, Math.max(310, targetY)) - this.cy) * easing;
    c.clearRect(0, 0, VIEW.width, VIEW.height);
    c.fillStyle = '#0b1114';
    c.fillRect(0, 0, VIEW.width, VIEW.height);
    this.background(c);
    if (this.cachedRevision !== w.roomRevision) {
      this.createFloor();
      this.cachedRevision = w.roomRevision;
      this.cacheTime = w.visualTime;
    }
    c.save();
    const shake = !reduced && w.save.settings.shake ? w.shake : 0;
    c.translate(
      720 + Math.sin(w.visualTime * 97) * shake,
      this.viewportY + Math.cos(w.visualTime * 113) * shake * 0.6,
    );
    c.scale(this.zoom, this.zoom * 0.82);
    c.translate(-this.cx, -this.cy);
    c.drawImage(this.floorCanvas, -40, -110);
    this.floorDetails(c);
    this.doors(c);
    this.hazards(c);
    this.interactable(c);
    // Ground effects and silhouettes are sorted independently from high masonry.
    for (const e of w.enemies) if (e.state === 'dead') this.corpse(c, e);
    for (const e of w.alive) {
      ellipse(c, e.x, e.y + 3, 26 * e.def.scale, 11 * e.def.scale, '#06090ba0');
      if (e.state === 'tell') this.telegraph(c, e);
      if (e.state === 'broken') {
        glow(c, e.x, e.y, 100, '#f1bd6b', 0.16);
        ellipse(c, e.x, e.y + 2, 33, 15, '#d9a75a25');
      }
    }
    glow(c, p.x, p.y - 10, 145, '#a8d1d3', w.combat ? 0.07 : 0.09);
    ellipse(c, p.x, p.y + 2, 26, 10, '#020507bc');
    const drawables: { y: number; draw: () => void }[] = w.obstacles.map((o) => ({
      y: o.y,
      draw: () => this.obstacle(c, o),
    }));
    for (const e of w.alive)
      drawables.push({ y: e.y, draw: () => this.character(c, e.x, e.y, e.facing, false, e) });
    drawables.push({ y: p.y, draw: () => this.character(c, p.x, p.y, p.facing, true) });
    drawables.sort((a, b) => a.y - b.y).forEach((d) => d.draw());
    for (const e of w.effects) this.effect(c, e);
    this.torches(c);
    for (const particle of w.particles) {
      c.globalAlpha = particle.life / particle.maxLife;
      line(
        c,
        [
          [particle.x, particle.y],
          [particle.x - particle.vx * 0.026, particle.y - particle.vy * 0.026],
        ],
        particle.color,
        particle.size,
      );
    }
    c.globalAlpha = 1;
    this.motes(c);
    if (w.room.modifier === 'Darkness') {
      const darkness = c.createRadialGradient(p.x, p.y - 20, 80, p.x, p.y - 20, 450);
      darkness.addColorStop(0, '#020a1000');
      darkness.addColorStop(0.6, '#020a1060');
      darkness.addColorStop(1, '#020a10b0');
      c.fillStyle = darkness;
      c.fillRect(30, -80, 1060, 850);
      for (const e of w.alive) if (e.state === 'tell') this.telegraph(c, e);
    }
    if (w.debug) this.debug(c);
    const prompt = w.prompt;
    if (prompt) {
      const y = prompt.y - 86;
      glow(c, prompt.x, prompt.y - 24, 70, '#e4c288', 0.1);
      c.fillStyle = '#0b1216e8';
      c.strokeStyle = '#bea26a77';
      c.lineWidth = 1;
      c.fillRect(prompt.x - 22, y - 24, 44, 34);
      c.strokeRect(prompt.x - 22, y - 24, 44, 34);
      text(c, 'E', prompt.x, y, 20, '#ecd9b4', 'center', mono);
    }
    c.restore();
    this.vignette(c, menu);
    if (menu) return;
    if (w.mode === 'playing' || w.mode === 'paused') {
      this.hud(c);
      if (w.training) this.tutorial(c);
      if (w.toast && w.toast.until > w.time) {
        const alpha = Math.min(1, (w.toast.until - w.time) * 2, (w.time + 0.3) * 3);
        c.save();
        c.globalAlpha = alpha;
        const y = w.combat ? 710 : 735;
        const g = c.createLinearGradient(380, 0, 1060, 0);
        g.addColorStop(0, '#0c121600');
        g.addColorStop(0.2, '#0c1216d0');
        g.addColorStop(0.8, '#0c1216d0');
        g.addColorStop(1, '#0c121600');
        c.fillStyle = g;
        c.fillRect(350, y - 30, 740, 80);
        text(c, w.toast.text, 720, y, 21, w.toast.color);
        text(c, w.toast.sub, 720, y + 26, 13, '#bcc2bc', 'center', mono);
        c.restore();
      }
      if (prompt) {
        text(c, prompt.text, 720, 815, 19, '#e3d4b7');
        text(c, prompt.sub, 720, 839, 11, '#bcac8d', 'center', mono);
      }
    }
    if (w.flash && w.save.settings.flashes) {
      c.fillStyle = `rgba(255,225,175,${w.flash})`;
      c.fillRect(0, 0, 1440, 900);
    }
  }

  private background(c: CanvasRenderingContext2D): void {
    const w = this.world;
    const g = c.createRadialGradient(770, 380, 20, 700, 450, 900);
    g.addColorStop(0, '#253438');
    g.addColorStop(0.5, '#111d23');
    g.addColorStop(1, '#070e13');
    c.fillStyle = g;
    c.fillRect(0, 0, 1440, 900);
    const rng = new Random('distant-ruins');
    for (let i = 0; i < 38; i++) {
      const x = rng.int(0, 1440),
        y = rng.int(20, 900),
        width = rng.int(24, 85),
        height = rng.int(90, 240);
      c.fillStyle = '#0b141a';
      c.fillRect(x, y, width, height);
      c.fillStyle = '#172329';
      c.fillRect(x, y, width, 5);
      c.fillRect(x - 5, y + height - 10, width + 10, 12);
      line(
        c,
        [
          [x + 8, y + 10],
          [x + 8, y + height - 20],
        ],
        '#23303755',
      );
    }
    if (w.save.settings.quality) {
      c.save();
      c.globalAlpha = 0.05;
      for (let i = 0; i < 5; i++) {
        const x = 400 + Math.sin(w.visualTime * 0.025 + i * 2) * 500;
        ellipse(c, x, 420 + i * 75, 550, 70, '#a8b5b6');
      }
      c.restore();
    }
  }

  private createFloor(): void {
    const c = this.floorCanvas.getContext('2d')!;
    const w = this.world,
      b = BIOMES[w.floor.biome];
    const rng = new Random(`${w.seed}:${w.floor.depth}:${w.room.id}:art`);
    c.clearRect(0, 0, 1200, 900);
    c.save();
    c.translate(40, 110);
    // The hall is raised above a void; a thick front edge gives it physical weight.
    c.fillStyle = '#111b20';
    c.fillRect(26, 45, 1068, 705);
    for (let y = 90; y < 730; y += 32)
      for (let x = 30; x < 1090; x += 74) {
        c.fillStyle = ['#182328', '#1f292c', '#232e30'][rng.int(0, 2)];
        c.fillRect(x + (y % 64 ? 20 : 0), y, 70, 29);
      }
    c.fillStyle = b.floor;
    c.fillRect(40, 70, 1040, 640);
    const tile = 46;
    for (let row = 0; row < 14; row++)
      for (let col = 0; col < 24; col++) {
        const x = 42 + col * tile - (row % 2 ? 23 : 0),
          y = 72 + row * tile;
        if (x < 38 || x + tile > 1083 || y + tile > 713) continue;
        c.fillStyle = b.tile;
        c.globalAlpha = rng.int(45, 95) / 100;
        polygon(
          c,
          [
            [x + 2, y + 2],
            [x + 42, y + rng.int(1, 4)],
            [x + 44, y + 43],
            [x + rng.int(1, 4), y + 44],
          ],
          b.tile,
        );
        c.globalAlpha = 1;
        line(
          c,
          [
            [x + 2, y + 44],
            [x + 43, y + 44],
            [x + 44, y + 4],
          ],
          '#0c161c90',
          2,
        );
        line(
          c,
          [
            [x + 3, y + 4],
            [x + 40, y + 3],
          ],
          '#c5cdba13',
        );
        if (rng.next() > 0.72)
          line(
            c,
            [
              [x + 5, y + 16],
              [x + 19, y + 20],
              [x + 23, y + 34],
              [x + 38, y + 43],
            ],
            '#09111675',
          );
        for (let n = 0; n < 3; n++) {
          c.fillStyle = rng.pick(['#abb8b015', '#00080a25']);
          c.fillRect(x + rng.int(4, 40), y + rng.int(4, 40), rng.int(1, 3), 1);
        }
      }
    // Worn brass inlays form a compass, kept faint enough to preserve silhouettes.
    c.save();
    c.translate(560, 390);
    c.strokeStyle = '#c1a56b26';
    c.lineWidth = 2;
    for (const radius of [116, 123, 157]) {
      c.beginPath();
      c.ellipse(0, 0, radius, radius, 0, 0, TAU);
      c.stroke();
    }
    for (let i = 0; i < 16; i++) {
      c.rotate(TAU / 16);
      line(
        c,
        [
          [0, -125],
          [0, -151],
        ],
        '#baa07127',
        i % 4 === 0 ? 4 : 1,
      );
    }
    polygon(
      c,
      [
        [0, -98],
        [16, -17],
        [94, 0],
        [16, 15],
        [0, 96],
        [-16, 15],
        [-94, 0],
        [-16, -17],
      ],
      '#cbb7760c',
      '#bba77630',
    );
    c.restore();
    // Low perimeter masonry, with tall buttresses and broken arches along the back.
    for (let x = 35; x < 1085; x += 50) {
      const height = rng.int(38, 58);
      polygon(
        c,
        [
          [x, 70],
          [x, 70 - height],
          [x + 48, 66 - height],
          [x + 48, 70],
        ],
        '#202b2e',
        '#131e23',
      );
      polygon(
        c,
        [
          [x, 70 - height],
          [x + 8, 58 - height],
          [x + 52, 58 - height],
          [x + 48, 66 - height],
        ],
        '#3c4644',
        '#424d481f',
      );
      line(
        c,
        [
          [x + 3, 71 - height],
          [x + 3, 64],
        ],
        '#8b938125',
      );
    }
    for (const x of [70, 240, 410, 710, 880, 1050]) {
      this.stoneColumn(c, x, 85, 1.2);
      if (x < 1050 && x !== 410) {
        c.strokeStyle = '#172328';
        c.lineWidth = 17;
        c.beginPath();
        c.ellipse(x + 85, 32, 72, 68, 0, Math.PI, TAU);
        c.stroke();
        c.strokeStyle = '#414b443c';
        c.lineWidth = 2;
        c.beginPath();
        c.ellipse(x + 85, 31, 72, 68, 0, Math.PI, TAU);
        c.stroke();
      }
    }
    for (const x of [40, 1080])
      for (const y of [180, 320, 470, 620]) {
        if (Math.abs(y - 380) < 65) continue;
        this.stoneColumn(c, x, y, 0.8);
      }
    // Moss, scattered shards and roots cluster against structures instead of blocking doors.
    for (let i = 0; i < 190; i++) {
      let x = rng.int(70, 1050),
        y = rng.int(90, 680);
      const o = w.obstacles[i % w.obstacles.length];
      if (i < 95 && o) {
        x = o.x + rng.int(-60, 60);
        y = o.y + rng.int(-25, 45);
      }
      if (y > 320 && y < 440 && (x < 150 || x > 970)) continue;
      if (rng.next() > 0.45)
        polygon(
          c,
          [
            [x, y],
            [x + rng.int(3, 12), y - rng.int(0, 6)],
            [x + rng.int(4, 14), y + rng.int(3, 8)],
            [x + 2, y + 5],
          ],
          rng.pick(['#62685b', '#4b5350', '#333f3c', '#707264']),
          '#162124',
        );
      else {
        ellipse(
          c,
          x,
          y,
          rng.int(4, 16),
          rng.int(2, 7),
          rng.pick(['#47544475', '#58634c60', '#3a4d4270']),
        );
        line(
          c,
          [
            [x, y],
            [x + 5, y - 12],
            [x + 10, y - 15],
          ],
          '#52614d66',
        );
      }
    }
    // Biomes add materials and shapes, not just a palette swap.
    const decorations = [w.floor.biome, w.floor.hybrid];
    if (decorations.includes(1)) {
      for (let i = 0; i < 12; i++)
        ellipse(
          c,
          380 + rng.int(0, 360),
          490 + rng.int(0, 150),
          rng.int(40, 125),
          rng.int(15, 40),
          '#42868b28',
        );
      for (let i = 0; i < 25; i++) {
        const x = rng.int(90, 1030),
          y = rng.pick([150, 630]);
        line(
          c,
          [
            [x, y],
            [x + 3, y - 30],
            [x - 4, y - 40],
          ],
          '#72938b66',
        );
      }
    }
    if (decorations.includes(2)) {
      for (let i = 0; i < 45; i++) {
        const x = rng.pick([rng.int(100, 290), rng.int(840, 1030)]),
          y = rng.int(130, 650),
          h = rng.int(8, 28);
        line(
          c,
          [
            [x, y],
            [x + 1, y - h],
          ],
          '#b5aac5',
          2,
        );
        ellipse(c, x, y - h, h * 0.65, h * 0.29, rng.pick(['#9984be', '#736b95', '#b09cb8']));
        ellipse(c, x - h * 0.2, y - h - 2, h * 0.2, h * 0.1, '#d9c6e6');
      }
    }
    if (decorations.includes(3)) {
      for (let i = 0; i < 35; i++) {
        const x = rng.int(90, 1030),
          y = rng.pick([rng.int(110, 180), rng.int(620, 680)]);
        polygon(
          c,
          [
            [x, y],
            [x + 7, y - rng.int(15, 40)],
            [x + 15, y + 1],
          ],
          '#b7d3dc66',
          '#d1e2e775',
        );
      }
      ellipse(c, 560, 250, 70, 62, '#a9cbd338');
      for (let i = 0; i < 16; i++)
        line(
          c,
          [
            [rng.int(490, 620), rng.int(200, 300)],
            [rng.int(490, 620), rng.int(200, 300)],
          ],
          '#c2dce74a',
        );
    }
    if (decorations.includes(4)) {
      for (const x of [180, 900])
        for (let y = 170; y < 650; y += 36) {
          c.fillStyle = '#1a1c1c';
          c.fillRect(x, y, 42, 18);
          for (let k = 0; k < 5; k++) {
            c.fillStyle = '#7d5637';
            c.fillRect(x + k * 9, y, 3, 18);
          }
        }
      ellipse(c, 560, 250, 70, 62, '#201a17');
      for (let i = 0; i < 7; i++) {
        const y = 210 + i * 12;
        line(
          c,
          [
            [505, y],
            [615, y],
          ],
          '#735445',
          4,
        );
      }
    }
    c.restore();
  }

  private floorDetails(c: CanvasRenderingContext2D): void {
    const w = this.world;
    const age = w.visualTime - this.cacheTime;
    if (w.floor.biome === 1 || w.floor.hybrid === 1) {
      c.save();
      c.strokeStyle = '#b4dfe725';
      c.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        c.beginPath();
        c.ellipse(
          440 + i * 40,
          540 + Math.sin(i * 3) * 45,
          28 + Math.sin(age + i) * 9,
          7,
          0,
          0,
          TAU,
        );
        c.stroke();
      }
      c.restore();
    }
    if (w.floor.biome === 2 || w.floor.hybrid === 2)
      for (const x of [160, 940]) glow(c, x, 300, 160, '#af8fdc', 0.12);
  }

  private stoneColumn(c: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
    c.save();
    c.translate(x, y);
    c.scale(scale, scale);
    polygon(
      c,
      [
        [-20, 7],
        [18, 7],
        [52, 26],
        [12, 30],
        [-22, 13],
      ],
      '#07101566',
    );
    polygon(
      c,
      [
        [-24, 0],
        [0, 10],
        [24, 0],
        [24, -9],
        [0, -19],
        [-24, -9],
      ],
      '#444b45',
      '#162026',
    );
    polygon(
      c,
      [
        [-18, -8],
        [0, 0],
        [0, -98],
        [-18, -106],
      ],
      '#313b3b',
      '#18262a',
    );
    polygon(
      c,
      [
        [0, 0],
        [18, -8],
        [18, -106],
        [0, -98],
      ],
      '#1a292d',
      '#142025',
    );
    for (let y = -25; y > -100; y -= 24) {
      line(
        c,
        [
          [-18, y],
          [0, y + 8],
          [18, y],
        ],
        '#111d21',
        2,
      );
      line(
        c,
        [
          [-16, y - 2],
          [0, y + 5],
        ],
        '#87907d2b',
      );
    }
    polygon(
      c,
      [
        [-25, -103],
        [0, -92],
        [25, -103],
        [25, -114],
        [0, -125],
        [-25, -114],
      ],
      '#303d3c',
      '#142127',
    );
    polygon(
      c,
      [
        [-25, -114],
        [0, -126],
        [25, -114],
        [0, -103],
      ],
      '#515a4c',
      '#b7b1921a',
    );
    line(
      c,
      [
        [-12, -111],
        [1, -108],
        [8, -115],
      ],
      '#232f30',
    );
    c.restore();
  }

  private obstacle(c: CanvasRenderingContext2D, o: Obstacle): void {
    if (o.type === 'pillar') {
      this.stoneColumn(c, o.x, o.y, o.radius / 25);
      return;
    }
    const x = o.x,
      y = o.y;
    if (o.type === 'tomb') {
      polygon(
        c,
        [
          [x - 29, y - 12],
          [x + 19, y - 21],
          [x + 32, y + 4],
          [x - 19, y + 15],
        ],
        '#232f31',
        '#172226',
      );
      polygon(
        c,
        [
          [x - 32, y - 30],
          [x + 18, y - 40],
          [x + 32, y - 15],
          [x - 18, y - 4],
        ],
        '#535a51',
        '#79806a44',
      );
      polygon(
        c,
        [
          [x - 18, y - 4],
          [x + 32, y - 15],
          [x + 32, y + 4],
          [x - 18, y + 15],
        ],
        '#2b3737',
        '#142227',
      );
      line(
        c,
        [
          [x - 8, y - 25],
          [x + 8, y - 16],
        ],
        '#a9a68a77',
        2,
      );
      line(
        c,
        [
          [x, y - 31],
          [x, y - 12],
        ],
        '#a9a68a77',
        2,
      );
    } else {
      const rng = new Random(`${x}:${y}`);
      for (let i = 0; i < 8; i++) {
        const dx = x + rng.int(-22, 22),
          dy = y + rng.int(-12, 10),
          h = rng.int(7, 23);
        polygon(
          c,
          [
            [dx - 10, dy],
            [dx, dy - h],
            [dx + 12, dy - h + 3],
            [dx + 17, dy + 2],
          ],
          '#47504a',
          '#1c2a2c',
        );
        polygon(
          c,
          [
            [dx, dy - h],
            [dx + 12, dy - h + 3],
            [dx + 17, dy + 2],
            [dx + 3, dy + 6],
          ],
          '#2e3b3a',
          '#1c2a2c',
        );
      }
    }
    ellipse(c, x - 12, y + 7, 22, 5, '#53634466');
  }

  private doors(c: CanvasRenderingContext2D): void {
    const w = this.world;
    for (const id of w.room.links) {
      const room = w.floor.rooms[id],
        pos = doorPosition(w.room, room);
      const hidden = room.kind === 'secret' && !room.visited;
      c.save();
      c.translate(pos.x, pos.y);
      if (hidden) {
        line(
          c,
          [
            [-12, 0],
            [3, -18],
            [-1, -38],
            [9, -49],
          ],
          '#a6be9b88',
          2,
        );
        glow(c, 0, -20, 50, '#c9ddab', 0.12);
      } else {
        const rotation =
          pos.x === 80 ? -Math.PI / 2 : pos.x === 1040 ? Math.PI / 2 : pos.y < 300 ? 0 : Math.PI;
        c.rotate(rotation);
        const color = w.combat
          ? '#a95c45'
          : room.kind === 'elite' || room.kind === 'boss'
            ? '#cc9c68'
            : '#b6c7b7';
        glow(c, 0, 0, 75, color, 0.13);
        c.fillStyle = '#050d13';
        c.fillRect(-34, -33, 68, 57);
        line(
          c,
          [
            [-37, 25],
            [-37, -26],
            [-24, -43],
            [24, -43],
            [37, -26],
            [37, 25],
          ],
          '#62716a',
          5,
        );
        line(
          c,
          [
            [-31, 20],
            [-31, -24],
            [-20, -36],
            [20, -36],
            [31, -24],
            [31, 20],
          ],
          '#9b977444',
          2,
        );
        for (let i = 0; i < 4; i++) {
          c.fillStyle = '#35413e';
          c.fillRect(-30, 16 + i * 7, 60, 3);
        }
        if (w.combat)
          for (let x = -24; x <= 24; x += 12)
            line(
              c,
              [
                [x, -32],
                [x, 28],
              ],
              '#af7c5766',
              3,
            );
        else {
          line(
            c,
            [
              [-6, 0],
              [0, -7],
              [6, 0],
            ],
            color,
            2,
          );
          line(
            c,
            [
              [-6, 9],
              [0, 2],
              [6, 9],
            ],
            color,
            1,
          );
        }
      }
      c.restore();
    }
  }

  private torches(c: CanvasRenderingContext2D): void {
    const w = this.world;
    const torches = [
      [155, 170],
      [965, 170],
      [145, 615],
      [975, 615],
      [415, 90],
      [705, 90],
    ];
    for (let i = 0; i < torches.length; i++) {
      const [x, y] = torches[i],
        flicker =
          Math.sin(w.visualTime * 9 + i * 3) * 0.08 + Math.sin(w.visualTime * 16 + i) * 0.04 + 0.86;
      const color = w.floor.biome === 2 ? '#c2a1ea' : w.floor.biome === 1 ? '#a7dbd2' : '#ffb267';
      glow(c, x, y - 35, 220 * flicker, color, 0.38);
      glow(c, x, y - 25, 75 * flicker, '#ffc57b', 0.12);
      ellipse(c, x, y + 6, 19, 7, '#060a0b80');
      polygon(
        c,
        [
          [x - 5, y],
          [x + 5, y],
          [x + 3, y - 26],
          [x - 3, y - 26],
        ],
        '#302e26',
        '#7b68474d',
      );
      polygon(
        c,
        [
          [x - 13, y - 25],
          [x + 13, y - 25],
          [x + 8, y - 34],
          [x - 8, y - 34],
        ],
        '#524a35',
        '#cfa66b88',
      );
      c.save();
      c.globalCompositeOperation = 'screen';
      c.beginPath();
      c.moveTo(x - 6, y - 32);
      c.bezierCurveTo(
        x - 12,
        y - 43,
        x + 3,
        y - 45,
        x + Math.sin(w.visualTime * 14 + i) * 4,
        y - 65 * flicker,
      );
      c.bezierCurveTo(x + 13, y - 47, x + 10, y - 34, x + 3, y - 31);
      c.closePath();
      c.fillStyle = color;
      c.fill();
      polygon(
        c,
        [
          [x - 3, y - 33],
          [x + 1, y - 50 * flicker],
          [x + 4, y - 34],
        ],
        '#fff0c3',
      );
      c.restore();
      for (let j = 0; j < 3; j++) {
        const t = (w.visualTime * 0.45 + j / 3 + i * 0.4) % 1;
        c.globalAlpha = (1 - t) * 0.8;
        ellipse(c, x + Math.sin(t * 12 + i) * 10, y - 50 - t * 48, 1.1, 1.8, '#ffce83');
      }
      c.globalAlpha = 1;
    }
  }

  private interactable(c: CanvasRenderingContext2D): void {
    const w = this.world,
      kind = w.room.kind;
    if (!['exit', 'treasure', 'shrine', 'healing', 'secret'].includes(kind)) return;
    c.save();
    c.translate(560, 365);
    if (kind === 'exit') {
      for (let i = 0; i < 7; i++) {
        c.fillStyle = i % 2 ? '#0b171c' : '#17262b';
        c.fillRect(-37 + i * 3, -35 + i * 9, 74 - i * 6, 8);
        line(
          c,
          [
            [-37 + i * 3, -35 + i * 9],
            [37 - i * 3, -35 + i * 9],
          ],
          '#74857855',
        );
      }
      glow(c, 0, 0, 115, '#b2ccd0', 0.18);
      text(c, '↓', 0, -55, 30, '#b5cbba');
    } else if (kind === 'healing') {
      ellipse(c, 0, 6, 42, 24, '#172529');
      ellipse(c, 0, 0, 38, 24, '#667366');
      ellipse(c, 0, -4, 29, 17, '#264d52');
      ellipse(c, 0, -5, 21 + Math.sin(w.visualTime * 2) * 2, 10, '#a1c9c133');
      glow(c, 0, -6, 110, '#97d4bd', w.room.claimed ? 0.06 : 0.2);
    } else if (kind === 'shrine') {
      polygon(
        c,
        [
          [-26, 4],
          [26, 4],
          [19, -12],
          [-19, -12],
        ],
        '#4a5246',
        '#838169',
      );
      polygon(
        c,
        [
          [-14, -12],
          [14, -12],
          [9, -52],
          [-9, -52],
        ],
        '#545b4e',
        '#8a8b6a66',
      );
      polygon(
        c,
        [
          [0, -75],
          [18, -54],
          [0, -43],
          [-18, -54],
        ],
        '#b6a06c',
        '#d6c187',
      );
      glow(c, 0, -55, 100, '#e8c58a', w.room.claimed ? 0.06 : 0.2);
    } else {
      ellipse(c, 0, 6, 35, 14, '#0b151b90');
      polygon(
        c,
        [
          [-25, -23],
          [18, -27],
          [28, -13],
          [28, 7],
          [-23, 9],
        ],
        '#635137',
        '#b6a274',
      );
      polygon(
        c,
        [
          [-25, -23],
          [-18, -35],
          [20, -38],
          [28, -25],
          [28, -13],
          [-25, -11],
        ],
        '#514932',
        '#bca87c',
      );
      line(
        c,
        [
          [-10, -34],
          [-10, 8],
        ],
        '#a18a58',
        4,
      );
      line(
        c,
        [
          [15, -36],
          [15, 6],
        ],
        '#a18a58',
        4,
      );
      if (!w.room.claimed) {
        glow(c, 0, -24, 130, '#edd4a0', 0.23);
        text(c, '✧', 0, -51 + Math.sin(w.visualTime * 2) * 4, 23, '#e0ca92');
      }
    }
    c.restore();
  }

  private hazards(c: CanvasRenderingContext2D): void {
    const w = this.world;
    const active = w.time % 5 > 3.4,
      warning = w.time % 5 > 2.5;
    for (const biome of [w.floor.biome, w.floor.hybrid]) {
      if (biome !== 2 && biome !== 4) continue;
      const color = biome === 4 ? '#ee9359' : '#ba92dd';
      if (warning) {
        ellipse(
          c,
          560,
          250,
          biome === 4 ? 65 : 100,
          biome === 4 ? 60 : 95,
          color + (active ? '55' : '22'),
        );
        glow(c, 560, 250, active ? 135 : 100, color, active ? 0.3 : 0.1);
        if (active)
          for (let i = 0; i < 9; i++) {
            const t = (w.visualTime * 2 + i / 9) % 1;
            ellipse(c, 515 + i * 11, 250 - t * 85, 2 + (1 - t) * 2, 7, color + 'aa');
          }
      }
    }
    if (w.room.kind === 'hazard') {
      for (let y = 220; y < 560; y += 28)
        for (let x = 490; x < 650; x += 28) {
          polygon(
            c,
            [
              [x, y],
              [x + 5, y - (active ? 24 : warning ? 10 : 3)],
              [x + 10, y],
            ],
            active ? '#cabaa0' : '#727e73',
            '#101d21',
          );
        }
    }
  }

  private telegraph(c: CanvasRenderingContext2D, e: Enemy): void {
    const w = this.world,
      progress = Math.min(1, (w.time - e.stateAt) / e.strike.windup);
    const special = ['sweep', 'grab', 'smash'].includes(e.strike.kind);
    const color = special ? '#ea8b73' : '#edc58a';
    c.save();
    c.translate(e.x, e.y);
    c.rotate(e.facing);
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, e.strike.reach, -0.55, 0.55);
    c.closePath();
    c.fillStyle = special ? '#d7786018' : '#e2bf7710';
    c.fill();
    c.strokeStyle = color + '75';
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(0, 0, e.strike.reach, -0.55, -0.55 + progress * 1.1);
    c.stroke();
    if (e.strike.kind === 'thrust')
      line(
        c,
        [
          [25, 0],
          [e.strike.reach, 0],
          [e.strike.reach - 12, -7],
        ],
        color + '88',
        2,
      );
    if (e.strike.kind === 'sweep') {
      c.setLineDash([5, 5]);
      c.beginPath();
      c.arc(0, 0, e.strike.reach, -2.3, 2.3);
      c.stroke();
    }
    c.restore();
    if (progress > 0.72) glow(c, e.x, e.y - 42, 45, color, progress * 0.3);
    if (special) {
      text(
        c,
        e.strike.kind === 'grab' ? '⌁' : e.strike.kind === 'sweep' ? '↔' : '↓',
        e.x,
        e.y - 102 * e.def.scale,
        24,
        color,
      );
      text(
        c,
        e.strike.kind === 'smash' ? 'SMASH' : e.strike.kind.toUpperCase(),
        e.x,
        e.y - 123 * e.def.scale,
        11,
        color,
        'center',
        mono,
      );
    }
  }

  private character(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    facing: number,
    player: boolean,
    enemy?: Enemy,
  ): void {
    const w = this.world,
      p = w.player;
    const state = player ? p.state : enemy!.state;
    const age = w.time - (player ? p.stateAt : enemy!.stateAt);
    const walking = player
      ? Math.hypot(w.movement.x, w.movement.y) > 0 && state === 'idle' && w.mode === 'playing'
      : enemy!.state === 'idle' && w.mode === 'playing';
    const gait = walking
      ? Math.sin(w.visualTime * (player ? 15 : 10))
      : Math.sin(w.visualTime * 2) * 0.1;
    const s = player ? 1.1 : enemy!.def.scale;
    const dodge = state === 'dodge';
    const broken = state === 'broken';
    const bodyColor = player ? '#768d8e' : enemy!.def.color;
    c.save();
    c.translate(x, y);
    c.scale(s, s / 0.82);
    if (dodge) {
      c.globalAlpha = 0.55;
      c.translate(-p.dx * 22, -p.dy * 6);
    }
    c.translate(0, walking ? Math.abs(gait) * -1.5 : 0);
    if (broken) c.translate(0, 9);
    const direction = Math.cos(facing) >= 0 ? 1 : -1;
    // Cloak, boots and armor are built in layers to keep an original strong silhouette.
    polygon(
      c,
      [
        [-11, -47],
        [-22 - gait * 2, -9],
        [-8, -14],
        [0, -8],
        [19, -13],
        [12, -49],
      ],
      player ? '#223638' : '#2e2929',
      player ? '#405957' : '#51433d',
    );
    polygon(
      c,
      [
        [-8, -19],
        [-10 - gait * 3, -3],
        [-3 - gait * 3, 0],
        [0, -20],
      ],
      '#1c2528',
      '#42504b',
    );
    polygon(
      c,
      [
        [3, -20],
        [5 + gait * 3, -1],
        [13 + gait * 3, -2],
        [9, -22],
      ],
      '#222b2d',
      '#46514c',
    );
    line(
      c,
      [
        [-11 - gait * 3, -1],
        [-1 - gait * 3, 0],
      ],
      '#62675c',
      3,
    );
    line(
      c,
      [
        [5 + gait * 3, 0],
        [15 + gait * 3, 0],
      ],
      '#697163',
      3,
    );
    polygon(
      c,
      [
        [-12, -48],
        [-16, -33],
        [-9, -19],
        [11, -21],
        [16, -35],
        [11, -49],
      ],
      bodyColor,
      '#121e24',
    );
    polygon(
      c,
      [
        [-10, -47],
        [-5, -25],
        [8, -23],
        [12, -46],
      ],
      player ? '#526969' : '#5b5d57',
      '#b7b18c33',
    );
    line(
      c,
      [
        [-12, -35],
        [10, -39],
      ],
      '#bbb29577',
      2,
    );
    line(
      c,
      [
        [-9, -24],
        [11, -26],
      ],
      '#1a2627',
      4,
    );
    polygon(
      c,
      [
        [-14, -49],
        [-23, -42],
        [-20, -34],
        [-10, -36],
      ],
      player ? '#81938b' : bodyColor,
      '#20292a',
    );
    polygon(
      c,
      [
        [11, -49],
        [21, -44],
        [19, -34],
        [10, -36],
      ],
      player ? '#7d918b' : bodyColor,
      '#20292a',
    );
    // A hood with one warm line of light makes the player recognizable at exploration scale.
    polygon(
      c,
      [
        [-9, -58],
        [-8, -49],
        [0, -44],
        [9, -50],
        [8, -60],
        [0, -65],
      ],
      player ? '#263c3e' : '#333a3b',
      player ? '#9ab3a8' : '#a8ab9a',
    );
    polygon(
      c,
      [
        [-6, -57],
        [-5, -48],
        [5, -48],
        [7, -56],
      ],
      '#101c21',
    );
    line(
      c,
      [
        [direction * 1, -54],
        [direction * 6, -54],
      ],
      player ? '#efcd8e' : enemy?.phase === 2 ? '#f7a56d' : '#d9b29a',
      1.5,
    );
    if (player) {
      polygon(
        c,
        [
          [-10, -47],
          [-20, -44],
          [-21, -37],
          [-8, -40],
          [9, -43],
          [10, -48],
        ],
        '#b9a07c',
        '#d2c09955',
      );
      polygon(
        c,
        [
          [-16, -43],
          [-30 - gait * 2, -26],
          [-25, -25],
          [-10, -40],
        ],
        '#ae9171',
        '#cfb68b55',
      );
    }
    if (enemy?.def.id === 'beast') {
      for (const xx of [-12, 3, 15])
        polygon(
          c,
          [
            [xx, -47],
            [xx - 4, -64],
            [xx + 8, -49],
          ],
          '#9eaa84',
          '#465943',
        );
    }
    if (enemy?.def.id === 'boss') {
      for (let i = -2; i <= 2; i++)
        polygon(
          c,
          [
            [i * 6 - 3, -63],
            [i * 6, -76 - (2 - Math.abs(i)) * 3],
            [i * 6 + 3, -63],
          ],
          '#c8ae75',
          '#f0d69966',
        );
      if (enemy.phase === 2) glow(c, 0, -39, 65, '#e8a468', 0.2);
    }
    const weaponId = player
      ? w.weapon.id
      : enemy!.def.id === 'spear'
        ? 'spear'
        : ['brute', 'boss'].includes(enemy!.def.id)
          ? 'great'
          : enemy!.def.id === 'assassin'
            ? 'twins'
            : 'sword';
    let weaponAngle = facing - 0.4;
    if (state === 'tell' && enemy)
      weaponAngle = enemy.facing - 1.8 - Math.min(1, age / enemy.strike.windup) * 0.5;
    if (state === 'attack')
      weaponAngle = facing - 1.8 + Math.min(1, age / (w.weapon.startup + 0.12)) * 3.3;
    if (state === 'active') weaponAngle = facing + 0.8;
    if (state === 'parry') weaponAngle = facing - 1.5;
    if (broken) weaponAngle = facing + 1.6;
    c.save();
    c.translate(direction * 12, -33);
    c.rotate(weaponAngle);
    const length =
      weaponId === 'spear' ? 70 : weaponId === 'great' ? 57 : weaponId === 'twins' ? 29 : 42;
    line(
      c,
      [
        [-8, 0],
        [9, 0],
      ],
      '#9c8560',
      4,
    );
    line(
      c,
      [
        [8, -7],
        [8, 7],
      ],
      '#c5ab77',
      3,
    );
    polygon(
      c,
      [
        [11, -2],
        [length - 5, -3.5],
        [length + 5, 0],
        [length - 5, 3],
        [11, 2],
      ],
      state === 'tell' ? '#dcc5a6' : '#c5d6d4',
      '#f2edc45e',
    );
    if (weaponId === 'great')
      polygon(
        c,
        [
          [15, -5],
          [length, -6],
          [length + 8, 0],
          [length, 5],
          [15, 5],
        ],
        '#afbdb8',
        '#e6dec077',
      );
    if (weaponId === 'spear')
      line(
        c,
        [
          [-42, 0],
          [25, 0],
        ],
        '#89775b',
        3,
      );
    c.restore();
    if (weaponId === 'twins') {
      c.save();
      c.translate(-direction * 18, -33);
      c.rotate(weaponAngle - 1.8);
      polygon(
        c,
        [
          [0, -2],
          [27, -3],
          [32, 0],
          [27, 3],
          [0, 2],
        ],
        '#c2d2cc',
        '#e6d5ab66',
      );
      c.restore();
    }
    if (enemy?.def.id === 'shield') {
      polygon(
        c,
        [
          [-25, -47],
          [-8, -50],
          [-2, -38],
          [-6, -17],
          [-19, -12],
          [-31, -31],
        ],
        '#596a6d',
        '#aab1a4',
      );
      line(
        c,
        [
          [-18, -44],
          [-15, -20],
        ],
        '#c1b387',
        2,
      );
      line(
        c,
        [
          [-26, -34],
          [-7, -34],
        ],
        '#c1b387',
        2,
      );
    }
    if (state === 'parry') {
      c.strokeStyle = '#d4eded';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(direction * 8, -33, 27, -1.9 + facing, 1.9 + facing);
      c.stroke();
      glow(c, direction * 10, -35, 45, '#abd9e2', 0.2);
    }
    if (state === 'hurt' && Math.floor(age * 30) % 2 === 0) {
      c.globalCompositeOperation = 'screen';
      ellipse(c, 0, -33, 15, 23, '#d37d6566');
    }
    c.restore();
    if (enemy && w.combat) {
      const width = 56 * enemy.def.scale;
      c.fillStyle = '#070e12c0';
      c.fillRect(x - width / 2 - 1, y - 86 * enemy.def.scale, width + 2, 6);
      c.fillStyle = '#a58d61';
      c.fillRect(
        x - width / 2,
        y - 86 * enemy.def.scale + 1,
        width * Math.min(1, enemy.posture / enemy.maxPosture),
        4,
      );
      if (enemy.state === 'broken') text(c, '✧', x, y - 100 * enemy.def.scale, 26, '#f5d299');
    }
  }

  private corpse(c: CanvasRenderingContext2D, e: Enemy): void {
    c.save();
    c.globalAlpha = 0.3;
    polygon(
      c,
      [
        [e.x - 19, e.y - 2],
        [e.x + 16, e.y - 13],
        [e.x + 31, e.y + 4],
        [e.x - 6, e.y + 10],
      ],
      '#444747',
      '#17262a',
    );
    line(
      c,
      [
        [e.x + 22, e.y - 7],
        [e.x + 51, e.y + 2],
      ],
      '#a4ad9d',
      2,
    );
    c.restore();
  }

  private effect(c: CanvasRenderingContext2D, e: Effect): void {
    const t = 1 - e.life / e.maxLife;
    c.save();
    c.translate(e.x, e.y);
    c.globalAlpha = (1 - t) * 0.9;
    c.strokeStyle = e.color;
    c.lineWidth = Math.max(1, (1 - t) * 4);
    c.scale(e.scale, e.scale);
    if (e.kind === 'slash') {
      c.rotate(e.angle);
      c.beginPath();
      c.arc(0, 0, 68 + t * 22, -1.1 + t * 1.3, 0.8 + t * 1.3);
      c.lineWidth = (1 - t) * 7;
      c.stroke();
      c.beginPath();
      c.arc(0, 0, 82 + t * 16, -0.8 + t * 1.3, 0.6 + t * 1.3);
      c.lineWidth = 1;
      c.stroke();
    } else if (e.kind === 'finish') {
      c.rotate(e.angle - 0.6);
      line(
        c,
        [
          [-140 * t, -5],
          [180 * t, 0],
        ],
        e.color,
        9 * (1 - t),
      );
      line(
        c,
        [
          [-150 * t, 7],
          [165 * t, -2],
        ],
        '#fff6d9',
        2 * (1 - t),
      );
    } else {
      c.beginPath();
      c.arc(0, 0, 8 + t * (e.kind === 'perfect' ? 74 : 45), 0, TAU);
      c.stroke();
      if (e.kind === 'perfect') {
        glow(c, 0, 0, 85 * (1 - t), '#ffdfa5', 0.6);
        for (let i = 0; i < 8; i++) {
          c.rotate(Math.PI / 4);
          line(
            c,
            [
              [10 + t * 35, 0],
              [30 + t * 85, 0],
            ],
            e.color,
            (1 - t) * 2,
          );
        }
      }
    }
    c.restore();
  }

  private motes(c: CanvasRenderingContext2D): void {
    if (!this.world.save.settings.quality) return;
    const w = this.world;
    for (let i = 0; i < 45; i++) {
      const time = w.visualTime * ((i % 3) + 1) * 0.13;
      const x = ((i * 127.31 + Math.sin(time + i) * 25) % 1050) + 35;
      const y = ((i * 79.73 - time * 13 + 10000) % 650) + 65;
      c.globalAlpha = 0.12 + Math.sin(time * 2 + i) * 0.1;
      ellipse(c, x, y, i % 3 === 0 ? 1.4 : 0.8, 1.3, w.floor.biome === 2 ? '#e6c6ef' : '#e9d1a0');
    }
    c.globalAlpha = 1;
  }

  private vignette(c: CanvasRenderingContext2D, menu: boolean): void {
    const gradient = c.createRadialGradient(720, 450, 250, 720, 450, 830);
    gradient.addColorStop(0, '#070d1000');
    gradient.addColorStop(0.65, '#050b1230');
    gradient.addColorStop(1, '#04090de0');
    c.fillStyle = gradient;
    c.fillRect(0, 0, 1440, 900);
    const top = c.createLinearGradient(0, 0, 0, 210);
    top.addColorStop(0, '#080e15dd');
    top.addColorStop(1, '#080e1500');
    c.fillStyle = top;
    c.fillRect(0, 0, 1440, 210);
    if (menu) {
      const g = c.createLinearGradient(0, 0, 1100, 0);
      g.addColorStop(0, '#081014fa');
      g.addColorStop(0.4, '#081014d9');
      g.addColorStop(1, '#08101400');
      c.fillStyle = g;
      c.fillRect(0, 0, 1440, 900);
    } else if (this.world.combat && !this.world.save.settings.reducedMotion) {
      c.fillStyle = '#050b1080';
      c.fillRect(0, 0, 1440, 12);
      c.fillRect(0, 888, 1440, 12);
    }
  }

  private hud(c: CanvasRenderingContext2D): void {
    const w = this.world,
      p = w.player;
    // A compact heraldic player sigil anchors the three resources.
    c.save();
    c.translate(72, 78);
    c.strokeStyle = '#aa977354';
    c.lineWidth = 1;
    for (const r of [27, 33]) {
      c.beginPath();
      c.arc(0, 0, r, 0, TAU);
      c.stroke();
    }
    polygon(
      c,
      [
        [0, -23],
        [6, -7],
        [18, 0],
        [6, 7],
        [0, 23],
        [-6, 7],
        [-18, 0],
        [-6, -7],
      ],
      '#bdac7a30',
      '#d6bf88',
    );
    polygon(
      c,
      [
        [0, -12],
        [4, 0],
        [0, 12],
        [-4, 0],
      ],
      '#e4cb90',
    );
    c.restore();
    text(c, 'THE OATHBOUND', 123, 49, 12, '#d0c7b3', 'left', mono);
    this.bar(c, 123, 62, 211, 9, p.hp / 100, '#bb655a', '#d6967e');
    this.bar(c, 123, 80, 184, 5, p.posture / 100, '#c0a36a', '#dfc88d');
    this.bar(c, 123, 94, 156, 3, p.focus / 100, '#79a5a6', '#c2dcd4');
    text(c, `${Math.ceil(p.hp)} / 100`, 344, 71, 10, '#b4bdb6', 'left', mono);
    text(
      c,
      `FOCUS ${Math.floor(p.focus)}`,
      123,
      116,
      9,
      p.focus >= 100 ? '#f2d59e' : '#91aaa8',
      'left',
      mono,
    );
    if (w.ward) text(c, `WARD ${w.ward}`, 250, 116, 9, '#c6d9bc', 'left', mono);
    if (w.combat && w.target) {
      const e = w.target;
      const name =
        e.def.id === 'boss'
          ? `${e.def.name}  ·  ${e.phase === 1 ? 'I' : 'II'}`
          : w.room.kind === 'elite'
            ? `${e.def.name}, the ${w.room.elite}`
            : e.def.name;
      text(c, name.toUpperCase(), 720, 50, 17, '#ded1b7');
      text(c, e.def.role.toUpperCase(), 720, 70, 9, '#ab9e89', 'center', mono);
      this.bar(c, 541, 84, 358, 5, e.hp / e.maxHp, '#966252', '#d69978');
      this.bar(c, 541, 96, 358, 7, e.posture / e.maxPosture, '#c2a05e', '#efd5a1');
      text(
        c,
        e.state === 'broken' ? 'GUARD BROKEN  ·  E TO FINISH' : 'GUARD',
        720,
        122,
        9,
        '#c6b48b',
        'center',
        mono,
      );
    } else {
      text(c, w.room.name, 720, 59, 22, '#d0cabb');
      text(
        c,
        w.room.modifier === 'Quiet' ? 'EXPLORATION' : w.room.modifier.toUpperCase(),
        720,
        82,
        9,
        '#919c94',
        'center',
        mono,
      );
    }
    if (!w.combat) this.minimap(c);
    else {
      text(
        c,
        `DEPTH ${String(w.floor.depth).padStart(2, '0')}`,
        1350,
        52,
        11,
        '#d4c19c',
        'right',
        mono,
      );
      text(c, w.room.modifier.toUpperCase(), 1350, 73, 9, '#a8b5ae', 'right', mono);
    }
    text(c, w.weapon.name, 63, 793, 19, '#d4c7ab', 'left');
    text(c, w.weapon.subtitle, 63, 814, 9, '#8faaa8', 'left', mono);
    for (let i = 0; i < w.relics.length; i++) {
      const relic = w.relics[i];
      const x = 65 + (i % 9) * 30,
        y = 842 + Math.floor(i / 9) * 30;
      c.strokeStyle = '#a08c5c66';
      c.strokeRect(x - 11, y - 18, 24, 24);
      text(c, relic.glyph, x + 1, y, 17, '#c5b38c');
    }
    if (p.focus >= 100) {
      text(c, 'Q', 1340, 790, 25, '#f0d29b', 'right', mono);
      text(c, 'RESONANCE READY', 1340, 813, 10, '#dac699', 'right', mono);
    } else {
      text(c, `${w.stats.kills}`, 1340, 791, 23, '#d3c6a9', 'right');
      text(c, 'SOULS RELEASED', 1340, 813, 9, '#859e9a', 'right', mono);
    }
  }
  private bar(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    value: number,
    color: string,
    highlight: string,
  ): void {
    c.fillStyle = '#071014df';
    c.fillRect(x - 2, y - 2, width + 4, height + 4);
    c.strokeStyle = '#9b97713f';
    c.strokeRect(x - 2, y - 2, width + 4, height + 4);
    c.fillStyle = color;
    c.fillRect(x, y, width * Math.max(0, Math.min(1, value)), height);
    c.fillStyle = highlight;
    c.fillRect(x, y, width * Math.max(0, Math.min(1, value)), 1);
  }

  private minimap(c: CanvasRenderingContext2D): void {
    const w = this.world;
    text(
      c,
      `DEPTH ${String(w.floor.depth).padStart(2, '0')}`,
      1357,
      47,
      12,
      '#d5c39f',
      'right',
      mono,
    );
    text(c, BIOMES[w.floor.biome].short.toUpperCase(), 1357, 66, 9, '#8da5a0', 'right', mono);
    const visible = (id: number) =>
      w.debug ||
      w.floor.rooms[id].visited ||
      (w.floor.rooms[id].kind !== 'secret' &&
        w.floor.rooms[id].links.some((n) => w.floor.rooms[n].visited));
    c.save();
    c.translate(1190, 88);
    for (const room of w.floor.rooms)
      if (visible(room.id)) {
        for (const id of room.links) {
          const next = w.floor.rooms[id];
          if (visible(id))
            line(
              c,
              [
                [room.x * 31, room.y * 23],
                [next.x * 31, next.y * 23],
              ],
              '#80938a35',
            );
        }
      }
    for (const room of w.floor.rooms)
      if (visible(room.id)) {
        c.fillStyle = room.id === w.roomId ? '#c8b27d' : room.visited ? '#637b74' : '#263835';
        c.strokeStyle = room.visited ? '#9baf9980' : '#697e6d55';
        c.fillRect(room.x * 31 - 7, room.y * 23 - 5, 14, 10);
        c.strokeRect(room.x * 31 - 7, room.y * 23 - 5, 14, 10);
        if (room.id === w.roomId) ellipse(c, room.x * 31, room.y * 23, 2, 2, '#f9ecc5');
      }
    c.restore();
  }

  private tutorial(c: CanvasRenderingContext2D): void {
    const goals = [
      ['move', 'Find your footing', 'Move with W A S D.'],
      ['attack', 'Press the advantage', 'J or left mouse to attack.'],
      ['parry', 'Meet the blade', 'K or right mouse just before a normal strike lands.'],
      ['perfect', 'Hear the silver note', 'Deflect in the final instant for a perfect parry.'],
      ['dodge', 'Leave only a shadow', 'Space to evade. Sweeps and grabs cannot be parried.'],
      ['finisher', 'Keep your oath', 'Break their guard, approach, then press E.'],
    ];
    const next = goals.find(([id]) => !this.world.trainingDone.has(id));
    if (!next) return;
    c.fillStyle = '#0c171de8';
    c.fillRect(46, 180, 330, 111);
    c.fillStyle = '#baa470';
    c.fillRect(46, 180, 2, 111);
    text(
      c,
      `THE PRACTICE OF STEEL  ${this.world.trainingDone.size}/6`,
      65,
      203,
      9,
      '#b7a67e',
      'left',
      mono,
    );
    text(c, next[1], 65, 231, 21, '#ded3bb', 'left');
    const words = next[2].split(' ');
    let current = '',
      y = 257;
    c.font = `12px ${mono}`;
    for (const word of words) {
      if (c.measureText(current + word).width > 290) {
        text(c, current, 65, y, 12, '#a7bbb4', 'left', mono);
        current = '';
        y += 17;
      }
      current += `${word} `;
    }
    text(c, current, 65, y, 12, '#a7bbb4', 'left', mono);
  }

  private debug(c: CanvasRenderingContext2D): void {
    const w = this.world;
    c.strokeStyle = '#53ffb5';
    c.lineWidth = 1;
    for (const o of w.obstacles) {
      c.beginPath();
      c.arc(o.x, o.y, o.radius + 16, 0, TAU);
      c.stroke();
    }
    for (const e of w.alive) {
      c.beginPath();
      c.arc(e.x, e.y, e.strike.reach, 0, TAU);
      c.stroke();
      text(
        c,
        `${e.state} ${(w.time - e.stateAt).toFixed(2)} / ${e.strike.windup.toFixed(2)}`,
        e.x,
        e.y + 45,
        12,
        '#83ffc3',
        'center',
        mono,
      );
    }
    text(
      c,
      `PLAYER ${w.player.state} · PARRY ${(w.time - w.player.parryAt).toFixed(3)} · WORLD ${BALANCE.worldWidth}×${BALANCE.worldHeight}`,
      560,
      730,
      12,
      '#73ffc2',
      'center',
      mono,
    );
  }
}
