import type { AttackKind } from '../data';
import type { Enemy, Player } from '../world';
import { BODY_PROFILES, type Rotation } from './profiles';
import { characterFor } from '../characters';

export const JOINTS = [
  'torso',
  'head',
  'rightArm',
  'leftArm',
  'rightForearm',
  'leftForearm',
  'rightLeg',
  'leftLeg',
  'rightShin',
  'leftShin',
  'blade',
] as const;
export type Joint = (typeof JOINTS)[number];
export type Pose = Record<Joint, Rotation> & { lift: number; advance: number; lean: number };
type KeyPose = Partial<Record<Joint, Rotation>> & {
  lift?: number;
  advance?: number;
  lean?: number;
};
export interface AnimationClip {
  name: string;
  keys: { at: number; pose: KeyPose }[];
  hitWindow?: [number, number];
  events?: { at: number; name: string }[];
}
const zero = (): Pose => ({
  torso: [0, 0, 0],
  head: [0, 0, 0],
  rightArm: [0, 0, 0],
  leftArm: [0, 0, 0],
  rightForearm: [0, 0, 0],
  leftForearm: [0, 0, 0],
  rightLeg: [0, 0, 0],
  leftLeg: [0, 0, 0],
  rightShin: [0, 0, 0],
  leftShin: [0, 0, 0],
  blade: [0, 0, 0],
  lift: 0,
  advance: 0,
  lean: 0,
});
const clamp = (x: number) => Math.max(0, Math.min(1, x));
export function sampleClip(clip: AnimationClip, time: number): Pose {
  const t = clamp(time),
    keys = clip.keys;
  const end = keys.findIndex((k) => k.at >= t);
  const b = keys[end < 0 ? keys.length - 1 : end],
    a = keys[end < 0 ? keys.length - 1 : Math.max(0, end - 1)];
  const raw = b.at === a.at ? 1 : clamp((t - a.at) / (b.at - a.at));
  const u = raw * raw * (3 - 2 * raw),
    pose = zero();
  for (const joint of JOINTS)
    for (let axis = 0; axis < 3; axis++)
      pose[joint][axis] = (a.pose[joint]?.[axis] ?? 0) * (1 - u) + (b.pose[joint]?.[axis] ?? 0) * u;
  for (const channel of ['lift', 'advance', 'lean'] as const)
    pose[channel] = (a.pose[channel] ?? 0) * (1 - u) + (b.pose[channel] ?? 0) * u;
  return pose;
}

