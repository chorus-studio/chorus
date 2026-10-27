export class ChorusEffect {
  readonly input: GainNode;
  readonly output: GainNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private delay1: DelayNode;
  private delay2: DelayNode;
  private lfo1: OscillatorNode;
  private lfo2: OscillatorNode;
  private lfoGain1: GainNode;
  private lfoGain2: GainNode;
  private _enabled = true;
  private _lastWetDry = 0;

  constructor(ctx: AudioContext) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.delay1 = ctx.createDelay(0.05);
    this.delay2 = ctx.createDelay(0.05);
    this.lfo1 = ctx.createOscillator();
    this.lfo2 = ctx.createOscillator();
    this.lfoGain1 = ctx.createGain();
    this.lfoGain2 = ctx.createGain();

    // Set base delay times (slightly different for stereo width)
    this.delay1.delayTime.value = 0.012; // 12ms
    this.delay2.delayTime.value = 0.018; // 18ms

    // LFO modulates delay time for chorus shimmer
    this.lfo1.frequency.value = 0.5;
    this.lfo2.frequency.value = 0.7;
    this.lfoGain1.gain.value = 0; // depth starts at 0
    this.lfoGain2.gain.value = 0;

    // LFO -> delay time modulation
    this.lfo1.connect(this.lfoGain1);
    this.lfoGain1.connect(this.delay1.delayTime);
    this.lfo2.connect(this.lfoGain2);
    this.lfoGain2.connect(this.delay2.delayTime);

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Wet path: input -> delays -> wetGain -> output
    this.input.connect(this.delay1);
    this.input.connect(this.delay2);
    this.delay1.connect(this.wetGain);
    this.delay2.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Start LFOs
    this.lfo1.start();
    this.lfo2.start();

    // Default: fully dry
    this.wetGain.gain.value = 0;
    this.dryGain.gain.value = 1;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
    if (value) {
      this.wetGain.gain.value = this._lastWetDry;
      this.dryGain.gain.value = 1 - this._lastWetDry * 0.5;
    } else {
      this.wetGain.gain.value = 0;
      this.dryGain.gain.value = 1;
      this.lfoGain1.gain.value = 0;
      this.lfoGain2.gain.value = 0;
    }
  }

  /** Map 0-100 intensity to chorus parameters */
  setIntensity(value: number): void {
    if (!this._enabled) return;
    const normalized = Math.max(0, Math.min(100, value)) / 100;

    // Wet/dry mix: 0 -> 0.6
    this._lastWetDry = normalized * 0.6;
    this.wetGain.gain.value = this._lastWetDry;
    this.dryGain.gain.value = 1 - this._lastWetDry * 0.5;

    // LFO depth (modulation amount in seconds): 0 -> 0.003 (3ms)
    const depth = normalized * 0.003;
    this.lfoGain1.gain.value = depth;
    this.lfoGain2.gain.value = depth * 0.8;

    // LFO speed: 0.3 -> 1.5 Hz
    this.lfo1.frequency.value = 0.3 + normalized * 1.2;
    this.lfo2.frequency.value = 0.5 + normalized * 1.0;
  }

  destroy(): void {
    this.lfo1.stop();
    this.lfo2.stop();
  }
}
