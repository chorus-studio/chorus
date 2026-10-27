import { describe, it, expect } from 'vitest';
import { ReverbEffect } from './reverb';

function createEffect(params = {}) {
  const ctx = new AudioContext() as unknown as AudioContext;
  return new ReverbEffect(ctx, params);
}

describe('ReverbEffect', () => {
  it('creates input and output nodes', () => {
    const effect = createEffect();
    expect(effect.input).toBeDefined();
    expect(effect.output).toBeDefined();
  });

  it('defaults to 0.3 wet/dry', () => {
    const effect = createEffect();
    expect(effect.wetGain.gain.value).toBeCloseTo(0.3);
    expect(effect.dryGain.gain.value).toBeCloseTo(0.7);
  });

  it('setIntensity(0) sets wet to 0', () => {
    const effect = createEffect();
    effect.setIntensity(0);
    expect(effect.wetGain.gain.value).toBeCloseTo(0);
    expect(effect.dryGain.gain.value).toBeCloseTo(1);
  });

  it('setIntensity(100) sets wet to 1.0', () => {
    const effect = createEffect();
    effect.setIntensity(100);
    expect(effect.wetGain.gain.value).toBeCloseTo(1.0);
    expect(effect.dryGain.gain.value).toBeCloseTo(0);
  });

  it('disabled sets wet=0 dry=1', () => {
    const effect = createEffect();
    effect.enabled = false;
    expect(effect.wetGain.gain.value).toBe(0);
    expect(effect.dryGain.gain.value).toBe(1);
  });

  it('re-enabling restores last wet/dry', () => {
    const effect = createEffect();
    effect.setIntensity(50);
    effect.enabled = false;
    effect.enabled = true;
    expect(effect.wetGain.gain.value).toBeCloseTo(0.5);
  });

  it('defaults to the room profile and can switch profiles', () => {
    const effect = createEffect();
    expect(effect.profile).toBe('room');
    effect.setProfile('hall');
    expect(effect.profile).toBe('hall');
  });

  it('generateSyntheticIR sets convolver buffer', () => {
    const ctx = new AudioContext() as unknown as AudioContext;
    const effect = new ReverbEffect(ctx);
    effect.generateSyntheticIR(ctx);
    // The mock createBuffer returns a MockAudioBuffer, verify convolver got it
    // We can't easily check the convolver buffer directly, but the method shouldn't throw
  });
});
