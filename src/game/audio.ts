import type { Settings } from './save';
import { Random } from './random';

type Cue =
  | 'attack'
  | 'hit'
  | 'parry'
  | 'perfect'
  | 'break'
  | 'hurt'
  | 'death'
  | 'finisher'
  | 'clear'
  | 'ui'
  | 'tell';
type ArsenalCue = 'ranged' | 'release' | 'charge' | 'deflect' | 'reflect';
export class Audio {
  private context?: AudioContext;
  private drone?: GainNode;
  private phase = false;
  private biome = 0;
  private air?: GainNode;
  private airFilter?: BiquadFilterNode;
  settings: Settings;
  constructor(settings: Settings) {
    this.settings = settings;
  }
  unlock(): void {
    try {
      this.context ??= new AudioContext();
      void this.context.resume().catch(() => undefined);
      if (!this.drone) {
        this.drone = this.context.createGain();
        this.drone.gain.value = 0;
        this.drone.connect(this.context.destination);
        for (const frequency of [55, 82.41, 110.3]) {
          const osc = this.context.createOscillator();
          osc.frequency.value = frequency;
          osc.type = 'sine';
          osc.connect(this.drone);
          osc.start();
        }
        const random = new Random('canticle-air'),
          buffer = this.context.createBuffer(
            1,
            this.context.sampleRate * 2,
            this.context.sampleRate,
          ),
          samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = (random.next() * 2 - 1) * 0.3;
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        this.airFilter = this.context.createBiquadFilter();
        this.airFilter.type = 'bandpass';
        this.airFilter.Q.value = 0.5;
        this.air = this.context.createGain();
        this.air.gain.value = 0;
        source.connect(this.airFilter);
        this.airFilter.connect(this.air);
        this.air.connect(this.context.destination);
        source.start();
        this.setBiome(this.biome);
      }
    } catch {
      /* WebAudio is optional on restricted browsers. */
    }
  }
  ambience(combat: boolean, paused: boolean): void {
    this.phase = combat;
    if (this.context && this.drone)
      this.drone.gain.setTargetAtTime(
        paused ? 0 : this.settings.master * this.settings.music * (combat ? 0.04 : 0.022),
        this.context.currentTime,
        0.5,
      );
    if (this.context && this.air)
      this.air.gain.setTargetAtTime(
        paused ? 0 : this.settings.master * this.settings.music * (this.biome === 4 ? 0.18 : 0.08),
        this.context.currentTime,
        1,
      );
  }
  setBiome(biome: number): void {
    this.biome = biome;
    if (this.airFilter && this.context) {
      this.airFilter.frequency.setTargetAtTime(
        [240, 680, 130, 1250, 85][biome],
        this.context.currentTime,
        2,
      );
      this.airFilter.Q.value = biome === 2 ? 2 : 0.5;
    }
  }
  play(cue: Cue | ArsenalCue, source = 'sword'): void {
    if (!this.context || !this.settings.master || !this.settings.sfx) return;
    const ctx = this.context;
    const frequencies: Record<Cue | ArsenalCue, number[]> = {
      ranged:
        source === 'twins'
          ? [780, 1320]
          : source === 'great'
            ? [55, 110, 330]
            : source === 'spear'
              ? [140, 420]
              : [540, 1080],
      release: source === 'orb' ? [110, 165, 330] : [360, 1400],
      charge: [660, 880],
      deflect: source === 'orb' ? [150, 230, 470] : [1780, 2670],
      reflect: source === 'orb' ? [65, 195, 390, 780] : [2100, 3150, 4200],
      attack: [180, 70],
      hit: [110, 46],
      parry: [1040, 1487, 2173],
      perfect: [1260, 1784, 2631, 3781],
      break: [180, 270, 540],
      hurt: [95, 60],
      death: [130, 65],
      finisher: [65, 330, 660],
      clear: [330, 440, 660],
      ui: [440],
      tell: this.phase ? [240, 480] : [300],
    };
    const weight = ['brute', 'boss', 'great'].includes(source)
      ? 0.55
      : source === 'spear'
        ? 1.35
        : 1;
    if (cue === 'tell')
      frequencies.tell =
        source === 'monk'
          ? [440, 660, 881]
          : source === 'boss'
            ? [65, 130, 195]
            : source === 'assassin'
              ? [780, 1400]
              : source === 'brute'
                ? [65, 89]
                : frequencies.tell;
    frequencies[cue].forEach((frequency, i) => {
      frequency *= weight;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const time = ctx.currentTime + (cue === 'clear' ? i * 0.09 : i * 0.012);
      const duration =
        cue === 'finisher' || cue === 'break' ? 0.45 : cue === 'perfect' ? 0.32 : 0.14;
      osc.type = ['attack', 'hit', 'hurt', 'finisher'].includes(cue) ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(frequency, time);
      osc.frequency.exponentialRampToValueAtTime(
        frequency * (cue === 'attack' ? 0.3 : 0.9),
        time + duration,
      );
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(
        (this.settings.master * this.settings.sfx * 0.12) / (i + 1),
        time + 0.004,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + duration + 0.02);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    });
  }
}
