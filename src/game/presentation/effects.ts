import * as T from 'three';
import { World, type Effect } from '../world';
import { globalPosition } from './architecture';
import { Materials, SCALE } from './materials';

export class Effects {
  readonly root = new T.Group();
  readonly light = new T.PointLight('#ffd18a', 0, 12, 1.5);
  private particles: T.LineSegments;
  private positions = new Float32Array(260 * 6);
  private colors = new Float32Array(260 * 6);
  private active = new Map<Effect, T.Mesh>();
  private rings: T.Mesh[] = [];
  private materialsGlow: T.CanvasTexture;
  private flashSprite: T.Sprite;
  private hazard: T.Mesh;
  private spikes = new T.Group();
  constructor(
    private world: World,
    materials: Materials,
  ) {
    this.materialsGlow = materials.glow;
    const geo = new T.BufferGeometry();
    geo.setAttribute(
      'position',
      new T.BufferAttribute(this.positions, 3).setUsage(T.DynamicDrawUsage),
    );
    geo.setAttribute('color', new T.BufferAttribute(this.colors, 3).setUsage(T.DynamicDrawUsage));
    this.particles = new T.LineSegments(
      geo,
      new T.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: T.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.particles.frustumCulled = false;
    this.root.add(this.particles, this.light);
    const flash = new T.Sprite(
      new T.SpriteMaterial({
        map: materials.glow,
        color: '#ffd59a',
        transparent: true,
        opacity: 0.4,
        blending: T.AdditiveBlending,
        depthWrite: false,
      }),
    );
    flash.scale.set(1.4, 1.4, 1);
    this.light.add(flash);
    this.flashSprite = flash;
    flash.visible = false;
    for (let i = 0; i < 3; i++) {
      const ring = new T.Mesh(
        new T.RingGeometry(0.8, 1, 64),
        new T.MeshBasicMaterial({
          color: '#c5eddf',
          side: T.DoubleSide,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: T.AdditiveBlending,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      this.root.add(ring);
      this.rings.push(ring);
    }
    this.hazard = new T.Mesh(
      new T.CircleGeometry(1, 40),
      new T.MeshBasicMaterial({
        color: '#d88f45',
        side: T.DoubleSide,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      }),
    );
    this.hazard.rotation.x = -Math.PI / 2;
    this.root.add(this.hazard, this.spikes);
    for (let i = 0; i < 35; i++) {
      const spike = new T.Mesh(materials.cone, materials.items.iron);
      spike.position.set(((i % 5) - 2) * 0.9, 0, (Math.floor(i / 5) - 3) * 1.1);
      spike.scale.set(0.18, 0.6, 0.18);
      spike.castShadow = true;
      this.spikes.add(spike);
    }
  }
  update(camera: T.Camera, duel: number): void {
    const w = this.world;
    const trap = w.room.kind === 'hazard',
      biomes = [w.floor.biome, w.floor.hybrid],
      environment = biomes.includes(4) ? 4 : biomes.includes(2) ? 2 : biomes.includes(3) ? 3 : -1;
    this.hazard.visible = trap || environment >= 0;
    this.spikes.visible = trap;
    const active = w.time % 5 > 3.4,
      warning = w.time % 5 > 2.5;
    this.hazard.position.copy(globalPosition(w.room, 560, trap ? 380 : 250, 0.035));
    this.hazard.scale.set(
      trap ? 2.75 : environment === 2 ? 2.5 : 1.625,
      trap ? 4.5 : environment === 2 ? 2.5 : 1.625,
      1,
    );
    const mat = this.hazard.material as T.MeshBasicMaterial;
    mat.color.set(
      environment === 3 && !trap
        ? '#b0d9e4'
        : environment === 2 && !trap
          ? '#a36ac3'
          : active
            ? '#e7703a'
            : '#bca266',
    );
    mat.opacity = environment === 3 && !trap ? 0.14 : active ? 0.3 : warning ? 0.17 : 0.065;
    this.spikes.position.copy(
      globalPosition(w.room, 560, 380, active ? 0.12 : warning ? -0.13 : -0.4),
    );
    w.particles.slice(0, 260).forEach((p, i) => {
      const life = p.life / p.maxLife,
        t = 1 - life,
        pos = globalPosition(
          w.room,
          p.x,
          p.y,
          (p.ground ? 0.07 : 1.1) + Math.sin(t * Math.PI) * (p.ground ? 0.12 : 0.5),
        ),
        color = new T.Color(p.color).multiplyScalar((p.ground ? 0.6 : 2.7) * life);
      this.positions.set(
        [
          pos.x,
          pos.y,
          pos.z,
          pos.x - p.vx * SCALE * 0.035,
          pos.y - 0.02,
          pos.z - p.vy * SCALE * 0.035,
        ],
        i * 6,
      );
      this.colors.set(
        [color.r, color.g, color.b, color.r * life, color.g * life, color.b * life],
        i * 6,
      );
    });
    this.particles.geometry.setDrawRange(0, Math.min(260, w.particles.length) * 2);
    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;
    for (const [e, mesh] of this.active)
      if (!w.effects.includes(e)) {
        this.root.remove(mesh);
        mesh.traverse((o) => {
          if (o instanceof T.Mesh) {
            o.geometry.dispose();
            (o.material as T.Material).dispose();
          } else if (o instanceof T.Sprite) o.material.dispose();
        });
        this.active.delete(e);
      }
    let flash = 0;
    for (const e of w.effects) {
      let mesh = this.active.get(e);
      const rawTime = 1 - e.life / e.maxLife;
      const t = e.kind === 'finish' ? Math.max(0, (rawTime - 0.5) * 2) : rawTime;
      if (!mesh) {
        let geometry: T.BufferGeometry;
        if (e.kind === 'slash' || e.kind === 'finish') {
          const vertices: number[] = [],
            radius = e.kind === 'finish' ? 2.4 : 1.5 * e.scale,
            spread = e.weapon === 'twins' ? 2.6 : e.weapon === 'great' ? 2.1 : 1.65;
          for (let i = 0; i < 24; i++) {
            const a = -spread / 2 + (i / 24) * spread,
              b = -spread / 2 + ((i + 1) / 24) * spread;
            const inner = radius * (e.weapon === 'great' ? 0.8 : 0.97);
            vertices.push(
              Math.cos(a) * inner,
              0,
              Math.sin(a) * inner,
              Math.cos(a) * radius,
              0.07,
              Math.sin(a) * radius,
              Math.cos(b) * radius,
              0.07,
              Math.sin(b) * radius,
              Math.cos(a) * inner,
              0,
              Math.sin(a) * inner,
              Math.cos(b) * radius,
              0.07,
              Math.sin(b) * radius,
              Math.cos(b) * inner,
              0,
              Math.sin(b) * inner,
            );
          }
          geometry = new T.BufferGeometry();
          geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
          if (e.attackKind === 'thrust' || e.weapon === 'spear') {
            geometry.dispose();
            geometry = new T.ConeGeometry(0.045, Math.max(1.4, e.scale * 1.8), 5);
            geometry.rotateZ(-Math.PI / 2);
            geometry.translate(e.scale, 0, 0);
          }
        } else geometry = new T.RingGeometry(0.78, 0.84, 64);
        mesh = new T.Mesh(
          geometry,
          new T.MeshBasicMaterial({
            color: new T.Color(e.kind === 'perfect' ? '#ffad51' : e.color).multiplyScalar(1.5),
            transparent: true,
            opacity: 1,
            side: T.DoubleSide,
            depthWrite: false,
            blending: T.AdditiveBlending,
            toneMapped: false,
          }),
        );
        this.root.add(mesh);
        this.active.set(e, mesh);
        if (e.weapon === 'twins' && (e.kind === 'slash' || e.kind === 'finish')) {
          const second = mesh.clone();
          second.geometry = mesh.geometry.clone();
          second.material = (mesh.material as T.Material).clone();
          second.rotation.x = 0.55;
          second.position.y = -0.22;
          mesh.add(second);
        }
        if (e.kind === 'perfect' || e.kind === 'finish') {
          const rays: number[] = [];
          for (let i = 0; i < 38; i++) {
            const a = i * 2.399963,
              spread = 0.55 + ((i * 17) % 29) / 18,
              tip = spread * (e.kind === 'finish' ? 1.3 : 1);
            rays.push(
              Math.cos(a) * 0.06,
              Math.sin(a) * 0.06,
              0,
              Math.cos(a) * tip,
              Math.sin(a) * tip,
              0,
              Math.cos(a + 0.014) * tip * 0.25,
              Math.sin(a + 0.014) * tip * 0.25,
              0,
            );
          }
          const rayGeo = new T.BufferGeometry();
          rayGeo.setAttribute('position', new T.Float32BufferAttribute(rays, 3));
          const burst = new T.Mesh(
            rayGeo,
            new T.MeshBasicMaterial({
              color: new T.Color(2, 0.52, 0.055),
              side: T.DoubleSide,
              transparent: true,
              blending: T.AdditiveBlending,
              depthWrite: false,
              toneMapped: false,
            }),
          );
          mesh.add(burst);
          const core = new T.Sprite(
            new T.SpriteMaterial({
              map: this.materialsGlow,
              color: new T.Color(3, 1.7, 0.7),
              transparent: true,
              blending: T.AdditiveBlending,
              depthWrite: false,
              toneMapped: false,
            }),
          );
          core.scale.set(1.1, 1.1, 1);
          mesh.add(core);
          const metal = new T.Sprite(
            new T.SpriteMaterial({
              map: this.materialsGlow,
              color: new T.Color(1.3, 2.3, 3.8),
              transparent: true,
              depthWrite: false,
              blending: T.AdditiveBlending,
              toneMapped: false,
            }),
          );
          metal.scale.set(0.45, 0.16, 1);
          mesh.add(metal);
        }
      }
      mesh.position.copy(globalPosition(w.room, e.x, e.y, e.kind === 'ring' ? 0.12 : 1.32));
      mesh.visible = e.kind !== 'finish' || rawTime >= 0.5;
      (mesh.material as T.MeshBasicMaterial).opacity =
        (1 - t) * (e.kind === 'slash' ? 0.32 : e.kind === 'perfect' ? 0.2 : 0.65);
      for (const child of mesh.children)
        if (child instanceof T.Mesh || child instanceof T.Sprite)
          (child.material as T.MeshBasicMaterial).opacity = Math.max(0, 1 - t * 1.7);
      if (e.kind === 'slash' || e.kind === 'finish') {
        mesh.rotation.set(0.12, e.angle + (-0.4 + t * 0.6), -0.17);
        if (e.attackKind === 'thrust' || e.weapon === 'spear') mesh.rotation.set(0, -e.angle, 0);
        if (e.attackKind === 'sweep') mesh.position.y -= 0.8;
        if (e.attackKind === 'smash') mesh.rotation.z = Math.PI / 2;
        mesh.scale.setScalar(1 + t * 0.15);
      } else if (e.kind === 'ring') {
        mesh.rotation.set(-Math.PI / 2, 0, 0);
        mesh.scale.setScalar(0.2 + t * e.scale * 1.8);
      } else {
        mesh.quaternion.copy(camera.quaternion);
        mesh.scale.setScalar(e.kind === 'perfect' ? 0.9 + t * 0.6 : 0.2 + t * e.scale * 1.8);
      }
      if (e.kind === 'perfect' || (e.kind === 'finish' && mesh.visible)) {
        flash = Math.max(flash, (1 - t) * e.scale);
        this.light.position.copy(mesh.position);
      }
    }
    this.light.intensity = w.save.settings.flashes
      ? Math.min(8, flash * 6)
      : Math.min(3, flash * 2);
    this.flashSprite.visible = flash > 0;
    this.flashSprite.material.opacity = flash * (w.save.settings.flashes ? 0.4 : 0.1);
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i],
        enemy = w.alive[i];
      ring.visible = !!enemy && enemy.state === 'tell';
      if (enemy && ring.visible) {
        const t = Math.min(1, (w.time - enemy.stateAt) / enemy.strike.windup),
          special = ['smash', 'sweep', 'grab'].includes(enemy.strike.kind);
        ring.position.copy(globalPosition(w.room, enemy.x, enemy.y, 0.04));
        ring.scale.setScalar(enemy.strike.reach * SCALE * (0.45 + t * 0.55));
        const mat = ring.material as T.MeshBasicMaterial;
        mat.color.set(special ? '#e34d37' : '#eeb862');
        mat.opacity = (special ? 0.18 : 0.1) * (duel > 0.5 ? 0.7 : 1);
      }
    }
  }
  dispose(): void {
    this.root.traverse((o) => {
      if (o instanceof T.Mesh || o instanceof T.LineSegments) {
        if (o.parent !== this.spikes) o.geometry.dispose();
        if (o.parent !== this.spikes) (o.material as T.Material).dispose();
      } else if (o instanceof T.Sprite) o.material.dispose();
    });
  }
}
