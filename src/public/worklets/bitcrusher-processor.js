class BitcrusherProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'bitDepth', defaultValue: 8, minValue: 4, maxValue: 16 },
      {
        name: 'sampleRateReduction',
        defaultValue: 1,
        minValue: 1,
        maxValue: 40,
      },
    ];
  }

  constructor() {
    super();
    this._lastSample = new Float32Array(2);
    this._sampleCounter = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input.length) return true;

    const bitDepth = parameters.bitDepth;
    const reduction = parameters.sampleRateReduction;

    for (let channel = 0; channel < output.length; channel++) {
      const inputChannel = input[channel] || input[0];
      const outputChannel = output[channel];

      for (let i = 0; i < outputChannel.length; i++) {
        // Get parameter value (may be a-rate or k-rate)
        const bits = bitDepth.length > 1 ? bitDepth[i] : bitDepth[0];
        const red = reduction.length > 1 ? reduction[i] : reduction[0];

        // Sample rate reduction: hold the last sample
        this._sampleCounter++;
        if (this._sampleCounter >= red) {
          this._sampleCounter = 0;
          // Bit depth reduction
          const levels = Math.pow(2, bits);
          this._lastSample[channel] =
            Math.round(inputChannel[i] * levels) / levels;
        }

        outputChannel[i] = this._lastSample[channel] || 0;
      }
    }

    return true;
  }
}

registerProcessor('bitcrusher-processor', BitcrusherProcessor);
