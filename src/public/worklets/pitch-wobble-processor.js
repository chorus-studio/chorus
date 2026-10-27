class PitchWobbleProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'speed', defaultValue: 0.5, minValue: 0.1, maxValue: 5 },
      { name: 'depth', defaultValue: 5, minValue: 0, maxValue: 20 },
    ];
  }

  constructor() {
    super();
    // Circular delay buffer (max 50ms at 48kHz = 2400 samples)
    this._bufferSize = 4800;
    this._buffer = new Array(2)
      .fill(null)
      .map(() => new Float32Array(this._bufferSize));
    this._writePos = 0;
    this._phase = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input.length) return true;

    const speed = parameters.speed;
    const depth = parameters.depth;

    for (let i = 0; i < output[0].length; i++) {
      const spd = speed.length > 1 ? speed[i] : speed[0];
      const dep = depth.length > 1 ? depth[i] : depth[0];

      // LFO: sine wave
      const lfo = Math.sin(this._phase * 2 * Math.PI);
      this._phase += spd / sampleRate;
      if (this._phase >= 1) this._phase -= 1;

      // Delay in samples (depth is in ms)
      const delaySamples = ((dep * sampleRate) / 1000) * (0.5 + 0.5 * lfo);

      for (let channel = 0; channel < output.length; channel++) {
        const inputChannel = input[channel] || input[0];
        const outputChannel = output[channel];
        const buf = this._buffer[channel] || this._buffer[0];

        // Write input to buffer
        buf[this._writePos % this._bufferSize] = inputChannel[i];

        // Read from buffer with fractional delay (linear interpolation)
        const readPos =
          this._writePos - delaySamples + this._bufferSize * 2;
        const readIndex = Math.floor(readPos) % this._bufferSize;
        const frac = readPos - Math.floor(readPos);
        const nextIndex = (readIndex + 1) % this._bufferSize;

        outputChannel[i] =
          buf[readIndex] * (1 - frac) + buf[nextIndex] * frac;
      }

      this._writePos = (this._writePos + 1) % this._bufferSize;
    }

    return true;
  }
}

registerProcessor('pitch-wobble-processor', PitchWobbleProcessor);
