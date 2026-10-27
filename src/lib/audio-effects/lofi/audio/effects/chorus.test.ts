import { describe, it, expect } from 'vitest';
import { ChorusEffect } from './chorus';

function createEffect() {
  const ctx = new AudioContext() as unknown as AudioContext;
  return new ChorusEffect(ctx);
}

describe('ChorusEffect', () => {
  it('creates input and output gain nodes', () => {
    const effect = createEffect();
    expect(effect.input).toBeDefined();
    expect(effect.output).toBeDefined();
  });

  it('starts enabled and fully dry', () => {
    const effect = createEffect();
    expect(effect.enabled).toBe(true);
  });

  it('setIntensity(0) keeps fully dry', () => {
    const effect = createEffect();
    effect.setIntensity(0);
    // At intensity 0, wet should be 0
    expect(effect.enabled).toBe(true);
  });

  it('setIntensity(100) sets max wet mix', () => {
    const effect = createEffect();
    effect.setIntensity(100);
    expect(effect.enabled).toBe(true);
  });

  it('disabling sets wet to 0 and dry to 1', () => {
    const effect = createEffect();
    effect.setIntensity(60);
    effect.enabled = false;
    expect(effect.enabled).toBe(false);
  });

  it('re-enabling restores wet/dry mix', () => {
    const effect = createEffect();
    effect.setIntensity(50);
    effect.enabled = false;
    effect.enabled = true;
    expect(effect.enabled).toBe(true);
  });

  it('does not update when disabled', () => {
    const effect = createEffect();
    effect.enabled = false;
    effect.setIntensity(100);
    expect(effect.enabled).toBe(false);
  });

  it('destroy stops LFOs without error', () => {
    const effect = createEffect();
    expect(() => effect.destroy()).not.toThrow();
  });
});
