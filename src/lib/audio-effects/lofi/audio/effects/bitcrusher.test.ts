import { describe, it, expect } from 'vitest';
import { BitcrusherEffect } from './bitcrusher';

function createEffect() {
  const ctx = new AudioContext() as unknown as AudioContext;
  return new BitcrusherEffect(ctx);
}

describe('BitcrusherEffect', () => {
  it('creates an AudioWorkletNode', () => {
    const effect = createEffect();
    expect(effect.node).toBeDefined();
    expect(effect.node.parameters).toBeDefined();
  });

  it('setIntensity(0) sets pass-through values', () => {
    const effect = createEffect();
    effect.setIntensity(0);
    expect(effect.node.parameters.get('bitDepth')!.value).toBe(16);
    expect(effect.node.parameters.get('sampleRateReduction')!.value).toBe(1);
  });

  it('setIntensity(100) sets max crush', () => {
    const effect = createEffect();
    effect.setIntensity(100);
    expect(effect.node.parameters.get('bitDepth')!.value).toBe(4);
    expect(effect.node.parameters.get('sampleRateReduction')!.value).toBe(20);
  });

  it('setIntensity(50) sets midpoint values', () => {
    const effect = createEffect();
    effect.setIntensity(50);
    expect(effect.node.parameters.get('bitDepth')!.value).toBe(10);
    expect(effect.node.parameters.get('sampleRateReduction')!.value).toBeCloseTo(10.5);
  });

  it('disabled resets to pass-through', () => {
    const effect = createEffect();
    effect.setIntensity(80);
    effect.enabled = false;
    expect(effect.node.parameters.get('bitDepth')!.value).toBe(16);
    expect(effect.node.parameters.get('sampleRateReduction')!.value).toBe(1);
  });

  it('setBitDepth clamps to 4-16', () => {
    const effect = createEffect();
    effect.setBitDepth(2);
    expect(effect.node.parameters.get('bitDepth')!.value).toBe(4);
    effect.setBitDepth(20);
    expect(effect.node.parameters.get('bitDepth')!.value).toBe(16);
  });

  it('setIntensity is no-op when disabled', () => {
    const effect = createEffect();
    effect.enabled = false;
    const bitDepthBefore = effect.node.parameters.get('bitDepth')!.value;
    effect.setIntensity(80);
    expect(effect.node.parameters.get('bitDepth')!.value).toBe(bitDepthBefore);
  });
});
