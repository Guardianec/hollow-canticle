import type { Settings } from './save';

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
export class Audio {
  private context?: AudioContext;
  private drone?: GainNode;
  private phase = false;
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
  }
  play(cue: Cue): void {
    if (!this.context || !this.settings.master || !this.settings.sfx) return;
    const ctx = this.context;
    const frequencies: Record<Cue, number[]> = {
      attack: [180, 70],
      hit: [110, 46],
      parry: [880, 1320],
      perfect: [1320, 1980, 2640],
      break: [180, 270, 540],
      hurt: [95, 60],
      death: [130, 65],
      finisher: [65, 330, 660],
      clear: [330, 440, 660],
      ui: [440],
      tell: this.phase ? [240, 480] : [300],
    };
    frequencies[cue].forEach((frequency, i) => {
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
