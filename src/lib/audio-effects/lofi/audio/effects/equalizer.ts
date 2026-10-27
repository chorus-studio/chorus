import {
  DEFAULT_EQUALIZER_BANDS,
  type EqualizerBandSetting,
  type EqualizerSettings,
} from '../effect-settings';

const FILTER_TYPES: BiquadFilterType[] = ['lowshelf', 'peaking', 'peaking', 'peaking', 'highshelf'];

export class EqualizerEffect {
  readonly input: GainNode;
  readonly output: GainNode;
  private filters: BiquadFilterNode[];
  private _enabled = false;
  private currentBands: EqualizerBandSetting[];

  constructor(ctx: AudioContext) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.filters = DEFAULT_EQUALIZER_BANDS.map((band, index) => {
      const filter = ctx.createBiquadFilter();
      filter.type = FILTER_TYPES[index] ?? 'peaking';
      filter.frequency.value = band.freq;
      filter.Q.value = band.q;
      filter.gain.value = 0;
      return filter;
    });
    this.currentBands = DEFAULT_EQUALIZER_BANDS.map((band) => ({ ...band }));

    let previous: AudioNode = this.input;
    for (const filter of this.filters) {
      previous.connect(filter);
      previous = filter;
    }
    previous.connect(this.output);
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
    this.applyBands();
  }

  setSettings(settings: EqualizerSettings): void {
    this._enabled = settings.enabled;
    this.currentBands = settings.bands.map((band) => ({ ...band }));

    this.filters.forEach((filter, index) => {
      const band = this.currentBands[index] ?? DEFAULT_EQUALIZER_BANDS[index];
      filter.frequency.value = band.freq;
      filter.Q.value = band.q;
    });

    this.applyBands();
  }

  private applyBands(): void {
    this.filters.forEach((filter, index) => {
      const band = this.currentBands[index] ?? DEFAULT_EQUALIZER_BANDS[index];
      filter.gain.value = this._enabled ? band.gain : 0;
    });
  }
}
