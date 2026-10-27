class DropoutProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'frequency', defaultValue: 0, minValue: 0, maxValue: 0.01 },
      { name: 'duration', defaultValue: 0.02, minValue: 0, maxValue: 0.1 },
    ];
  }

  constructor() {
    super();
    this._dropping = false;
    this._dropSamplesLeft = 0;
    this._fadeLength = 64; // Smooth fade to prevent clicks
    this._fadeSample = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input.length || !output.length) return true;

    const freq = parameters.frequency[0] || 0;
    const dur = parameters.duration[0] || 0.02;
    const numSamples = input[0].length;

    for (let i = 0; i < numSamples; i++) {
      // Check if we should start a new dropout
      if (!this._dropping && freq > 0 && Math.random() < freq) {
        this._dropping = true;
        this._dropSamplesLeft = Math.floor(dur * sampleRate);
        this._fadeSample = 0;
      }

      let gain = 1;

      if (this._dropping) {
        // Fade out
        if (this._fadeSample < this._fadeLength) {
          gain = 1 - this._fadeSample / this._fadeLength;
          this._fadeSample++;
        }
        // Full dropout
        else if (this._dropSamplesLeft > this._fadeLength) {
          gain = 0;
        }
        // Fade back in
        else if (this._dropSamplesLeft > 0) {
          gain = 1 - this._dropSamplesLeft / this._fadeLength;
        }
        // Done
        else {
          gain = 1;
          this._dropping = false;
        }

        this._dropSamplesLeft--;
      }

      // Apply gain to all channels
      for (let ch = 0; ch < output.length; ch++) {
        output[ch][i] = (input[ch] ? input[ch][i] : 0) * gain;
      }
    }

    return true;
  }
}

registerProcessor('dropout-processor', DropoutProcessor);
