export class TapeSaturationEffect {
  readonly input: GainNode;
  readonly output: GainNode;
  private preTone: BiquadFilterNode;
  private headBump: BiquadFilterNode;
  private waveshaper: WaveShaperNode;
  private postTone: BiquadFilterNode;
  private preGain: GainNode;
  private postGain: GainNode;
  private _enabled = true;
  private _intensity = 40;

  constructor(ctx: AudioContext) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.preTone = ctx.createBiquadFilter();
    this.preTone.type = 'highshelf';
    this.preTone.frequency.value = 3200;
    this.preTone.gain.value = 0;
    this.headBump = ctx.createBiquadFilter();
    this.headBump.type = 'lowshelf';
    this.headBump.frequency.value = 140;
    this.headBump.gain.value = 0;
    this.preGain = ctx.createGain();
    this.postGain = ctx.createGain();
    this.waveshaper = ctx.createWaveShaper();
    this.waveshaper.oversample = '4x';
    this.postTone = ctx.createBiquadFilter();
    this.postTone.type = 'lowpass';
    this.postTone.frequency.value = 20000;
    this.postTone.Q.value = 0.7;

    // Shape the tone around the waveshaper to feel more tape-like than a raw clipper.
    this.input.connect(this.preTone);
    this.preTone.connect(this.headBump);
    this.headBump.connect(this.preGain);
    this.preGain.connect(this.waveshaper);
    this.waveshaper.connect(this.postTone);
    this.postTone.connect(this.postGain);
    this.postGain.connect(this.output);

    // Start with linear (pass-through) curve
    this.setCurve(0);
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
    if (value) {
      this.setCurve(this._intensity);
    } else {
      this.setCurve(0);
    }
  }

  /** Map 0-100 intensity to saturation amount */
  setIntensity(value: number): void {
    this._intensity = Math.max(0, Math.min(100, value));
    if (this._enabled) {
      this.setCurve(this._intensity);
    }
  }

  private setCurve(intensity: number): void {
    const samples = 256;
    const curve = new Float32Array(samples);
    const normalized = intensity / 100;

    if (normalized === 0) {
      // Linear pass-through
      for (let i = 0; i < samples; i++) {
        curve[i] = (i / (samples - 1)) * 2 - 1;
      }
      this.preGain.gain.value = 1;
      this.postGain.gain.value = 1;
      this.preTone.gain.value = 0;
      this.headBump.gain.value = 0;
      this.postTone.frequency.value = 20000;
      this.postTone.Q.value = 0.7;
    } else {
      // Add mild asymmetry and tone shaping so the distortion feels warmer and less digital.
      const drive = 1 + normalized * 5; // 1 -> 6
      const asymmetry = normalized * 0.18;
      for (let i = 0; i < samples; i++) {
        const x = (i / (samples - 1)) * 2 - 1;
        const shapedInput = x + asymmetry * (1 - x * x);
        curve[i] = Math.tanh(shapedInput * drive);
      }

      this.preTone.gain.value = -normalized * 5;
      this.headBump.gain.value = normalized * 3.5;
      this.preGain.gain.value = 1 + normalized * 0.85;
      this.postTone.frequency.value = 18000 - normalized * 12000;
      this.postTone.Q.value = 0.7 + normalized * 0.6;
      this.postGain.gain.value = 1 / (1 + normalized * 0.55);
    }

    this.waveshaper.curve = curve;
  }
}
