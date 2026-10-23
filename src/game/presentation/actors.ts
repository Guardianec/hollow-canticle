import * as T from 'three';
import type { Enemy, Player } from '../world';
import { Materials } from './materials';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export class Actor {
  readonly root = new T.Group();
  readonly torso = new T.Group();
  readonly head = new T.Group();
  readonly rightArm = new T.Group();
  readonly leftArm = new T.Group();
  readonly rightLeg = new T.Group();
  readonly leftLeg = new T.Group();
  readonly blade = new T.Group();
  readonly offhand = new T.Group();
  readonly detail = new T.Group();
  private cape: T.Mesh;
  private cloak: T.MeshStandardMaterial;
  private weaponId = '';
  private ownedGeometry = new Set<T.BufferGeometry>();
  private steel: T.MeshStandardMaterial;
  constructor(
    private materials: Materials,
    readonly id: string,
    readonly player: boolean,
  ) {
    const m = materials;
    this.steel = new T.MeshStandardMaterial({
      color: player ? '#899d9f' : '#657783',
      map: m.weave,
      metalness: 0.68,
      roughness: 0.6,
      flatShading: true,
    });
    const dark = new T.MeshStandardMaterial({
      color: player
        ? '#17232b'
        : id === 'monk'
          ? '#858376'
          : id === 'assassin'
            ? '#302932'
            : '#2d333a',
      roughness: 0.93,
    });
    this.cloak = new T.MeshStandardMaterial({
      color: player
        ? '#34434c'
        : id === 'monk'
          ? '#b7b3a0'
          : id === 'duelist'
            ? '#5a292a'
            : '#252a30',
      map: m.weave,
      bumpMap: m.weave,
      bumpScale: 0.035,
      roughness: 1,
      side: T.DoubleSide,
    });
    const leather = new T.MeshStandardMaterial({ color: '#4b392c', roughness: 0.9 });
    const skin = new T.MeshStandardMaterial({
      color: player ? '#79604b' : '#776a58',
      roughness: 1,
    });
    const mesh = (
      parent: T.Group,
      geometry: T.BufferGeometry,
      material: T.Material,
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
    ) => {
      const obj = new T.Mesh(geometry, material);
      obj.position.set(x, y, z);
      obj.scale.set(sx, sy, sz);
      obj.castShadow = obj.receiveShadow = true;
      parent.add(obj);
      return obj;
    };
    this.root.add(this.torso, this.rightLeg, this.leftLeg);
    this.torso.position.y = 0.94;
    mesh(this.torso, m.sphere, dark, 0, 0.21, 0, 0.77, 0.93, 0.49);
    mesh(this.torso, m.sphere, this.steel, 0, 0.26, 0.08, 0.68, 0.65, 0.4);
    mesh(this.torso, m.rounded, leather, 0, -0.02, 0, 0.75, 0.11, 0.46);
    mesh(this.torso, m.rounded, m.items.bronze, 0, -0.01, 0.25, 0.14, 0.12, 0.045);
    for (let i = 0; i < 5; i++) {
      const angle = (i - 2) * 0.4;
      const plate = mesh(
        this.torso,
        m.rounded,
        this.cloak,
        Math.sin(angle) * 0.32,
        -0.29,
        Math.cos(angle) * 0.15,
        0.27,
        0.45,
        0.09,
      );
      plate.rotation.z = -angle * 0.35;
    }
    this.head.position.y = 0.69;
    this.torso.add(this.head);
    mesh(this.head, m.sphere, skin, 0, 0.08, 0.04, 0.37, 0.46, 0.36);
    if (player || id === 'assassin' || id === 'monk') {
      mesh(this.head, m.sphere, this.cloak, 0, 0.12, -0.035, 0.54, 0.62, 0.5);
      mesh(this.head, m.sphere, dark, 0, 0.08, 0.205, 0.34, 0.39, 0.06);
      mesh(this.head, m.box, skin, 0, 0.1, 0.247, 0.22, 0.045, 0.01);
      mesh(this.head, m.box, leather, 0, -0.04, 0.25, 0.26, 0.15, 0.02);
    } else {
      mesh(this.head, m.sphere, this.steel, 0, 0.16, 0, 0.5, 0.59, 0.46);
      mesh(this.head, m.rounded, m.items.iron, 0, 0.1, 0.235, 0.36, 0.07, 0.07);
      mesh(this.head, m.sphere, this.steel, 0, -0.035, 0.2, 0.34, 0.24, 0.18);
      mesh(this.head, m.rounded, this.steel, 0, 0.03, 0.275, 0.035, 0.22, 0.035);
      if (id !== 'warden' && id !== 'spear')
        for (const side of [-1, 1]) {
          const ridge = mesh(
            this.head,
            m.cone,
            m.items.bronze,
            side * 0.19,
            0.35,
            -0.03,
            0.12,
            0.4,
            0.13,
          );
          ridge.rotation.z = -side * 0.25;
        }
    }
    if (id === 'boss')
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        mesh(
          this.head,
          m.cone,
          m.items.bronze,
          Math.sin(a) * 0.24,
          0.51,
          Math.cos(a) * 0.24,
          0.08,
          0.45,
          0.08,
        );
      }
    this.rightArm.position.set(-0.41, 0.48, 0);
    this.leftArm.position.set(0.41, 0.48, 0);
    this.torso.add(this.rightArm, this.leftArm);
    for (const arm of [this.rightArm, this.leftArm]) {
      mesh(arm, m.sphere, this.steel, 0, -0.035, 0, 0.44, 0.35, 0.46);
      mesh(arm, m.cylinder, dark, 0, -0.23, 0, 0.23, 0.4, 0.25);
      mesh(arm, m.rounded, this.steel, 0, -0.48, 0.07, 0.25, 0.36, 0.26);
      mesh(arm, m.sphere, leather, 0, -0.71, 0.08, 0.2, 0.2, 0.2);
    }
    this.rightArm.add(this.blade);
    this.blade.position.set(0, -0.7, 0.1);
    this.leftArm.add(this.offhand);
    this.offhand.position.set(0, -0.7, 0.1);
    this.rightLeg.position.set(-0.19, 0.86, 0);
    this.leftLeg.position.set(0.19, 0.86, 0);
    for (const leg of [this.rightLeg, this.leftLeg]) {
      mesh(leg, m.cylinder, dark, 0, -0.23, 0, 0.27, 0.48, 0.3);
      mesh(leg, m.sphere, this.steel, 0, -0.44, 0.1, 0.32, 0.27, 0.33);
      mesh(leg, m.rounded, this.steel, 0, -0.65, 0.02, 0.26, 0.37, 0.27);
      mesh(leg, m.rounded, leather, 0, -0.82, 0.12, 0.29, 0.18, 0.5);
    }
    // Torn cloth is a deformed surface, rather than a scaled icon or a rigid cone.
    const capeGeometry = new T.PlaneGeometry(0.9, 1.32, 8, 10);
    const verts = capeGeometry.attributes.position;
    for (let i = 0; i < verts.count; i++) {
      const y = verts.getY(i),
        u = (0.66 - y) / 1.32;
      verts.setX(i, verts.getX(i) * (0.72 + u * 0.4));
      if (u > 0.9) verts.setY(i, y + Math.sin(i * 2.7) * 0.09);
    }
    this.cape = new T.Mesh(capeGeometry, this.cloak);
    this.cape.position.set(0, 0.1, -0.27);
    this.cape.rotation.x = 0.12;
    this.cape.castShadow = true;
    this.torso.add(this.cape);
    if (player) {
      const sash = mesh(this.torso, m.rounded, leather, 0.03, 0.35, 0.25, 0.13, 0.82, 0.07);
      sash.rotation.z = 0.7;
    }
    if (id === 'shield') {
      const shield = new T.Group();
      this.leftArm.add(shield);
      shield.position.set(0.12, -0.44, 0.25);
      mesh(shield, m.sphere, m.items.iron, 0, 0, 0, 0.78, 1.18, 0.2);
      mesh(shield, m.sphere, this.steel, 0, 0.02, 0.1, 0.65, 1.03, 0.09);
      mesh(shield, m.rounded, m.items.bronze, 0, 0, 0.16, 0.05, 0.83, 0.04);
      mesh(shield, m.rounded, m.items.bronze, 0, 0.17, 0.16, 0.47, 0.05, 0.04);
    }
    if (id === 'beast') {
      for (const side of [-1, 1]) {
        const horn = mesh(
          this.head,
          m.cone,
          m.items.moss,
          side * 0.25,
          0.24,
          -0.05,
          0.19,
          0.7,
          0.22,
        );
        horn.rotation.z = -side * 0.6;
      }
    }
    this.torso.add(this.detail);
    // Combat LOD adds segmented armor, buckles, chainmail and rivets at close scale.
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++) {
        mesh(
          this.detail,
          m.rounded,
          this.steel,
          side * 0.31,
          0.03 + i * 0.12,
          0.14,
          0.15,
          0.085,
          0.22,
        );
        mesh(
          this.detail,
          m.sphere,
          m.items.bronze,
          side * 0.28,
          0.1 + i * 0.13,
          0.255,
          0.035,
          0.035,
          0.035,
        );
      }
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 8; col++)
        mesh(
          this.detail,
          m.sphere,
          m.items.iron,
          (col - 3.5) * 0.065,
          -0.18 - row * 0.065,
          0.2,
          0.045,
          0.06,
          0.025,
        );
    for (let i = 0; i < 4; i++)
      mesh(this.detail, m.rounded, leather, 0.25, -0.02 - i * 0.1, -0.23, 0.15, 0.08, 0.1);
    this.setWeapon(
      id === 'spear'
        ? 'spear'
        : ['brute', 'boss'].includes(id)
          ? 'great'
          : id === 'assassin' || id === 'duelist'
            ? 'twins'
            : 'sword',
    );
    this.mergeRigidParts(this.root);
  }

  private mergeRigidParts(parent: T.Group): void {
    const groups = new Map<T.Material, T.Mesh[]>();
    for (const child of [...parent.children]) {
      if (child instanceof T.Group) this.mergeRigidParts(child);
      else if (child instanceof T.Mesh && child !== this.cape) {
        const material = child.material as T.Material;
        const group = groups.get(material) ?? [];
        group.push(child);
        groups.set(material, group);
      }
    }
    for (const [material, meshes] of groups)
      if (meshes.length > 1) {
        const pieces = meshes.map((mesh) => {
          mesh.updateMatrix();
          const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
          g.applyMatrix4(mesh.matrix);
          return g;
        });
        const merged = mergeGeometries(pieces);
        pieces.forEach((g) => g.dispose());
        if (!merged) continue;
        this.ownedGeometry.add(merged);
        for (const mesh of meshes) parent.remove(mesh);
        const mesh = new T.Mesh(merged, material);
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
      }
  }

  setWeapon(id: string): void {
    if (this.weaponId === id) return;
    this.weaponId = id;
    const releaseGeometry = (obj: T.Object3D) => {
      if (obj instanceof T.Mesh && this.ownedGeometry.has(obj.geometry)) {
        obj.geometry.dispose();
        this.ownedGeometry.delete(obj.geometry);
      }
    };
    this.blade.traverse(releaseGeometry);
    this.offhand.traverse(releaseGeometry);
    this.blade.clear();
    this.offhand.clear();
    const m = this.materials;
    const piece = (
      geometry: T.BufferGeometry,
      material: T.Material,
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
    ) => {
      const mesh = new T.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      mesh.castShadow = true;
      this.blade.add(mesh);
      return mesh;
    };
    piece(m.cylinder, m.items.wood, 0, 0.08, 0, 0.08, id === 'spear' ? 1.8 : 0.29, 0.08);
    piece(m.sphere, m.items.bronze, 0, -0.1, 0, 0.14, 0.14, 0.14);
    const length = id === 'spear' ? 0.55 : id === 'great' ? 1.38 : id === 'twins' ? 0.65 : 1.04,
      base = id === 'spear' ? 1 : 0.27;
    piece(m.rounded, m.items.bronze, 0, base, 0, id === 'great' ? 0.38 : 0.3, 0.065, 0.09);
    piece(
      m.rounded,
      this.steel,
      0,
      base + length * 0.45,
      0,
      id === 'great' ? 0.22 : 0.115,
      length,
      0.043,
    );
    piece(
      m.cone,
      this.steel,
      0,
      base + length * 0.97,
      0,
      id === 'great' ? 0.22 : 0.115,
      0.2,
      0.043,
    );
    piece(m.rounded, m.items.trim, -0.047, base + length * 0.45, 0.027, 0.018, length * 0.85, 0.01);
    this.blade.rotation.x = Math.PI * 0.5;
    if (id === 'twins') {
      const second = this.blade.clone(true);
      second.position.set(0, 0, 0);
      second.rotation.x = Math.PI * 0.5;
      this.offhand.add(second);
    }
    this.mergeRigidParts(this.blade);
    this.mergeRigidParts(this.offhand);
  }

  animate(
    entity: Player | Enemy,
    time: number,
    visualTime: number,
    walking: boolean,
    duel: number,
    weapon: string,
  ): void {
    if (this.player) this.setWeapon(weapon);
    const state = entity.state,
      age = time - entity.stateAt,
      enemy = 'def' in entity ? entity : undefined;
    const stride = walking ? Math.sin(visualTime * 12) : 0;
    this.detail.visible = duel > 0.15;
    this.root.rotation.y = -entity.facing + Math.PI / 2;
    this.torso.rotation.set(0, 0, 0);
    this.torso.position.z = 0;
    this.torso.position.y =
      0.94 + (walking ? Math.abs(stride) * 0.035 : Math.sin(visualTime * 2) * 0.012);
    this.rightLeg.rotation.x = stride * 0.5;
    this.leftLeg.rotation.x = -stride * 0.5;
    this.rightArm.rotation.set(-0.25, 0, 0.1);
    this.leftArm.rotation.set(-0.4, 0, -0.15);
    if (state === 'tell' && enemy) {
      const t = Math.min(1, age / enemy.strike.windup);
      this.torso.rotation.y = -0.3 * t;
      this.rightArm.rotation.set(-1.2 - t * 0.65, 0.5, -0.5);
      this.leftArm.rotation.x = -0.7;
      this.torso.rotation.x = -0.08;
    }
    if (state === 'attack' || state === 'active') {
      const t = state === 'active' ? Math.min(1, age / 0.14) : Math.min(1, age / 0.25);
      this.rightArm.rotation.set(-1.7 + t * 2.2, -1 + t * 2, -0.5 + t * 0.5);
      this.torso.rotation.y = -0.45 + t * 0.8;
      this.torso.rotation.x = 0.12;
      if (this.weaponId === 'twins') this.leftArm.rotation.set(-0.8 + t * 0.8, 0.8 - t * 1.5, 0.4);
    }
    if (state === 'parry') {
      this.rightArm.rotation.set(-1.5, -0.4, -0.6);
      this.leftArm.rotation.set(-1.2, 0.5, 0.5);
      this.torso.rotation.y = 0.22;
    }
    const parried =
      enemy &&
      (state === 'recover' || state === 'active') &&
      enemy.posture > 0 &&
      time - enemy.lastPressure < 0.25;
    if (state === 'hurt' || parried) {
      this.torso.rotation.x = -0.23 * Math.max(0, 1 - age / 0.4);
      this.rightArm.rotation.x = -0.7;
    }
    if (state === 'broken' || state === 'stagger') {
      this.torso.rotation.x = 0.65;
      this.torso.position.y = 0.68;
      this.rightArm.rotation.x = 0.3;
      this.leftLeg.rotation.x = -0.4;
    }
    if (state === 'finisher') {
      const t = Math.min(1, age / 0.7);
      this.rightArm.rotation.set(-2 + t * 2.8, -0.5 + t, 0.2);
      this.torso.rotation.y = -0.7 + t * 1.4;
      this.torso.rotation.x = 0.12;
      if (this.weaponId === 'great') {
        this.rightArm.rotation.set(-2.6 + t * 3.4, 0, 0);
        this.torso.rotation.x = t * 0.35;
      }
      if (this.weaponId === 'spear') {
        this.rightArm.rotation.set(-0.5, 0, 0);
        this.torso.position.z = t * 0.3;
      }
      if (this.weaponId === 'twins') this.leftArm.rotation.set(-1.4 + t * 1.8, 0.8 - t * 1.5, -0.2);
    }
    if (state === 'dodge') {
      this.torso.rotation.x = 0.65;
      this.torso.position.y = 0.66;
      this.rightArm.rotation.x = -0.7;
    }
    if (state === 'dead') {
      this.root.rotation.z = Math.PI * 0.5;
      this.torso.position.y = 0.3;
    } else this.root.rotation.z = 0;
    const positions = this.cape.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i),
        u = (0.66 - y) / 1.32;
      positions.setZ(
        i,
        Math.sin(visualTime * 3 + positions.getX(i) * 5 + u * 3) * u * 0.1 +
          u * u * 0.2 +
          (walking ? u * 0.13 : 0),
      );
    }
    positions.needsUpdate = true;
    this.cape.geometry.computeVertexNormals();
  }
  dispose(): void {
    const shared = Object.values(this.materials.items),
      owned = new Set<T.Material>();
    this.root.traverse((obj) => {
      if (obj instanceof T.Mesh) {
        const mat = obj.material as T.Material;
        if (!shared.includes(mat as T.MeshStandardMaterial)) owned.add(mat);
      }
    });
    owned.forEach((m) => m.dispose());
    this.ownedGeometry.forEach((g) => g.dispose());
    this.cape.geometry.dispose();
  }
}
