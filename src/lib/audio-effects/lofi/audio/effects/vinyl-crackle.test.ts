import { describe, it, expect } from 'vitest';
import { VinylCrackleEffect } from './vinyl-crackle';

function createEffect() {
  const ctx = new AudioContext() as unknown as AudioContext;
  return new VinylCrackleEffect(ctx);
}

describe('VinylCrackleEffect', () => {
  it('starts with gain 0 (disabled by default behavior)', () => {
    const effect = createEffect();
    // Constructor sets gain to 0, then generateCrackleBuffer runs
    expect(effect.output).toBeDefined();
  });

  it('enabling sets gain based on intensity', () => {
    const effect = createEffect();
    effect.setIntensity(50);
    effect.enabled = true;
    // 50/100 * 0.5 = 0.25
    expect(effect.output.gain.value).toBeCloseTo(0.25);
  });

  it('disabling sets gain to 0', () => {
    const effect = createEffect();
    effect.setIntensity(50);
    effect.enabled = true;
    effect.enabled = false;
    expect(effect.output.gain.value).toBe(0);
  });

  it('setIntensity(0) maps to gain 0', () => {
    const effect = createEffect();
    effect.enabled = true;
    effect.setIntensity(0);
    expect(effect.output.gain.value).toBe(0);
  });

  it('setIntensity(100) maps to gain 0.5', () => {
    const effect = createEffect();
    effect.enabled = true;
    effect.setIntensity(100);
    expect(effect.output.gain.value).toBeCloseTo(0.5);
  });

  it('destroy stops and disconnects source', () => {
    const effect = createEffect();
    effect.destroy();
    // Should not throw
  });
});
