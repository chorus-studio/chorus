// Vitest setup: the Web Audio mocks the vendored lovelofi effect tests run
// against, copied as-is from lovelofi's packages/shared/src/test/setup.ts (its
// storage and chrome stubs are not needed here).
import { vi } from 'vitest';

// --- Web Audio API Mocks ---

function createMockAudioParam(defaultValue = 0) {
  return { value: defaultValue, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
}

class MockAudioNode {
  connect = vi.fn(() => this);
  disconnect = vi.fn();
}

class MockBiquadFilterNode extends MockAudioNode {
  type = 'lowpass';
  frequency = createMockAudioParam(2000);
  Q = createMockAudioParam(1);
  gain = createMockAudioParam(0);
  detune = createMockAudioParam(0);
}

class MockGainNode extends MockAudioNode {
  gain = createMockAudioParam(1);
}

class MockConvolverNode extends MockAudioNode {
  buffer: unknown = null;
  normalize = true;
}

class MockAudioBufferSourceNode extends MockAudioNode {
  buffer: unknown = null;
  loop = false;
  start = vi.fn();
  stop = vi.fn();
}

class MockWaveShaperNode extends MockAudioNode {
  curve: Float32Array | null = null;
  oversample: string = 'none';
}

class MockDelayNode extends MockAudioNode {
  delayTime = createMockAudioParam(0);
}

class MockOscillatorNode extends MockAudioNode {
  frequency = createMockAudioParam(440);
  type = 'sine';
  start = vi.fn();
  stop = vi.fn();
}

class MockAudioWorkletNode extends MockAudioNode {
  parameters: Map<string, { value: number }>;

  constructor(_ctx: unknown, name: string) {
    super();
    this.parameters = new Map();
    if (name === 'bitcrusher-processor') {
      this.parameters.set('bitDepth', { value: 16 });
      this.parameters.set('sampleRateReduction', { value: 1 });
    } else if (name === 'pitch-wobble-processor') {
      this.parameters.set('speed', { value: 1 });
      this.parameters.set('depth', { value: 0 });
    } else if (name === 'stereo-drift-processor') {
      this.parameters.set('speed', { value: 0.1 });
      this.parameters.set('depth', { value: 0 });
    } else if (name === 'dropout-processor') {
      this.parameters.set('frequency', { value: 0 });
      this.parameters.set('duration', { value: 0.02 });
    } else if (name === 'slowdown-processor') {
      this.parameters.set('rate', { value: 1 });
    } else if (name === 'vocal-cut-processor') {
      this.parameters.set('amount', { value: 0 });
      this.parameters.set('lowFreq', { value: 200 });
      this.parameters.set('highFreq', { value: 5000 });
    }
  }
}

class MockAudioBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  duration: number;
  private channels: Float32Array[];

  constructor(options: { numberOfChannels: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels;
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.duration = options.length / options.sampleRate;
    this.channels = [];
    for (let i = 0; i < options.numberOfChannels; i++) {
      this.channels.push(new Float32Array(options.length));
    }
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel];
  }
}

class MockAudioContext {
  sampleRate = 44100;
  state = 'running';
  destination = new MockAudioNode();
  audioWorklet = { addModule: vi.fn(() => Promise.resolve()) };

  createBiquadFilter = vi.fn(() => new MockBiquadFilterNode());
  createGain = vi.fn(() => new MockGainNode());
  createConvolver = vi.fn(() => new MockConvolverNode());
  createBufferSource = vi.fn(() => new MockAudioBufferSourceNode());
  createMediaElementSource = vi.fn(() => new MockAudioNode());
  createMediaStreamSource = vi.fn(() => new MockAudioNode());
  createWaveShaper = vi.fn(() => new MockWaveShaperNode());
  createDelay = vi.fn(() => new MockDelayNode());
  createOscillator = vi.fn(() => new MockOscillatorNode());
  createBuffer = vi.fn(
    (channels: number, length: number, sampleRate: number) =>
      new MockAudioBuffer({ numberOfChannels: channels, length, sampleRate }),
  );
  resume = vi.fn(() => Promise.resolve());
  close = vi.fn(() => Promise.resolve());
  decodeAudioData = vi.fn(
    () => Promise.resolve(new MockAudioBuffer({ numberOfChannels: 2, length: 44100, sampleRate: 44100 })),
  );
}

class MockOfflineAudioContext extends MockAudioContext {
  constructor(
    public numberOfChannels: number,
    public length: number,
    sampleRate: number,
  ) {
    super();
    this.sampleRate = sampleRate;
  }

  startRendering = vi.fn(
    () => Promise.resolve(new MockAudioBuffer({ numberOfChannels: 2, length: 44100, sampleRate: 44100 })),
  );
}

(globalThis as Record<string, unknown>).AudioContext = MockAudioContext;
(globalThis as Record<string, unknown>).OfflineAudioContext = MockOfflineAudioContext;
(globalThis as Record<string, unknown>).AudioWorkletNode = MockAudioWorkletNode;
(globalThis as Record<string, unknown>).AudioBuffer = MockAudioBuffer;
(globalThis as Record<string, unknown>).Audio = vi.fn(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  load: vi.fn(),
  src: '',
  volume: 1,
  crossOrigin: null,
}));

