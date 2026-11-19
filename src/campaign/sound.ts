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
    this.applyBed();
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
      this.applyBed();
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
  // ---- Village ambience (landing story) -------------------------------
  // Four synthesized beds, one per chapter: rain on the banyan, a heartbeat
  // under the alley mist, drips on the veranda, wind through the pavilion.
  // Only one is audible at a time; they crossfade as the chapter changes.
  private bed: { layers: GainNode[]; source: AudioBufferSourceNode; wind: GainNode } | null = null;
  private wanted: number | null = null;
  private bedTimer: number | null = null;
  private nextPulse = 0;
  private hushed = false;
  private buildBed() {
    const g = this.graph;
    if (!g || this.bed) return;
    const { ctx } = g;
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    const filter = (type: BiquadFilterType, hz: number, q = 0.7) => {
      const node = ctx.createBiquadFilter();
      node.type = type;
      node.frequency.value = hz;
      node.Q.value = q;
      return node;
    };
    const layer = (...chain: AudioNode[]) => {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      let from: AudioNode = source;
      for (const node of chain) {
        from.connect(node);
        from = node;
      }
      from.connect(gain).connect(g.buses.ambience);
      return gain;
    };
    const rain = layer(filter('highpass', 1300), filter('lowpass', 7200));
    const rumble = layer(filter('lowpass', 170));
    const room = layer(filter('bandpass', 430, 0.9));
    const wind = ctx.createGain();
    const gust = layer(filter('bandpass', 640, 1.5), wind);
    const lfo = ctx.createOscillator(),
      depth = ctx.createGain();
    lfo.frequency.value = 0.13;
    depth.gain.value = 0.55;
    wind.gain.value = 0.6;
    lfo.connect(depth).connect(wind.gain);
    lfo.start();
    source.start();
    this.bed = { layers: [rain, rumble, room, gust], source, wind };
  }
  private applyBed() {
    const g = this.graph;
    if (!g) return;
    const active = this.prefs.sound && !this.hushed ? this.wanted : null;
    if (active !== null) this.buildBed();
    const bed = this.bed;
    if (!bed) return;
    const levels = [0.07, 0.09, 0.03, 0.085];
    bed.layers.forEach((gain, i) => gain.gain.setTargetAtTime(active === i ? levels[i] : 0, g.ctx.currentTime, 0.7));
    if (active === null) {
      if (this.bedTimer !== null) window.clearInterval(this.bedTimer);
      this.bedTimer = null;
    } else if (this.bedTimer === null) {
      this.nextPulse = g.ctx.currentTime + 0.4;
      this.bedTimer = window.setInterval(this.pulse, 110);
    }
  }
  /** Sparse events on top of the beds: heartbeats in the alley, drips on the veranda. */
  private pulse = () => {
    const g = this.graph;
    if (!g || this.wanted === null || document.hidden) return;
    const now = g.ctx.currentTime;
    while (this.nextPulse < now + 0.2) {
      const at = this.nextPulse;
      if (this.wanted === 1) {
        this.voice('ambience', 54, at, 0.24, 0.09, 'sine', 0.012);
        this.voice('ambience', 50, at + 0.27, 0.3, 0.06, 'sine', 0.012);
        this.nextPulse += 1.05;
      } else if (this.wanted === 2) {
        this.voice('ambience', 1350 + Math.random() * 700, at, 0.16, 0.018, 'sine', 0.004);
        this.nextPulse += 0.7 + Math.random() * 1.9;
      } else if (this.wanted === 3) {
        this.voice('ambience', 1318 + Math.random() * 20, at, 2.6, 0.0045, 'sine', 1.1);
        this.nextPulse += 4.5 + Math.random() * 3;
      } else this.nextPulse += 1;
    }
  };
  /** The landing story reports which chapter is on screen (null when none). */
  scene(chapter: number | null) {
    this.wanted = chapter;
    this.applyBed();
  }
  /** Mutes everything while the page is hidden, without forgetting the scene. */
  hush(hidden: boolean) {
    this.hushed = hidden;
    this.applyBed();
  }
  private sweep(from: number, to: number, at: number, duration: number, amplitude: number, type: OscillatorType) {
    const g = this.graph;
    if (!g || !this.prefs.sound || !this.prefs.effects) return;
    const osc = g.ctx.createOscillator(),
      envelope = g.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(to, at + duration);
    envelope.gain.setValueAtTime(0.00001, at);
    envelope.gain.exponentialRampToValueAtTime(amplitude, at + 0.02);
    envelope.gain.exponentialRampToValueAtTime(0.00001, at + duration);
    osc.connect(envelope).connect(g.buses.effects);
    this.voices.add(osc);
    osc.onended = () => {
      osc.disconnect();
      envelope.disconnect();
      this.voices.delete(osc);
    };
    osc.start(at);
    osc.stop(at + duration + 0.02);
  }
  /** Sound for a chapter's scare beat, timed to the picture. Silent on the quiet setting. */
  sting(chapter: number) {
    const g = this.graph;
    if (!g || this.prefs.horror === 'quiet' || this.wanted !== chapter) return;
    const now = g.ctx.currentTime,
      loud = this.prefs.horror === 'full' ? 1 : 0.65;
    if (chapter === 0) this.sweep(140, 48, now + 0.05, 1.4, 0.09 * loud, 'sine');
    else if (chapter === 1)
      [0, 0.11, 0.2].forEach((d, i) => this.sweep(820 + i * 140, 1250 + i * 160, now + d, 0.09, 0.03 * loud, 'triangle'));
    else if (chapter === 2)
      for (let i = 0; i < 6; i++) {
        const at = now + i * 0.43;
        this.voice('effects', 68, at, 0.2, (0.03 + i * 0.012) * loud, 'sine', 0.006);
        this.voice('effects', 210, at, 0.05, (0.008 + i * 0.003) * loud, 'triangle', 0.003);
      }
    // Folk belief: when her laugh sounds faint and far, she is close.
    else [0, 0.24, 0.46, 0.66].forEach((d, i) => this.sweep(1180 - i * 60, 940 - i * 60, now + 0.6 + d, 0.2, 0.016 * loud, 'sine'));
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
    if (this.bedTimer !== null) window.clearInterval(this.bedTimer);
    this.bedTimer = null;
    this.bed = null;
    const graph = this.graph;
    this.graph = null;
    if (graph && graph.ctx.state !== 'closed') void graph.ctx.close().catch(() => {});
  }
}
