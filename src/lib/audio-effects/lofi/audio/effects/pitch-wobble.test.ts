import { describe, it, expect } from 'vitest';
import { PitchWobbleEffect } from './pitch-wobble';

function createEffect() {
  const ctx = new AudioContext() as unknown as AudioContext;
  return new PitchWobbleEffect(ctx);
}

describe('PitchWobbleEffect', () => {
  it('creates an AudioWorkletNode', () => {
    const effect = createEffect();
    expect(effect.node).toBeDefined();
    expect(effect.node.parameters).toBeDefined();
  });

  it('setIntensity(0) sets speed=0.3 depth=0', () => {
    const effect = createEffect();
    effect.setIntensity(0);
    expect(effect.node.parameters.get('speed')!.value).toBeCloseTo(0.3);
    expect(effect.node.parameters.get('depth')!.value).toBe(0);
  });

  it('setIntensity(100) sets speed=3 depth=20', () => {
    const effect = createEffect();
    effect.setIntensity(100);
    expect(effect.node.parameters.get('speed')!.value).toBeCloseTo(3);
    expect(effect.node.parameters.get('depth')!.value).toBeCloseTo(20);
  });

  it('disabled sets depth=0', () => {
    const effect = createEffect();
    effect.setIntensity(50);
    effect.enabled = false;
    expect(effect.node.parameters.get('depth')!.value).toBe(0);
  });

  it('setSpeed clamps to 0.1-5', () => {
    const effect = createEffect();
    effect.setSpeed(0.01);
    expect(effect.node.parameters.get('speed')!.value).toBeCloseTo(0.1);
    effect.setSpeed(10);
    expect(effect.node.parameters.get('speed')!.value).toBe(5);
  });

  it('setDepth clamps to 0-20', () => {
    const effect = createEffect();
    effect.setDepth(-5);
    expect(effect.node.parameters.get('depth')!.value).toBe(0);
    effect.setDepth(30);
    expect(effect.node.parameters.get('depth')!.value).toBe(20);
  });

  it('setIntensity is no-op when disabled', () => {
    const effect = createEffect();
    effect.enabled = false;
    effect.setIntensity(100);
    expect(effect.node.parameters.get('depth')!.value).toBe(0);
  });
});
