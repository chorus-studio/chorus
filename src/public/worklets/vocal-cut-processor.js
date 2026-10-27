class VocalCutProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      // How much of the center signal to remove (0 = none, 1 = full removal)
      { name: 'amount', defaultValue: 0, minValue: 0, maxValue: 1 },
      // Low frequency boundary for vocal removal (Hz)
      { name: 'lowFreq', defaultValue: 200, minValue: 80, maxValue: 500 },
      // High frequency boundary for vocal removal (Hz)
      { name: 'highFreq', defaultValue: 5000, minValue: 2000, maxValue: 8000 },
    ];
  }

  constructor() {
    super();
    // Simple single-pole IIR filter state for frequency targeting
    this._lpStateL = 0;
    this._lpStateR = 0;
    this._hpStateL = 0;
    this._hpStateR = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input.length || !output.length) return true;

    const amount = parameters.amount[0] || 0;

    // Pass-through when amount is 0
    if (amount === 0) {
      for (let ch = 0; ch < input.length; ch++) {
        if (output[ch]) output[ch].set(input[ch]);
      }
      return true;
    }

    // Mono input — can't do center cancellation, pass through
    if (input.length < 2 || output.length < 2) {
      for (let ch = 0; ch < input.length; ch++) {
        if (output[ch]) output[ch].set(input[ch]);
      }
      return true;
    }

    const left = input[0];
    const right = input[1];
    const outL = output[0];
    const outR = output[1];
    const numSamples = left.length;

    const lowFreq = parameters.lowFreq[0] || 200;
    const highFreq = parameters.highFreq[0] || 5000;

    // Single-pole filter coefficients
    const lpCoeff = Math.exp(-2 * Math.PI * highFreq / sampleRate);
    const hpCoeff = Math.exp(-2 * Math.PI * lowFreq / sampleRate);

    for (let i = 0; i < numSamples; i++) {
      const l = left[i];
      const r = right[i];

      // Extract center (mid) signal: (L + R) / 2
      const mid = (l + r) * 0.5;

      // Bandpass the mid signal to target vocal frequencies only
      // Low-pass: remove highs above highFreq
      this._lpStateL = this._lpStateL * lpCoeff + mid * (1 - lpCoeff);
      // High-pass: remove lows below lowFreq (subtract low-passed version)
      this._hpStateL = this._hpStateL * hpCoeff + this._lpStateL * (1 - hpCoeff);
      const vocalMid = this._lpStateL - this._hpStateL;

      // Remove the vocal-band center from both channels
      outL[i] = l - vocalMid * amount;
      outR[i] = r - vocalMid * amount;
    }

    return true;
  }
}

registerProcessor('vocal-cut-processor', VocalCutProcessor);
