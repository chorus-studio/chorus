export class HighPassEffect {
  readonly node: BiquadFilterNode;
  private _enabled = true;

  constructor(ctx: AudioContext) {
    this.node = ctx.createBiquadFilter();
    this.node.type = 'highpass';
    this.node.frequency.value = 20; // pass-through by default
    this.node.Q.value = 0.7;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
    // When disabled, set frequency to min so everything passes through
    if (!value) {
      this.node.frequency.value = 20;
      this.node.Q.value = 0.7;
    }
  }

  setCutoff(hz: number): void {
    const clamped = Math.max(20, Math.min(800, hz));
    this.node.frequency.value = clamped;
  }

  /** Map 0-100 intensity to high-pass cutoff (100 = thinnest = 800Hz, 0 = no filtering = 20Hz) */
  setIntensity(value: number): void {
    if (!this._enabled) return;
    const normalized = Math.max(0, Math.min(100, value)) / 100;
    const frequency = 20 + normalized * 780; // 20 -> 800 Hz
    this.setCutoff(frequency);
    // Slight resonance bump for character
    this.node.Q.value = 0.7 + normalized * 2; // 0.7 -> 2.7 Q
  }
}
