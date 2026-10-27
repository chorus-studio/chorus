import { createAudioWorkletNodeCompat } from './audio-worklet-context';

export class PitchWobbleEffect {
  readonly node: AudioWorkletNode;
  private _enabled = true;

  constructor(ctx: AudioContext) {
    this.node = createAudioWorkletNodeCompat(ctx, 'pitch-wobble-processor');
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
    if (!value) {
      // Pass-through: zero depth = no wobble
      this.node.parameters.get('depth')!.value = 0;
    }
  }

  setSpeed(hz: number): void {
    if (!this._enabled) return;
    this.node.parameters.get('speed')!.value = Math.max(
      0.1,
      Math.min(5, hz),
    );
  }

  setDepth(ms: number): void {
    if (!this._enabled) return;
    this.node.parameters.get('depth')!.value = Math.max(0, Math.min(20, ms));
  }

  /** Map 0-100 intensity to wobble parameters */
  setIntensity(value: number): void {
    if (!this._enabled) return;
    const normalized = Math.max(0, Math.min(100, value)) / 100;
    this.node.parameters.get('speed')!.value = 0.3 + normalized * 2.7; // 0.3-3 Hz
    this.node.parameters.get('depth')!.value = normalized * 20; // 0-20ms
  }
}
