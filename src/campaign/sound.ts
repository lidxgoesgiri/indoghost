import type { Mode } from '../types';
import type { Preferences } from './save';

const scores = {
  chase: { root: 73.42, phrase: [1, 1.5, 1.125, 1.335], spacing: 0.95 },
  sweeper: { root: 87.31, phrase: [1.5, 1.335, 1, 1.125], spacing: 1.28 },
  escape: { root: 65.41, phrase: [1, 1.06, 1.335, 1.125], spacing: 1.15 }
};
type Bus = 'music' | 'ambience' | 'effects';
type Graph = { ctx: AudioContext; master: GainNode; buses: Record<Bus, GainNode> };
export function scoreStep(mode: Mode, danger: number, beat: number) {
  const score = scores[mode],
    tension = Math.max(0, Math.min(1, danger));
  return {
    melody: score.root * 2 * score.phrase[beat % 4],
    pulse: score.root * (1 + 0.02 * tension),
    spacing: score.spacing * (1 - 0.48 * tension),
    pulseGain: 0.007 + 0.045 * tension,
    dissonance: tension > 0.44
  };
}

/** Web Audio owns its own clock. Game simulation only publishes changes in threat. */
export class WatchSound {
  private graph: Graph | null = null;
  private voices = new Set<OscillatorNode>();
  private timer: number | null = null;
  private mode: Mode | null = null;
  private danger = 0;
  private beat = 0;
  private beatAt = 0;
  constructor(private prefs: Preferences) {}
  setPreferences(prefs: Preferences) {
    this.prefs = prefs;
    if (!prefs.sound) this.stop();
    const g = this.graph;
    if (!g) return;
    const at = g.ctx.currentTime;
    g.master.gain.setTargetAtTime(prefs.sound ? prefs.level : 0, at, 0.024);
    for (const bus of ['music', 'ambience', 'effects'] as const)
      g.buses[bus].gain.setTargetAtTime(prefs[bus], at, 0.024);
  }
  unlock() {
    if (!this.prefs.sound || document.hidden) return;
    try {
      if (!this.graph) {
        const ctor =
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!ctor) return;
        const ctx = new ctor(),
          master = ctx.createGain();
        const buses = { music: ctx.createGain(), ambience: ctx.createGain(), effects: ctx.createGain() };
        master.gain.value = this.prefs.level;
        master.connect(ctx.destination);
        for (const bus of ['music', 'ambience', 'effects'] as const) {
          buses[bus].gain.value = this.prefs[bus];
          buses[bus].connect(master);
        }
        this.graph = { ctx, master, buses };
      }
      if (this.graph.ctx.state === 'suspended') void this.graph.ctx.resume().catch(() => {});
    } catch {
      /* Visual cues continue when audio is unavailable. */
    }
  }
  private voice(
    bus: Bus,
    hz: number,
    at: number,
    duration: number,
    amplitude: number,
    type: OscillatorType,
    attack = 0.021
  ) {
    const g = this.graph;
    if (!g || !this.prefs.sound || !this.prefs[bus] || document.hidden) return;
    const osc = g.ctx.createOscillator(),
      envelope = g.ctx.createGain();
    osc.type = type;
    osc.frequency.value = hz;
    envelope.gain.setValueAtTime(0.00001, at);
    envelope.gain.exponentialRampToValueAtTime(amplitude, at + attack);
    envelope.gain.exponentialRampToValueAtTime(0.00001, at + duration);
    osc.connect(envelope).connect(g.buses[bus]);
    this.voices.add(osc);
    osc.onended = () => {
      osc.disconnect();
      envelope.disconnect();
      this.voices.delete(osc);
    };
    osc.start(at);
    osc.stop(at + duration + 0.02);
  }
  private schedule = () => {
    const g = this.graph;
    if (!g || !this.mode || document.hidden) return;
    const now = g.ctx.currentTime;
    if (this.beatAt < now) this.beatAt = now;
    while (this.beatAt <= now + 0.15) {
      const step = scoreStep(this.mode, this.danger, this.beat),
        at = this.beatAt;
      this.voice('music', step.melody, at, 0.87, 0.035, 'sine');
      this.voice('music', step.pulse, at, 0.28, step.pulseGain, 'triangle');
      if (step.dissonance) this.voice('music', step.melody * 1.06, at + 0.14, 0.36, 0.012, 'sine');
      if (this.beat % 4 === 0) this.voice('ambience', scores[this.mode].root / 2, at, 3.6, 0.035, 'sine', 0.45);
      this.beatAt += step.spacing;
      this.beat++;
    }
  };
  start(mode: Mode, danger = 0) {
    this.stop();
    if (!this.prefs.sound || !this.graph || document.hidden) return;
    this.mode = mode;
    this.threat(danger);
    this.beat = 0;
    this.beatAt = this.graph.ctx.currentTime;
    this.schedule();
    this.timer = window.setInterval(this.schedule, 85);
  }
  threat(level: number) {
    this.danger = Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0;
  }
  cue(name: string) {
    const tones: Record<string, number> = {
      coin: 690,
      lantern: 220,
      gate: 330,
      cage: 116,
      tile: 284,
      hint: 410,
      error: 132,
      enable: 196
    };
    if (tones[name] && this.graph)
      this.voice(
        'effects',
        tones[name],
        this.graph.ctx.currentTime,
        name === 'lantern' ? 0.46 : 0.2,
        0.065,
        'sine'
      );
  }
  result(victory: boolean) {
    if (!this.graph) return;
    const now = this.graph.ctx.currentTime;
    if (victory)
      [220, 329.63, 440].forEach((freq, i) => this.voice('music', freq, now + i * 0.18, 0.56, 0.075, 'sine'));
    else if (this.prefs.horror !== 'quiet')
      this.voice(
        'effects',
        this.prefs.horror === 'full' ? 105 : 145,
        now,
        0.64,
        this.prefs.horror === 'full' ? 0.14 : 0.065,
        'triangle',
        0.044
      );
  }
  stop() {
    this.mode = null;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    for (const voice of this.voices) {
      try {
        voice.stop();
      } catch {
        /* Voice already ended. */
      }
    }
    this.voices.clear();
  }
  dispose() {
    this.stop();
    const graph = this.graph;
    this.graph = null;
    if (graph && graph.ctx.state !== 'closed') void graph.ctx.close().catch(() => {});
  }
}
