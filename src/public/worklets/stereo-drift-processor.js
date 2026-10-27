class StereoDriftProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'speed', defaultValue: 0.1, minValue: 0.01, maxValue: 1 },
      { name: 'depth', defaultValue: 0, minValue: 0, maxValue: 0.5 },
    ];
  }

  constructor() {
    super();
    this._phaseL = 0;
    this._phaseR = Math.PI * 0.7; // Offset so L and R drift independently
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input.length || !output.length) return true;

    const speed = parameters.speed[0] || 0.1;
    const depth = parameters.depth[0] || 0;

    const numSamples = input[0].length;
    const phaseIncrement = (speed * 2 * Math.PI) / sampleRate;

    for (let i = 0; i < numSamples; i++) {
      const gainL = 1 - depth * (0.5 + 0.5 * Math.sin(this._phaseL));
      const gainR = 1 - depth * (0.5 + 0.5 * Math.sin(this._phaseR));

      // Apply per-channel gain
      if (input[0]) {
        output[0][i] = (input[0][i] || 0) * gainL;
      }
      if (input.length > 1 && output.length > 1) {
        output[1][i] = (input[1][i] || 0) * gainR;
      } else if (output.length > 1 && input[0]) {
        // Mono input -> stereo output with drift
        output[1][i] = (input[0][i] || 0) * gainR;
      }

      this._phaseL += phaseIncrement;
      this._phaseR += phaseIncrement * 1.3; // Slightly different rate for R
    }

    // Keep phase in bounds
    if (this._phaseL > 2 * Math.PI) this._phaseL -= 2 * Math.PI;
    if (this._phaseR > 2 * Math.PI) this._phaseR -= 2 * Math.PI;

    return true;
  }
}

registerProcessor('stereo-drift-processor', StereoDriftProcessor);
