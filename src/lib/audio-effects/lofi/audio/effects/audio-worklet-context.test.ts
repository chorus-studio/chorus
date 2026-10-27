import { describe, expect, it, vi } from 'vitest';

import {
  addAudioWorkletModuleCompat,
  createAudioWorkletNodeCompat,
} from './audio-worklet-context';

describe('audio-worklet-context helpers', () => {
  it('unwraps rawContext before constructing an AudioWorkletNode', () => {
    const baseContext = new AudioContext();
    const wrapper = { rawContext: baseContext };
    const OriginalAudioWorkletNode = globalThis.AudioWorkletNode;
    const contexts: unknown[] = [];

    vi.stubGlobal('AudioWorkletNode', class {
      constructor(context: unknown) {
        contexts.push(context);
      }
    });

    createAudioWorkletNodeCompat(wrapper as never, 'bitcrusher-processor');

    expect(contexts).toEqual([baseContext]);
    vi.stubGlobal('AudioWorkletNode', OriginalAudioWorkletNode);
  });

  it('unwraps rawContext before loading an audio worklet module', async () => {
    const baseContext = new AudioContext();
    const addModule = vi.spyOn(baseContext.audioWorklet, 'addModule').mockResolvedValue(undefined);
    const wrapper = { rawContext: baseContext };

    await addAudioWorkletModuleCompat(wrapper as never, '/worklets/test.js');

    expect(addModule).toHaveBeenCalledWith('/worklets/test.js');
  });

  it('prefers rawContext over wrapper helpers that use the wrong context type', async () => {
    const baseContext = new AudioContext();
    const addModule = vi.spyOn(baseContext.audioWorklet, 'addModule').mockResolvedValue(undefined);
    const OriginalAudioWorkletNode = globalThis.AudioWorkletNode;
    const contexts: unknown[] = [];

    vi.stubGlobal('AudioWorkletNode', class {
      constructor(context: unknown) {
        contexts.push(context);
      }
    });

    const wrapper = {
      rawContext: baseContext,
      createAudioWorkletNode: () => {
        throw new Error('wrapper should not be used');
      },
      addAudioWorkletModule: async () => {
        throw new Error('wrapper should not be used');
      },
    };

    createAudioWorkletNodeCompat(wrapper as never, 'bitcrusher-processor');
    await addAudioWorkletModuleCompat(wrapper as never, '/worklets/test.js');

    expect(contexts).toEqual([baseContext]);
    expect(addModule).toHaveBeenCalledWith('/worklets/test.js');
    vi.stubGlobal('AudioWorkletNode', OriginalAudioWorkletNode);
  });

  it('uses wrapper helpers when the context only masquerades as a BaseAudioContext', async () => {
    const OriginalAudioWorkletNode = globalThis.AudioWorkletNode;
    const createAudioWorkletNode = vi.fn(() => ({ mocked: true } as unknown as AudioWorkletNode));
    const addAudioWorkletModule = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal('AudioWorkletNode', class {
      constructor() {
        throw new Error('native AudioWorkletNode constructor should not be used');
      }
    });

    const wrapper = {
      createGain: () => ({ connect() {} }),
      createAudioWorkletNode,
      addAudioWorkletModule,
    };

    const node = createAudioWorkletNodeCompat(wrapper as never, 'bitcrusher-processor');
    await addAudioWorkletModuleCompat(wrapper as never, '/worklets/test.js');

    expect(node).toEqual({ mocked: true });
    expect(createAudioWorkletNode).toHaveBeenCalledWith('bitcrusher-processor', undefined);
    expect(addAudioWorkletModule).toHaveBeenCalledWith('/worklets/test.js');
    vi.stubGlobal('AudioWorkletNode', OriginalAudioWorkletNode);
  });
});
