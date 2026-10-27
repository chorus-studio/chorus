export interface AudioWorkletCapableContext {
  audioWorklet?: {
    addModule: (url: string) => Promise<unknown>;
  };
  addAudioWorkletModule?: (url: string) => Promise<unknown>;
  rawContext?: BaseAudioContext;
  context?: BaseAudioContext;
  createAudioWorkletNode?: (
    name: string,
    options?: Partial<AudioWorkletNodeOptions>,
  ) => AudioWorkletNode;
}

function isBaseAudioContext(value: unknown): value is BaseAudioContext {
  const BaseAudioContextCtor = globalThis.BaseAudioContext;
  const AudioContextCtor = globalThis.AudioContext;
  const OfflineAudioContextCtor = globalThis.OfflineAudioContext;

  if (typeof BaseAudioContextCtor === 'function') {
    return value instanceof BaseAudioContextCtor;
  }

  if (typeof AudioContextCtor === 'function' && value instanceof AudioContextCtor) {
    return true;
  }

  if (typeof OfflineAudioContextCtor === 'function' && value instanceof OfflineAudioContextCtor) {
    return true;
  }

  return Object.prototype.toString.call(value) === '[object AudioContext]'
    || Object.prototype.toString.call(value) === '[object OfflineAudioContext]';
}

function resolveBaseAudioContext(
  ctx: BaseAudioContext | AudioWorkletCapableContext,
): BaseAudioContext {
  if (isBaseAudioContext(ctx)) {
    return ctx;
  }

  if (isBaseAudioContext(ctx.rawContext)) {
    return ctx.rawContext;
  }

  if (isBaseAudioContext(ctx.context)) {
    return ctx.context;
  }

  throw new TypeError('Audio context wrapper did not expose a BaseAudioContext');
}

export function createAudioWorkletNodeCompat(
  ctx: BaseAudioContext | AudioWorkletCapableContext,
  name: string,
  options?: Partial<AudioWorkletNodeOptions>,
): AudioWorkletNode {
  const baseContext = (() => {
    try {
      return resolveBaseAudioContext(ctx);
    } catch {
      return null;
    }
  })();

  if (baseContext) {
    return new AudioWorkletNode(baseContext, name, options);
  }

  if (typeof (ctx as AudioWorkletCapableContext).createAudioWorkletNode === 'function') {
    return (ctx as AudioWorkletCapableContext).createAudioWorkletNode!(name, options);
  }
  throw new TypeError('Audio context wrapper did not expose a BaseAudioContext');
}

export async function addAudioWorkletModuleCompat(
  ctx: BaseAudioContext | AudioWorkletCapableContext,
  url: string,
): Promise<void> {
  const baseContext = (() => {
    try {
      return resolveBaseAudioContext(ctx);
    } catch {
      return null;
    }
  })();

  if (baseContext) {
    await (baseContext as AudioContext).audioWorklet.addModule(url);
    return;
  }

  if (typeof (ctx as AudioWorkletCapableContext).addAudioWorkletModule === 'function') {
    await (ctx as AudioWorkletCapableContext).addAudioWorkletModule!(url);
    return;
  }

  if (typeof (ctx as AudioWorkletCapableContext).audioWorklet?.addModule === 'function') {
    await (ctx as AudioWorkletCapableContext).audioWorklet!.addModule(url);
    return;
  }

  throw new TypeError('Audio context wrapper did not expose a BaseAudioContext');
}
