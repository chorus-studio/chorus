import { describe, it, expect } from 'vitest';
import { HighPassEffect } from './high-pass';

function createEffect() {
  const ctx = new AudioContext() as unknown as AudioContext;
  return new HighPassEffect(ctx);
}

describe('HighPassEffect', () => {
  it('creates a highpass biquad filter', () => {
    const effect = createEffect();
    expect(effect.node.type).toBe('highpass');
  });

  it('defaults to frequency 20 and Q 0.7', () => {
    const effect = createEffect();
    expect(effect.node.frequency.value).toBe(20);
    expect(effect.node.Q.value).toBe(0.7);
  });

  it('setIntensity(0) sets frequency to 20', () => {
    const effect = createEffect();
    effect.setIntensity(0);
    expect(effect.node.frequency.value).toBe(20);
  });

  it('setIntensity(100) sets frequency to 800', () => {
    const effect = createEffect();
    effect.setIntensity(100);
    expect(effect.node.frequency.value).toBe(800);
  });

  it('setIntensity(50) sets frequency to 410', () => {
    const effect = createEffect();
    effect.setIntensity(50);
    expect(effect.node.frequency.value).toBe(410);
  });

  it('setIntensity adds resonance boost', () => {
    const effect = createEffect();
    effect.setIntensity(100);
    expect(effect.node.Q.value).toBeCloseTo(2.7);
    effect.setIntensity(0);
    expect(effect.node.Q.value).toBeCloseTo(0.7);
  });

  it('setCutoff clamps to 20-800', () => {
    const effect = createEffect();
    effect.setCutoff(5);
    expect(effect.node.frequency.value).toBe(20);
    effect.setCutoff(2000);
    expect(effect.node.frequency.value).toBe(800);
  });

  it('disabled resets to pass-through', () => {
    const effect = createEffect();
    effect.setIntensity(80);
    effect.enabled = false;
    expect(effect.node.frequency.value).toBe(20);
    expect(effect.node.Q.value).toBe(0.7);
  });

  it('does not update when disabled', () => {
    const effect = createEffect();
    effect.enabled = false;
    effect.setIntensity(100);
    expect(effect.node.frequency.value).toBe(20);
  });
});
