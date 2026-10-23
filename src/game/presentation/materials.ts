import * as T from 'three';
function bevelledBlock(): T.BufferGeometry {
  const p = [
    [-0.5, -0.5, -0.5],
    [0.5, -0.5, -0.5],
    [0.5, -0.5, 0.5],
    [-0.5, -0.5, 0.5],
    [-0.5, 0.43, -0.5],
    [0.5, 0.43, -0.5],
    [0.5, 0.43, 0.5],
    [-0.5, 0.43, 0.5],
    [-0.44, 0.5, -0.44],
    [0.44, 0.5, -0.44],
    [0.44, 0.5, 0.44],
    [-0.44, 0.5, 0.44],
  ];
  const faces: number[] = [];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    faces.push(i, j, j + 4, i, j + 4, i + 4, i + 4, j + 4, j + 8, i + 4, j + 8, i + 8);
  }
  faces.push(8, 9, 10, 8, 10, 11, 0, 2, 1, 0, 3, 2);
  for (let i = 0; i < faces.length; i += 3)
    [faces[i + 1], faces[i + 2]] = [faces[i + 2], faces[i + 1]];
  const g = new T.BufferGeometry();
  g.setAttribute(
    'position',
    new T.Float32BufferAttribute(
      faces.flatMap((i) => p[i]),
      3,
    ),
  );
  g.computeVertexNormals();
  const uv: number[] = [];
  for (let i = 0; i < faces.length; i++) {
    const v = p[faces[i]],
      n = g.attributes.normal;
    uv.push(
      Math.abs(n.getX(i)) > 0.6 ? v[2] + 0.5 : v[0] + 0.5,
      Math.abs(n.getY(i)) > 0.6 ? v[2] + 0.5 : v[1] + 0.5,
    );
  }
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  return g;
}

export const SCALE = 0.025;
export type MaterialName =
  | 'stone'
  | 'darkStone'
  | 'trim'
  | 'iron'
  | 'bronze'
  | 'wood'
  | 'moss'
  | 'snow'
  | 'cloth'
  | 'fungus'
  | 'lava';
