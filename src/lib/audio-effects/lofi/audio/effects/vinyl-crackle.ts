export class VinylCrackleEffect {
  readonly output: GainNode;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode;
  private ctx: AudioContext;
  private _enabled = true;
  private _intensity = 30;
  private sampleBuffer: AudioBuffer | null = null;
  private usingSynthetic = false;

  // Synthetic fallback nodes
  private syntheticSources: AudioBufferSourceNode[] = [];
  private hissGain: GainNode | null = null;
  private crackleGain: GainNode | null = null;
  private rumbleGain: GainNode | null = null;
  private hissHighPass: BiquadFilterNode | null = null;
  private hissLowPass: BiquadFilterNode | null = null;
  private crackleBandPass: BiquadFilterNode | null = null;
  private rumbleLowPass: BiquadFilterNode | null = null;

  constructor(ctx: AudioContext, sampleUrl?: string) {
    this.ctx = ctx;
    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0;
    this.output = this.gainNode;

    // Try to load real sample, fall back to synthetic
    if (sampleUrl) {
      this.loadSample(sampleUrl).catch(() => {
        this.initSyntheticFallback();
      });
    } else {
      this.initSyntheticFallback();
    }
  }

  private async loadSample(url: string): Promise<void> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this.sampleBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.startSamplePlayback();
  }

  private startSamplePlayback(): void {
    if (!this.sampleBuffer) return;
    this.stopSources();

    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.sampleBuffer;
    this.source.loop = true;
    this.source.connect(this.gainNode);
    this.source.start();
  }

  private initSyntheticFallback(): void {
    this.usingSynthetic = true;

    this.hissGain = this.ctx.createGain();
    this.crackleGain = this.ctx.createGain();
    this.rumbleGain = this.ctx.createGain();

    this.hissHighPass = this.ctx.createBiquadFilter();
    this.hissHighPass.type = 'highpass';
    this.hissHighPass.frequency.value = 1400;

    this.hissLowPass = this.ctx.createBiquadFilter();
    this.hissLowPass.type = 'lowpass';
    this.hissLowPass.frequency.value = 7000;

    this.crackleBandPass = this.ctx.createBiquadFilter();
    this.crackleBandPass.type = 'bandpass';
    this.crackleBandPass.frequency.value = 2600;
    this.crackleBandPass.Q.value = 1.1;

    this.rumbleLowPass = this.ctx.createBiquadFilter();
    this.rumbleLowPass.type = 'lowpass';
    this.rumbleLowPass.frequency.value = 110;

    this.hissHighPass.connect(this.hissLowPass);
    this.hissLowPass.connect(this.hissGain);
    this.hissGain.connect(this.gainNode);
    this.crackleBandPass.connect(this.crackleGain);
    this.crackleGain.connect(this.gainNode);
    this.rumbleLowPass.connect(this.rumbleGain);
    this.rumbleGain.connect(this.gainNode);

    this.hissGain.gain.value = 0.45;
    this.crackleGain.gain.value = 0.9;
    this.rumbleGain.gain.value = 0.15;

    this.generateSyntheticLayers();
  }

  private generateSyntheticLayers(): void {
    if (!this.hissHighPass || !this.crackleBandPass || !this.rumbleLowPass) return;
    this.createSyntheticSource(this.createHissBuffer(11), this.hissHighPass);
    this.createSyntheticSource(this.createCrackleBuffer(13), this.crackleBandPass);
    this.createSyntheticSource(this.createRumbleBuffer(17), this.rumbleLowPass);
  }

  private createSyntheticSource(buffer: AudioBuffer, destination: AudioNode): void {
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(destination);
    source.start();
    this.syntheticSources.push(source);
  }

  private createHissBuffer(duration: number): AudioBuffer {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(2, length, sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let last = 0;
      for (let i = 0; i < length; i++) {
        const white = (Math.random() * 2 - 1) * 0.08;
        last = last * 0.985 + white * 0.2;
        data[i] = last;
      }
    }
    return buffer;
  }

  private createCrackleBuffer(duration: number): AudioBuffer {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(2, length, sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        let sample = 0;
        if (Math.random() < 0.0012) {
          const burstLength = 24 + Math.floor(Math.random() * 160);
          const polarity = Math.random() > 0.5 ? 1 : -1;
          const amplitude = 0.35 + Math.random() * 0.45;
          for (let j = 0; j < burstLength && i + j < length; j++) {
            const decay = Math.exp(-j / (6 + Math.random() * 28));
            data[i + j] += polarity * amplitude * decay * (0.8 + Math.random() * 0.4);
          }
        }
        if (Math.random() < 0.006) {
          sample += (Math.random() * 2 - 1) * 0.12;
        }
        data[i] += sample;
      }
    }
    return buffer;
  }

  private createRumbleBuffer(duration: number): AudioBuffer {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(2, length, sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let drift = 0;
      let phase = Math.random() * Math.PI * 2;
      const lfo = 0.25 + Math.random() * 0.25;
      for (let i = 0; i < length; i++) {
        drift = drift * 0.9995 + (Math.random() * 2 - 1) * 0.0008;
        phase += (Math.PI * 2 * lfo) / sampleRate;
        data[i] = drift + Math.sin(phase) * 0.01;
      }
    }
    return buffer;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
    this.gainNode.gain.value = value
      ? this.intensityToGain(this._intensity)
      : 0;
  }

  setIntensity(value: number): void {
    this._intensity = Math.max(0, Math.min(100, value));
    if (this._enabled) {
      this.gainNode.gain.value = this.intensityToGain(this._intensity);
    }
  }

  private intensityToGain(intensity: number): number {
    return (intensity / 100) * 0.5;
  }

  private stopSources(): void {
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
    for (const source of this.syntheticSources) {
      source.stop();
      source.disconnect();
    }
    this.syntheticSources = [];
  }

  destroy(): void {
    this.stopSources();
  }
}
