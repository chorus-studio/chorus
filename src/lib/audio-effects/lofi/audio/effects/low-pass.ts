export interface LowPassParams {
  frequency: number; // 400-4000 Hz
  resonance: number; // 0-20 Q factor
}

const DEFAULT_PARAMS: LowPassParams = {
  frequency: 2000,
  resonance: 1,
};

export class LowPassEffect {
  readonly node: BiquadFilterNode;
  private _enabled = true;

  constructor(ctx: AudioContext, params: Partial<LowPassParams> = {}) {
    const p = { ...DEFAULT_PARAMS, ...params };
    this.node = ctx.createBiquadFilter();
    this.node.type = 'lowpass';
    this.node.frequency.value = p.frequency;
    this.node.Q.value = p.resonance;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
    // When disabled, set frequency to max so it passes everything through
    this.node.frequency.value = value ? this.node.frequency.value : 20000;
  }

  setCutoff(hz: number): void {
    const clamped = Math.max(400, Math.min(4000, hz));
    this.node.frequency.value = clamped;
  }

  setResonance(q: number): void {
    const clamped = Math.max(0, Math.min(20, q));
    this.node.Q.value = clamped;
  }

  /** Map a 0-100 intensity value to the cutoff frequency (100=most filtered=400Hz, 0=least=4000Hz) */
  setIntensity(value: number): void {
    const normalized = Math.max(0, Math.min(100, value)) / 100;
    // Invert: higher intensity = lower cutoff = more filtering
    const frequency = 4000 - normalized * 3600; // 4000 -> 400 Hz
    this.setCutoff(frequency);
    // Add resonance bump at higher intensities for lo-fi warmth
    this.node.Q.value = 1 + normalized * 4; // 1 -> 5 Q
  }
}