export class Materials {
  readonly playerPosition = new T.Vector3();
  readonly time = { value: 0 };
  readonly weave: T.CanvasTexture;
  readonly items: Record<MaterialName, T.MeshStandardMaterial>;
  readonly box = new T.BoxGeometry(1, 1, 1);
  readonly rounded = bevelledBlock();
  readonly cylinder = new T.CylinderGeometry(0.5, 0.55, 1, 8);
  readonly cone = new T.ConeGeometry(0.5, 1, 7);
  readonly sphere = new T.IcosahedronGeometry(0.5, 1);
  readonly mushroom = new T.LatheGeometry(
    [
      new T.Vector2(0, 0.34),
      new T.Vector2(0.18, 0.31),
      new T.Vector2(0.35, 0.19),
      new T.Vector2(0.49, -0.01),
      new T.Vector2(0.5, -0.08),
      new T.Vector2(0.32, -0.12),
      new T.Vector2(0, -0.1),
    ],
    14,
  );
  readonly glow: T.CanvasTexture;
  constructor() {
    const map = new T.TextureLoader().load(import.meta.env.BASE_URL + 'assets/weathered-stone.png');
    map.colorSpace = T.SRGBColorSpace;
    map.wrapS = map.wrapT = T.RepeatWrapping;
    map.anisotropy = 4;
    const stone = (color: string) =>
      new T.MeshStandardMaterial({
        color,
        map,
        bumpMap: map,
        bumpScale: 0.14,
        roughness: 0.94,
        metalness: 0.06,
      });
    this.items = {
      stone: stone('#b2b2a7'),
      darkStone: stone('#6d797d'),
      trim: stone('#b4ad96'),
      iron: new T.MeshStandardMaterial({ color: '#343f48', roughness: 0.58, metalness: 0.75 }),
      bronze: new T.MeshStandardMaterial({ color: '#9d7840', roughness: 0.55, metalness: 0.7 }),
      wood: new T.MeshStandardMaterial({ color: '#514331', roughness: 0.95 }),
      moss: new T.MeshStandardMaterial({ color: '#4b6645', roughness: 1, side: T.DoubleSide }),
      snow: new T.MeshStandardMaterial({ color: '#cfdfdf', roughness: 0.95 }),
      cloth: new T.MeshStandardMaterial({ color: '#612e2d', roughness: 1, side: T.DoubleSide }),
      fungus: new T.MeshStandardMaterial({
        color: '#8a5fbc',
        emissive: '#57308d',
        emissiveIntensity: 0.7,
        roughness: 0.65,
      }),
      lava: new T.MeshStandardMaterial({
        color: '#ff7528',
        emissive: '#ff4b0c',
        emissiveIntensity: 1.8,
        roughness: 0.6,
      }),
    };
    this.items.lava.onBeforeCompile = (shader) => {
      shader.uniforms.uLavaTime = this.time;
      shader.vertexShader = 'varying vec3 vLavaWorld;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvec4 lp=vec4(transformed,1.);\n#ifdef USE_INSTANCING\nlp=instanceMatrix*lp;\n#endif\nvLavaWorld=(modelMatrix*lp).xyz;',
      );
      shader.fragmentShader =
        `varying vec3 vLavaWorld; uniform float uLavaTime;
        vec2 lavaHash(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
        float lavaSeam(vec2 p){vec2 cell=floor(p),f=fract(p);float first=8.,second=8.;
          for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 n=vec2(float(x),float(y));vec2 d=n+lavaHash(cell+n)-f;float v=dot(d,d);if(v<first){second=first;first=v;}else if(v<second){second=v;}}
          return 1.-smoothstep(.015,.13,second-first);}
      ` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float seam=lavaSeam(vLavaWorld.xz*.8+vec2(uLavaTime*.013,0.));
        float pulse=.85+.15*sin(uLavaTime*1.3+vLavaWorld.x*.4);
        diffuseColor.rgb=mix(vec3(.045,.018,.012),vec3(.7,.12,.008),seam);
        totalEmissiveRadiance=mix(vec3(.065,.009,.002),vec3(2.2,.34,.012)*pulse,seam);`,
      );
    };
    const cap = document.createElement('canvas');
    cap.width = cap.height = 128;
    const cc = cap.getContext('2d')!;
    cc.fillStyle = '#80619b';
    cc.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 65; i++) {
      const x = ((((Math.sin(i * 127.1) * 43758.54) % 1) + 1) % 1) * 128;
      const y = ((((Math.sin(i * 311.7) * 9645.34) % 1) + 1) % 1) * 128;
      cc.fillStyle = i % 3 ? '#ae8ac4' : '#e8c6ed';
      cc.beginPath();
      cc.ellipse(x, y, 1.2 + (i % 3), 2.5 + (i % 4), 0, 0, Math.PI * 2);
      cc.fill();
    }
    const capMap = new T.CanvasTexture(cap);
    capMap.colorSpace = T.SRGBColorSpace;
    this.items.fungus.map = capMap;
    this.items.fungus.emissiveMap = capMap;
    const fabric = document.createElement('canvas');
    fabric.width = fabric.height = 128;
    const fc = fabric.getContext('2d')!;
    fc.fillStyle = '#a3a39e';
    fc.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 128; i++) {
      fc.fillStyle = i % 3 ? '#959792' : '#b6b5ab';
      fc.fillRect(i, 0, 1, 128);
      fc.globalAlpha = 0.3;
      fc.fillRect(0, i, 128, 1);
      fc.globalAlpha = 1;
    }
    this.weave = new T.CanvasTexture(fabric);
    this.weave.wrapS = this.weave.wrapT = T.RepeatWrapping;
    this.weave.repeat.set(4, 4);
    this.weave.colorSpace = T.SRGBColorSpace;
    for (const name of ['stone', 'darkStone', 'trim', 'iron'] as const) {
      this.items[name].onBeforeCompile = (shader) => {
        shader.uniforms.uPlayer = { value: this.playerPosition };
        shader.vertexShader = 'varying vec3 vOcclusionWorld;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <worldpos_vertex>',
          '#include <worldpos_vertex>\nvec4 op = vec4(transformed,1.0);\n#ifdef USE_INSTANCING\nop=instanceMatrix*op;\n#endif\nvOcclusionWorld=(modelMatrix*op).xyz;',
        );
        shader.fragmentShader =
          'uniform vec3 uPlayer; varying vec3 vOcclusionWorld;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          '#include <dithering_fragment>\nvec3 sight=normalize(uPlayer+vec3(0.,1.,0.)-cameraPosition);\nfloat along=dot(vOcclusionWorld-cameraPosition,sight);\nfloat radial=length(vOcclusionWorld-cameraPosition-sight*along);\nif(along>0.&&along<length(uPlayer-cameraPosition)-.5&&radial<.65&&vOcclusionWorld.y>uPlayer.y+.3&&mod(gl_FragCoord.x+gl_FragCoord.y,4.)>0.)discard;',
        );
      };
    }
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const c = canvas.getContext('2d')!,
      g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, '#ffffffff');
    g.addColorStop(0.12, '#ffffffcc');
    g.addColorStop(0.4, '#ffffff30');
    g.addColorStop(1, '#ffffff00');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
    this.glow = new T.CanvasTexture(canvas);
  }
  dispose() {
    for (const m of Object.values(this.items)) m.dispose();
    for (const g of [this.box, this.rounded, this.cylinder, this.cone, this.sphere, this.mushroom])
      g.dispose();
    this.items.fungus.map?.dispose();
    this.glow.dispose();
    this.weave.dispose();
  }
}
type Shape = 'box' | 'rounded' | 'cylinder' | 'cone' | 'sphere' | 'mushroom';
interface Part {
  position: T.Vector3;
  scale: T.Vector3;
  rotation: T.Euler;
  color: T.Color;
}
export class Batches {
  private batches = new Map<string, { shape: Shape; material: MaterialName; parts: Part[] }>();
  constructor(private materials: Materials) {}
  add(
    shape: Shape,
    material: MaterialName,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    rotation = 0,
    color = '#ffffff',
  ) {
    const key = shape + material;
    let batch = this.batches.get(key);
    if (!batch) {
      batch = { shape, material, parts: [] };
      this.batches.set(key, batch);
    }
    batch.parts.push({
      position: new T.Vector3(x, y, z),
      scale: new T.Vector3(sx, sy, sz),
      rotation: new T.Euler(0, rotation, 0),
      color: new T.Color(color),
    });
  }
  build(group: T.Group): void {
    const dummy = new T.Object3D();
    for (const batch of this.batches.values()) {
      const mesh = new T.InstancedMesh(
        this.materials[batch.shape],
        this.materials.items[batch.material],
        batch.parts.length,
      );
      batch.parts.forEach((part, i) => {
        dummy.position.copy(part.position);
        dummy.scale.copy(part.scale);
        dummy.rotation.copy(part.rotation);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, part.color);
      });
      mesh.castShadow = batch.material !== 'moss';
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
  }
}
