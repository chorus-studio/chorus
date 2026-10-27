import { createAudioWorkletNodeCompat } from './audio-worklet-context';

export class StereoDriftEffect {
  readonly node: AudioWorkletNode;
  private _enabled = true;

  constructor(ctx: AudioContext) {
    this.node = createAudioWorkletNodeCompat(ctx, 'stereo-drift-processor');
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
    if (!value) {
      this.node.parameters.get('depth')!.value = 0;
    }
  }

  /** Map 0-100 intensity to drift parameters */
  setIntensity(value: number): void {
    if (!this._enabled) return;
    const normalized = Math.max(0, Math.min(100, value)) / 100;
    // Speed: 0.05 -> 0.5 Hz (very slow drift)
    this.node.parameters.get('speed')!.value = 0.05 + normalized * 0.45;
    // Depth: 0 -> 0.4 (max 40% volume modulation per channel)
    this.node.parameters.get('depth')!.value = normalized * 0.4;
  }
}
