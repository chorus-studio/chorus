import { describe, it, expect } from 'vitest';
import { LowPassEffect } from './low-pass';

function createEffect(params = {}) {
  const ctx = new AudioContext() as unknown as AudioContext;
  return new LowPassEffect(ctx, params);
}

describe('LowPassEffect', () => {
  it('creates a lowpass biquad filter', () => {
    const effect = createEffect();
    expect(effect.node.type).toBe('lowpass');
  });

  it('defaults to frequency 2000 and Q 1', () => {
    const effect = createEffect();
    expect(effect.node.frequency.value).toBe(2000);
    expect(effect.node.Q.value).toBe(1);
  });

  it('setIntensity(0) sets frequency to 4000', () => {
    const effect = createEffect();
    effect.setIntensity(0);
    expect(effect.node.frequency.value).toBe(4000);
  });

  it('setIntensity(100) sets frequency to 400', () => {
    const effect = createEffect();
    effect.setIntensity(100);
    expect(effect.node.frequency.value).toBe(400);
  });

  it('setIntensity(50) sets frequency to 2200', () => {
    const effect = createEffect();
    effect.setIntensity(50);
    expect(effect.node.frequency.value).toBe(2200);
  });

  it('setIntensity adds resonance boost', () => {
    const effect = createEffect();
    effect.setIntensity(100);
    expect(effect.node.Q.value).toBeCloseTo(5);
    effect.setIntensity(0);
    expect(effect.node.Q.value).toBeCloseTo(1);
  });

  it('setCutoff clamps to 400-4000', () => {
    const effect = createEffect();
    effect.setCutoff(100);
    expect(effect.node.frequency.value).toBe(400);
    effect.setCutoff(10000);
    expect(effect.node.frequency.value).toBe(4000);
  });

  it('setResonance clamps to 0-20', () => {
    const effect = createEffect();
    effect.setResonance(-5);
    expect(effect.node.Q.value).toBe(0);
    effect.setResonance(30);
    expect(effect.node.Q.value).toBe(20);
  });

  it('disabled sets frequency to 20000', () => {
    const effect = createEffect();
    effect.enabled = false;
    expect(effect.node.frequency.value).toBe(20000);
  });
});