const attackKeys: Record<AttackKind, [KeyPose, KeyPose, KeyPose]> = {
  slash: [
    {
      rightArm: [-1.65, -0.8, -0.9],
      rightForearm: [-1, 0, 0],
      torso: [-0.1, -0.65, -0.1],
      advance: -0.1,
    },
    {
      rightArm: [-1.1, 1.1, 0.5],
      rightForearm: [-0.15, 0, 0],
      torso: [0.12, 0.7, 0.12],
      advance: 0.2,
    },
    {
      rightArm: [-0.2, 1.3, 0.45],
      rightForearm: [-0.25, 0, 0],
      torso: [0.15, 0.45, 0],
      advance: 0.12,
    },
  ],
  thrust: [
    {
      rightArm: [-0.45, -0.3, -0.2],
      rightForearm: [-1.3, 0, 0],
      torso: [-0.12, -0.55, 0],
      advance: -0.24,
      rightLeg: [-0.2, 0, 0],
    },
    {
      rightArm: [-1.45, 0.3, 0],
      rightForearm: [-0.08, 0, 0],
      torso: [0.25, 0.1, 0],
      advance: 0.45,
      leftLeg: [-0.45, 0, 0],
    },
    { rightArm: [-1.1, 0.2, 0], rightForearm: [-0.3, 0, 0], torso: [0.13, 0.1, 0], advance: 0.2 },
  ],
  sweep: [
    {
      rightArm: [-0.4, -1, -0.9],
      rightForearm: [-0.55, 0, 0],
      torso: [0.25, -1, 0.1],
      lift: -0.14,
    },
    {
      rightArm: [-0.35, 1.35, 0.8],
      rightForearm: [-0.1, 0, 0],
      torso: [0.25, 1.1, -0.12],
      lift: -0.15,
      advance: 0.22,
    },
    { rightArm: [-0.2, 1.5, 0.7], torso: [0.15, 0.6, 0], lift: -0.1 },
  ],
  smash: [
    {
      rightArm: [-2.9, -0.1, -0.1],
      leftArm: [-2.65, 0.2, 0.2],
      rightForearm: [-0.9, 0, 0],
      torso: [-0.35, -0.15, 0],
      lift: 0.05,
      advance: -0.18,
    },
    {
      rightArm: [-0.45, 0, 0],
      leftArm: [-0.5, 0.2, 0.1],
      rightForearm: [-0.1, 0, 0],
      torso: [0.7, 0.1, 0],
      lift: -0.23,
      advance: 0.3,
    },
    { rightArm: [0.1, 0.2, 0], torso: [0.65, 0.1, 0], lift: -0.2, advance: 0.2 },
  ],
  grab: [
    {
      leftArm: [-0.5, 0.9, 0.7],
      rightArm: [-0.5, -0.8, -0.7],
      torso: [-0.25, 0.2, 0],
      advance: -0.18,
    },
    {
      leftArm: [-1.7, -0.25, -0.2],
      rightArm: [-1.7, 0.25, 0.2],
      torso: [0.5, 0, 0],
      advance: 0.45,
      lift: -0.1,
    },
    { leftArm: [-1.1, -0.3, -0.2], rightArm: [-1.1, 0.3, 0.2], torso: [0.3, 0, 0], advance: 0.15 },
  ],
  feint: [
    {
      rightArm: [-1.65, -0.8, -0.9],
      rightForearm: [-1, 0, 0],
      torso: [-0.1, -0.65, 0],
      advance: -0.1,
    },
    {
      rightArm: [-1.4, -0.4, -0.5],
      rightForearm: [-1.2, 0, 0],
      torso: [-0.1, -0.4, 0],
      advance: -0.25,
    },
    { rightArm: [-0.5, -0.9, -0.3], torso: [-0.05, -0.5, 0], advance: -0.35 },
  ],
};
const attacks = new Map<string, AnimationClip>();
export function attackClip(
  id: string,
  kind: AttackKind,
  variant: number,
  phase = 1,
): AnimationClip {
  const key = `${id}/${kind}/${variant % 3}/${phase}`;
  const existing = attacks.get(key);
  if (existing) return existing;
  const poses = attackKeys[kind].map((p) => structuredClone(p));
  // Authored motion vocabulary changes the full body, not the combat clock.
  for (const [i, p] of poses.entries()) {
    if (id === 'duelist') {
      p.leftArm = [0.25, 0.6, -0.65];
      p.leftLeg = [i === 0 ? -0.35 : 0.2, 0, -0.08];
      p.lean = -0.08;
    }
    if (id === 'assassin' || id === 'twins') {
      p.leftArm = [p.rightArm?.[0] ?? -0.8, -(p.rightArm?.[1] ?? 0), -(p.rightArm?.[2] ?? 0)];
      if (kind === 'slash') {
        if (variant % 2) p.rightArm = [-0.6, -0.7, -0.6];
        else p.leftArm = [-0.6, 0.7, 0.6];
      }
      p.torso = [0.3, (i === 0 ? -1 : 1.2) * (variant % 2 ? -1 : 1), i === 0 ? 0.15 : -0.2];
      p.lift = -0.17;
      p.rightLeg = [i === 0 ? 0.35 : -0.45, 0, 0.1];
    }
    if (id === 'monk') {
      p.leftArm = [-1.5, i === 0 ? -0.5 : 1, i === 0 ? 1.1 : -0.4];
      p.head = [0, i === 0 ? 0.4 : -0.25, -0.07];
      p.torso = [0.04, i === 0 ? -0.85 : 0.9, 0];
      p.lift = 0.02;
    }
    if (id === 'brute') {
      p.torso = [(p.torso?.[0] ?? 0) * 1.25, (p.torso?.[1] ?? 0) * 0.8, i === 0 ? -0.16 : 0.16];
      p.lift = i === 0 ? -0.12 : -0.24;
      p.leftArm = [...(p.rightArm ?? [-1, 0, 0])];
      p.leftArm[2] *= -1;
      p.leftLeg = [-0.25, 0, 0.18];
      p.rightLeg = [0.25, 0, -0.18];
    }
    if (id === 'great') {
      p.torso = [(p.torso?.[0] ?? 0) * 1.3, (p.torso?.[1] ?? 0) * 1.15, i === 0 ? -0.12 : 0.15];
      p.lift = i === 0 ? -0.13 : -0.2;
      p.leftArm = [...(p.rightArm ?? [-1, 0, 0])];
      p.leftArm[2] *= -1;
      p.leftLeg = [-0.35, 0, 0.16];
      p.rightLeg = [0.3, 0, -0.16];
      p.head = [i === 0 ? -0.15 : 0.15, 0, 0];
    }
    if (id === 'spear' && kind === 'thrust') {
      const reach = variant % 3 === 1 ? 0.6 : variant % 3 === 2 ? 1.3 : 1;
      p.advance = (p.advance ?? 0) * reach;
      p.rightArm = [i === 0 ? -0.5 : -1.4 * reach, i === 0 ? -0.45 : 0.3, 0];
      p.leftLeg = [i === 0 ? 0.15 : -0.45 * reach, 0, 0];
      p.torso = [i === 0 ? -0.12 : 0.25 * reach, i === 0 ? -0.5 : 0.2, 0];
    }
    if (id === 'beast') {
      p.torso = [i === 0 ? -0.25 : 0.4, i === 0 ? -0.5 : 0.8, i === 0 ? 0.2 : -0.2];
      p.head = [-0.35, 0, 0];
      p.lift = i === 0 ? -0.22 : 0.04;
      p.leftArm = [i === 0 ? 0.5 : -1.5, 0.8, 0.5];
    }
    if (id === 'shield') p.leftArm = [-1.1, -0.2, -0.1];
    if (id === 'boss') {
      p.head = [-0.15, i === 0 ? 0.3 : -0.3, 0];
      p.leftArm = phase === 2 ? [-1.6, i === 0 ? -0.5 : 1, 0.9] : [-0.3, 0.6, 0.5];
      if (phase === 2) {
        p.torso = [0.2, i === 0 ? -1.3 : 1.4, -0.15];
        p.advance = i === 0 ? -0.25 : 0.6;
      }
    }
    if (kind === 'slash' && variant % 2) {
      if (p.rightArm) {
        p.rightArm[1] *= -1;
        p.rightArm[2] *= -1;
      }
      if (p.torso) p.torso[1] *= -1;
    }
    if (kind === 'slash' && variant % 3 === 2 && (id === 'warden' || id === 'sword')) {
      p.rightArm = i === 0 ? [-2.7, 0, -0.25] : [-0.45, 0.2, 0.1];
      p.torso = [i === 0 ? -0.2 : 0.4, 0.1, 0];
    }
  }
  const clip: AnimationClip = {
    name: key,
    keys: [
      { at: 0, pose: {} },
      { at: 0.34, pose: poses[0] },
      { at: 0.52, pose: poses[0] },
      { at: 0.58, pose: poses[1] },
      { at: 0.72, pose: poses[2] },
      { at: 1, pose: {} },
    ],
    hitWindow: kind === 'feint' ? undefined : [0.58, 0.72],
    events: kind === 'feint' ? [{ at: 0.52, name: 'abort' }] : [{ at: 0.58, name: 'contact' }],
  };
  attacks.set(key, clip);
  return clip;
}

