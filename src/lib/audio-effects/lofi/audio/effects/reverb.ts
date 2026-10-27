export type ReverbProfile = 'studio' | 'room' | 'hall' | 'spring' | 'cassette';

export interface ReverbParams {
  wetDry: number; // 0-1 (0 = fully dry, 1 = fully wet)
}

const DEFAULT_PARAMS: ReverbParams = {
  wetDry: 0.3,
};

export const DEFAULT_REVERB_PROFILE: ReverbProfile = 'room';

export class ReverbEffect {
  readonly wetGain: GainNode;
  readonly dryGain: GainNode;
  readonly input: GainNode;
  readonly output: GainNode;
  private ctx: AudioContext;
  private convolver: ConvolverNode;
  private _enabled = true;
  private _profile: ReverbProfile = DEFAULT_REVERB_PROFILE;

  constructor(ctx: AudioContext, params: Partial<ReverbParams> = {}) {
    const p = { ...DEFAULT_PARAMS, ...params };
    this.ctx = ctx;

    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.convolver = ctx.createConvolver();

    // Dry path: input -> dryGain -> output
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Wet path: input -> convolver -> wetGain -> output
    this.input.connect(this.convolver);
    this.convolver.connect(this.wetGain);
    this.wetGain.connect(this.output);

    this.setWetDry(p.wetDry);
    this.setProfile(DEFAULT_REVERB_PROFILE);
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
    if (value) {
      this.wetGain.gain.value = this._lastWetDry;
      this.dryGain.gain.value = 1 - this._lastWetDry;
    } else {
      this.wetGain.gain.value = 0;
      this.dryGain.gain.value = 1;
    }
  }

  private _lastWetDry = 0.3;

  get profile(): ReverbProfile {
    return this._profile;
  }

  setWetDry(value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    this._lastWetDry = clamped;
    if (this._enabled) {
      this.wetGain.gain.value = clamped;
      this.dryGain.gain.value = 1 - clamped;
    }
  }

  /** Map a 0-100 intensity value to wet/dry mix */
  setIntensity(value: number): void {
    const normalized = Math.max(0, Math.min(100, value)) / 100;
    this.setWetDry(normalized); // Full range 0-100% wet
  }

  setProfile(profile: ReverbProfile): void {
    if (profile === this._profile && this.convolver.buffer) return;
    this._profile = profile;

    const profileSettings: Record<ReverbProfile, { duration: number; decay: number; brightness: number; reflections: number; density: number }> = {
      studio: { duration: 0.9, decay: 2.1, brightness: 0.7, reflections: 6, density: 0.18 },
      room: { duration: 1.4, decay: 2.6, brightness: 0.58, reflections: 9, density: 0.22 },
      hall: { duration: 3.6, decay: 3.9, brightness: 0.42, reflections: 16, density: 0.28 },
      spring: { duration: 1.8, decay: 2.8, brightness: 0.78, reflections: 14, density: 0.2 },
      cassette: { duration: 0.72, decay: 1.9, brightness: 0.3, reflections: 5, density: 0.14 },
    };

    const config = profileSettings[profile];
    this.generateSyntheticIR(this.ctx, config.duration, config.decay, config);
  }

  /** Load an impulse response buffer */
  async loadImpulseResponse(ctx: AudioContext, url: string): Promise<void> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this.convolver.buffer = await ctx.decodeAudioData(arrayBuffer);
  }

  /** Generate a synthetic impulse response (fallback if no IR file available) */
  generateSyntheticIR(
    ctx: AudioContext,
    duration = 2,
    decay = 3,
    options?: {
      brightness?: number;
      reflections?: number;
      density?: number;
    },
  ): void {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(2, length, sampleRate);
    const brightness = options?.brightness ?? 0.55;
    const earlyReflectionCount = options?.reflections ?? 10;
    const density = options?.density ?? 0.22;

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      const stereoOffset = channel === 0 ? 0.97 : 1.03;
      let filtered = 0;
      let springPhase = Math.random() * Math.PI * 2;

      for (let i = 0; i < earlyReflectionCount; i++) {
        const reflectionTime = 0.008 + Math.pow(i / earlyReflectionCount, 1.35) * 0.14;
        const jitter = (Math.random() - 0.5) * 0.008;
        const index = Math.max(0, Math.min(length - 1, Math.floor((reflectionTime + jitter) * sampleRate)));
        const amplitude = Math.pow(1 - index / length, decay * 0.85) * (0.25 + Math.random() * 0.45);
        data[index] += (Math.random() * 2 - 1) * amplitude * stereoOffset;
      }

      for (let i = 0; i < length; i++) {
        const t = i / length;
        const envelope = Math.pow(1 - t, decay);
        const noise = Math.random() * 2 - 1;
        const damping = 0.62 + brightness * 0.24 - t * (0.14 + (1 - brightness) * 0.1);
        filtered = filtered * damping + noise * density;
        let sample = filtered * envelope * (0.16 + density * 0.28) * stereoOffset;

        if (this._profile === 'spring') {
          springPhase += ((18 + brightness * 10) * Math.PI * 2) / sampleRate;
          sample += Math.sin(springPhase) * envelope * 0.035 * stereoOffset;
        }

        if (this._profile === 'cassette') {
          sample *= 0.72 - t * 0.18;
        }

        data[i] += sample;
      }

      let peak = 0;
      for (let i = 0; i < length; i++) {
        peak = Math.max(peak, Math.abs(data[i]));
      }

      if (peak > 0.95) {
        const scale = 0.95 / peak;
        for (let i = 0; i < length; i++) {
          data[i] *= scale;
        }
      }
    }

    this.convolver.buffer = buffer;
  }
}
