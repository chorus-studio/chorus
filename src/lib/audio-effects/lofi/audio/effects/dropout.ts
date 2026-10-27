import { createAudioWorkletNodeCompat } from './audio-worklet-context';

export class DropoutEffect {
  readonly node: AudioWorkletNode;
  private _enabled = true;

  constructor(ctx: AudioContext) {
    this.node = createAudioWorkletNodeCompat(ctx, 'dropout-processor');
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
    if (!value) {
      this.node.parameters.get('frequency')!.value = 0;
    }
  }

  /** Map 0-100 intensity to dropout parameters */
  setIntensity(value: number): void {
    if (!this._enabled) return;
    const normalized = Math.max(0, Math.min(100, value)) / 100;
    // Frequency: 0 -> 0.005 (chance per sample block of triggering a dropout)
    this.node.parameters.get('frequency')!.value = normalized * 0.005;
    // Duration: 0 -> 0.05 seconds (max 50ms dropout)
    this.node.parameters.get('duration')!.value = normalized * 0.05;
  }
}