const finishers: Record<string, AnimationClip> = Object.fromEntries(
  ['sword', 'twins', 'spear', 'great'].map((weapon) => {
    const family =
      attackKeys[weapon === 'spear' ? 'thrust' : weapon === 'great' ? 'smash' : 'slash'];
    const preparation: KeyPose = { ...family[0], leftArm: [-1.5, 0.6, 0.6], advance: -0.1 };
    const contact: KeyPose = { ...family[1], advance: weapon === 'spear' ? 0.6 : 0.25 };
    if (weapon === 'twins') {
      preparation.leftArm = [-1.8, 0.9, 0.9];
      contact.leftArm = [-0.8, -1.3, -0.5];
      contact.torso = [0.2, 1.2, 0];
    }
    return [
      weapon,
      {
        name: `execution/${weapon}`,
        hitWindow: [0.58, 0.72],
        events: [{ at: 0.58, name: 'execution' }],
        keys: [
          { at: 0, pose: { rightArm: [-1.4, -0.4, -0.5], torso: [0, -0.2, 0] } },
          { at: 0.35, pose: preparation },
          { at: 0.5, pose: preparation },
          { at: 0.58, pose: contact },
          { at: 0.8, pose: { ...family[2], lift: -0.08 } },
          { at: 1, pose: {} },
        ],
      } satisfies AnimationClip,
    ];
  }),
);

