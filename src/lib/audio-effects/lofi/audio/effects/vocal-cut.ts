import { createAudioWorkletNodeCompat } from './audio-worklet-context';

export class VocalCutEffect {
  readonly node: AudioWorkletNode;
  private _enabled = true;

  constructor(ctx: AudioContext) {
    this.node = createAudioWorkletNodeCompat(ctx, 'vocal-cut-processor');
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
    if (!value) {
      this.node.parameters.get('amount')!.value = 0;
    }
  }

  /** Map 0-100 intensity to vocal cut parameters */
  setIntensity(value: number): void {
    if (!this._enabled) return;
    const normalized = Math.max(0, Math.min(100, value)) / 100;
    // Amount: 0 -> 1.0 (full center removal)
    this.node.parameters.get('amount')!.value = normalized;
    // Widen the frequency band as intensity increases
    // Low freq: 300 -> 150 Hz (catch more low vocal range)
    this.node.parameters.get('lowFreq')!.value = 300 - normalized * 150;
    // High freq: 3000 -> 6000 Hz (catch more sibilance)
    this.node.parameters.get('highFreq')!.value = 3000 + normalized * 3000;
  }
}
