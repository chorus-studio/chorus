import { describe, it, expect } from 'vitest';
import { StereoDriftEffect } from './stereo-drift';

function createEffect() {
  const ctx = new AudioContext() as unknown as AudioContext;
  return new StereoDriftEffect(ctx);
}

describe('StereoDriftEffect', () => {
  it('creates an AudioWorkletNode with stereo-drift-processor', () => {
    const effect = createEffect();
    expect(effect.node).toBeDefined();
  });

  it('starts enabled', () => {
    const effect = createEffect();
    expect(effect.enabled).toBe(true);
  });

  it('setIntensity(0) sets depth to 0 and speed to 0.05', () => {
    const effect = createEffect();
    effect.setIntensity(0);
    expect(effect.node.parameters.get('depth')!.value).toBe(0);
    expect(effect.node.parameters.get('speed')!.value).toBeCloseTo(0.05);
  });

  it('setIntensity(100) sets depth to 0.4 and speed to 0.5', () => {
    const effect = createEffect();
    effect.setIntensity(100);
    expect(effect.node.parameters.get('depth')!.value).toBeCloseTo(0.4);
    expect(effect.node.parameters.get('speed')!.value).toBeCloseTo(0.5);
  });

  it('disabling sets depth to 0', () => {
    const effect = createEffect();
    effect.setIntensity(80);
    effect.enabled = false;
    expect(effect.node.parameters.get('depth')!.value).toBe(0);
  });

  it('does not update when disabled', () => {
    const effect = createEffect();
    effect.enabled = false;
    effect.setIntensity(100);
    expect(effect.node.parameters.get('depth')!.value).toBe(0);
  });
});