export interface AnimationSample {
  pose: Pose;
  name: string;
  normalized: number;
  clip?: AnimationClip;
}
export function animateCharacter(
  id: string,
  entity: Player | Enemy,
  time: number,
  walking: boolean,
  weapon: string,
  combat: boolean,
  preview?: { clip: string; time: number },
): AnimationSample {
  const profile = BODY_PROFILES[id] ?? BODY_PROFILES.warden;
  const enemy = 'def' in entity ? entity : undefined;
  const age = Math.max(0, time - entity.stateAt),
    state = entity.state;
  const pose = zero();
  pose.torso = [profile.lean, profile.turn, 0];
  pose.rightArm = [...profile.guard];
  pose.leftArm = [...profile.offguard];
  pose.rightForearm = [-0.45, 0, 0];
  pose.leftForearm = [-0.6, 0, 0];
  pose.lift = -profile.crouch;
  const cycle = time * profile.cadence,
    stride = walking ? Math.sin(cycle) : 0;
  pose.rightLeg = [stride * profile.stride, 0, -0.04];
  pose.leftLeg = [-stride * profile.stride, 0, 0.04];
  pose.rightShin = [Math.max(0, -stride) * 0.5 + profile.crouch, 0, 0];
  pose.leftShin = [Math.max(0, stride) * 0.5 + profile.crouch, 0, 0];
  pose.lift += walking
    ? Math.abs(stride) * (id === 'brute' ? 0.055 : 0.025)
    : Math.sin(time * 2.1) * 0.012;
  pose.torso[2] = id === 'beast' ? Math.sin(cycle * 0.73) * 0.07 : stride * 0.025;
  pose.rightArm[0] += Math.sin(time * 1.8) * 0.035;
  pose.head = [-profile.lean * 0.45, -profile.turn * 0.7, Math.sin(time * 0.8) * 0.02];
  if (!combat && id === 'player') pose.rightArm[0] = -0.2 + stride * 0.15;
  let clip: AnimationClip | undefined,
    normalized = 0;
  const variant = enemy?.variant ?? ('combo' in entity ? entity.combo : 0);
  if (preview?.clip && preview.clip !== 'live') {
    clip =
      preview.clip === 'finisher'
        ? finishers[weapon]
        : attackClip(id, preview.clip as AttackKind, variant, enemy?.phase);
    normalized = preview.time;
  } else if (enemy && ['tell', 'active', 'recover'].includes(state)) {
    clip = attackClip(id, enemy.strike.kind, variant, enemy.phase);
    normalized =
      state === 'tell'
        ? (age / enemy.strike.windup) * 0.58
        : state === 'active'
          ? 0.58 + age
          : 0.72 + clamp(age / Math.max(0.15, enemy.strike.recovery)) * 0.28;
  } else if (state === 'attack') {
    const player = entity as Player;
    clip = attackClip(
      weapon,
      player.move?.kind ??
        (weapon === 'spear' || player.counter ? 'thrust' : weapon === 'great' ? 'smash' : 'slash'),
      variant,
    );
    normalized =
      age < player.attackStartup
        ? (age / player.attackStartup) * 0.58
        : 0.58 + clamp((age - player.attackStartup) / player.attackRecovery) * 0.42;
  } else if (state === 'finisher') {
    clip = finishers[weapon];
    normalized = age / 0.7;
  }
  if (clip) {
    const motion = sampleClip(clip, normalized);
    for (const joint of JOINTS) {
      const weight =
        joint === 'torso' ? 1 : joint.endsWith('Leg') || joint.endsWith('Shin') ? 0.7 : 1;
      const reach = clamp(normalized / 0.2) * clamp((1 - normalized) / 0.2);
      for (let axis = 0; axis < 3; axis++) {
        if (joint.endsWith('Arm') || joint.endsWith('Forearm'))
          pose[joint][axis] = pose[joint][axis] * (1 - reach) + motion[joint][axis];
        else pose[joint][axis] += motion[joint][axis] * weight;
      }
    }
    pose.lift += motion.lift;
    pose.advance = motion.advance;
    if (state === 'finisher' && 'finisherTarget' in entity) {
      if (entity.finisherTarget === 'shield') {
        pose.leftArm = [-1.6, 0.3, 0.3];
        pose.torso[1] += Math.sin(normalized * Math.PI) * 0.45;
      } else if (entity.finisherTarget === 'brute') {
        pose.lift -= Math.sin(normalized * Math.PI) * 0.18;
        pose.leftLeg[0] -= 0.3;
      } else if (entity.finisherTarget === 'boss') {
        pose.head[0] -= 0.25;
        pose.advance += Math.sin(normalized * Math.PI) * 0.18;
        pose.torso[1] += Math.sin(normalized * Math.PI * 2) * 0.35;
      }
    }
  }
  const player = !enemy ? (entity as Player) : undefined;
  if (state === 'ranged' && player) {
    const r = characterFor(weapon).ranged;
    const t = clamp(age / r.startup),
      released = age >= r.startup;
    pose.torso[1] += (released ? 0.5 : -0.5) * Math.sin((Math.min(1, t) * Math.PI) / 2);
    pose.rightArm =
      weapon === 'great'
        ? [released ? -0.3 : -2.5, 0.1, -0.2]
        : weapon === 'twins'
          ? [-1.2, released ? 0.6 : -0.4, -0.3]
          : [released ? -1.5 : -2, released ? 0.3 : -1, -0.35];
    pose.rightForearm = [released ? -0.1 : -1.3, 0, 0];
    pose.leftArm = weapon === 'great' ? [...pose.rightArm] : [-0.6, 0.8, 0.5];
    pose.lift -= weapon === 'great' && released ? 0.2 : 0;
    pose.advance = released ? 0.15 : -0.12;
  }
  if (state === 'item') {
    pose.leftArm = [-1.9, 0.2, 0.3];
    pose.leftForearm = [-1.2, 0, 0];
    pose.head[0] = -0.15;
  }
  if (enemy?.strike.projectile && ['tell', 'active'].includes(state)) {
    const draw = state === 'tell' ? clamp(age / enemy.strike.windup) : 0;
    pose.rightArm =
      enemy.def.id === 'archer' ? [-1.35, -0.8 * draw, -0.25] : [-1.5 * draw, 0.5, 0.4];
    pose.leftArm = [-1.3, 0.15, 0.1];
    pose.rightForearm = [-1.4 * draw, 0, 0];
  }
  const recoil = enemy ? Math.max(0, 1 - (time - enemy.recoilAt) / 0.32) : 0;
  pose.torso[0] -= recoil * 0.4;
  pose.rightArm[0] -= recoil * 0.6;
  const collapse = state === 'broken' || state === 'stagger';
  if (collapse) {
    pose.torso[0] = id === 'monk' ? -0.3 : 0.7;
    pose.lift -= 0.24;
    pose.rightArm = [0.3, 0, -0.15];
    if (id === 'archer') {
      pose.torso = [0.8, -0.3, 0.18];
      pose.leftArm = [0.4, 0, 0.6];
      pose.lift -= 0.1;
    }
    if (id === 'hexer') {
      pose.torso = [-0.45, 0, 0];
      pose.leftArm = [-0.2, 0.7, 0.8];
      pose.head[0] = -0.5;
    }
  }
  if (state === 'hurt') {
    pose.torso[0] -= 0.3 * (1 - clamp(age / 0.22));
  }
  if (state === 'dodge') {
    pose.torso[0] = 0.8;
    pose.lift -= 0.3;
    pose.rightArm[0] = -0.8;
  }
  if (state === 'dead') {
    pose.lean = clamp(age / 0.45) * (id === 'beast' ? -1.4 : 1.5);
    pose.lift -= 0.55 * clamp(age / 0.45);
  }
  return {
    pose,
    clip,
    name:
      state === 'ranged'
        ? `${weapon}/ranged`
        : (clip?.name ?? `${id}/${state}/${walking ? 'stride' : 'guard'}`),
    normalized: clamp(normalized),
  };
}
