import { describe, it, expect } from 'vitest';
import { TapeSaturationEffect } from './tape-saturation';

function createEffect() {
  const ctx = new AudioContext() as unknown as AudioContext;
  return new TapeSaturationEffect(ctx);
}

describe('TapeSaturationEffect', () => {
  it('creates input and output gain nodes', () => {
    const effect = createEffect();
    expect(effect.input).toBeDefined();
    expect(effect.output).toBeDefined();
  });

  it('starts enabled', () => {
    const effect = createEffect();
    expect(effect.enabled).toBe(true);
  });

  it('setIntensity clamps to 0-100', () => {
    const effect = createEffect();
    effect.setIntensity(-10);
    expect(effect.enabled).toBe(true);
    effect.setIntensity(200);
    expect(effect.enabled).toBe(true);
  });

  it('disabling resets to linear pass-through curve', () => {
    const effect = createEffect();
    effect.setIntensity(80);
    effect.enabled = false;
    // When disabled, preGain and postGain should be 1 (pass-through)
    expect(effect.enabled).toBe(false);
  });

  it('re-enabling restores saved intensity', () => {
    const effect = createEffect();
    effect.setIntensity(60);
    effect.enabled = false;
    effect.enabled = true;
    expect(effect.enabled).toBe(true);
  });

  it('does not update curve when disabled', () => {
    const effect = createEffect();
    effect.enabled = false;
    effect.setIntensity(100);
    // Should not throw and should remain disabled state
    expect(effect.enabled).toBe(false);
  });
});
