import { createAudioWorkletNodeCompat } from './audio-worklet-context';

export class BitcrusherEffect {
  readonly node: AudioWorkletNode;
  private _enabled = true;

  constructor(ctx: AudioContext) {
    this.node = createAudioWorkletNodeCompat(ctx, 'bitcrusher-processor');
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
    if (!value) {
      // Pass-through: set bit depth to max (16-bit = no crushing)
      this.node.parameters.get('bitDepth')!.value = 16;
      this.node.parameters.get('sampleRateReduction')!.value = 1;
    }
  }

  setBitDepth(bits: number): void {
    if (!this._enabled) return;
    this.node.parameters.get('bitDepth')!.value = Math.max(
      4,
      Math.min(16, bits),
    );
  }

  setSampleRateReduction(factor: number): void {
    if (!this._enabled) return;
    this.node.parameters.get('sampleRateReduction')!.value = Math.max(
      1,
      Math.min(40, factor),
    );
  }

  /** Map 0-100 intensity to bitcrusher parameters */
  setIntensity(value: number): void {
    if (!this._enabled) return;
    const normalized = Math.max(0, Math.min(100, value)) / 100;
    // Higher intensity = lower bit depth, higher sample rate reduction
    const bitDepth = 16 - normalized * 12; // 16 -> 4
    const reduction = 1 + normalized * 19; // 1 -> 20
    this.node.parameters.get('bitDepth')!.value = bitDepth;
    this.node.parameters.get('sampleRateReduction')!.value = reduction;
  }
}
