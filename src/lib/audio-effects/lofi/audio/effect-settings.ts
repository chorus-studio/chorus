import { DEFAULT_REVERB_PROFILE, type ReverbProfile } from './effects/reverb';

export type BasicEffectSettings = { enabled: boolean; intensity: number };
export type ReverbEffectSettings = BasicEffectSettings & { profile?: ReverbProfile };

export interface EqualizerBandSetting {
  freq: number;
  gain: number;
  q: number;
}

export const DEFAULT_EQUALIZER_BANDS: readonly EqualizerBandSetting[] = [
  { freq: 90, gain: 0, q: 0.9 },
  { freq: 250, gain: 0, q: 1.0 },
  { freq: 1000, gain: 0, q: 1.0 },
  { freq: 3500, gain: 0, q: 1.1 },
  { freq: 9000, gain: 0, q: 0.8 },
];

export interface EqualizerSettings {
  enabled: boolean;
  bands: EqualizerBandSetting[];
}

export function createDefaultEqualizerSettings(): EqualizerSettings {
  return {
    enabled: false,
    bands: DEFAULT_EQUALIZER_BANDS.map((band) => ({ ...band })),
  };
}

export interface EffectSettings {
  lowPass: BasicEffectSettings;
  highPass: BasicEffectSettings;
  tapeSaturation: BasicEffectSettings;
  reverb: ReverbEffectSettings;
  bitcrusher: BasicEffectSettings;
  chorus: BasicEffectSettings;
  vinylCrackle: BasicEffectSettings;
  pitchWobble: BasicEffectSettings;
  stereoDrift: BasicEffectSettings;
  dropout: BasicEffectSettings;
  slowdown: BasicEffectSettings;
  vocalCut: BasicEffectSettings;
  equalizer?: EqualizerSettings;
}

export type EffectSettingsInput = Partial<EffectSettings>;

export const DEFAULT_EFFECT_SETTINGS: EffectSettings = {
  lowPass: { enabled: false, intensity: 60 },
  highPass: { enabled: false, intensity: 30 },
  tapeSaturation: { enabled: false, intensity: 40 },
  reverb: { enabled: false, intensity: 50, profile: DEFAULT_REVERB_PROFILE },
  bitcrusher: { enabled: false, intensity: 40 },
  chorus: { enabled: false, intensity: 35 },
  vinylCrackle: { enabled: false, intensity: 50 },
  pitchWobble: { enabled: false, intensity: 40 },
  stereoDrift: { enabled: false, intensity: 30 },
  dropout: { enabled: false, intensity: 20 },
  slowdown: { enabled: false, intensity: 30 },
  vocalCut: { enabled: false, intensity: 50 },
  equalizer: createDefaultEqualizerSettings(),
};

function normalizeBasicEffectSettings(
  fallback: BasicEffectSettings,
  value: unknown,
): BasicEffectSettings {
  if (!value || typeof value !== 'object') return { ...fallback };
  const effect = value as Partial<BasicEffectSettings>;
  return {
    enabled: typeof effect.enabled === 'boolean' ? effect.enabled : fallback.enabled,
    intensity: typeof effect.intensity === 'number'
      ? Math.max(0, Math.min(100, effect.intensity))
      : fallback.intensity,
  };
}

function normalizeEqualizerBands(value: unknown): EqualizerBandSetting[] {
  const fallback = DEFAULT_EFFECT_SETTINGS.equalizer!.bands;
  if (!Array.isArray(value)) {
    return fallback.map((band) => ({ ...band }));
  }

  return fallback.map((fallbackBand, index) => {
    const band = value[index] as Partial<EqualizerBandSetting> | undefined;
    return {
      freq: fallbackBand.freq,
      gain: typeof band?.gain === 'number' ? Math.max(-12, Math.min(12, band.gain)) : fallbackBand.gain,
      q: typeof band?.q === 'number' ? Math.max(0.1, Math.min(10, band.q)) : fallbackBand.q,
    };
  });
}

export function normalizeEffectSettings(value: EffectSettingsInput | null | undefined): EffectSettings {
  const fallback = DEFAULT_EFFECT_SETTINGS;
  if (!value || typeof value !== 'object') {
    return JSON.parse(JSON.stringify(fallback)) as EffectSettings;
  }

  const settings = value as Partial<EffectSettings>;

  return {
    lowPass: normalizeBasicEffectSettings(fallback.lowPass, settings.lowPass),
    highPass: normalizeBasicEffectSettings(fallback.highPass, settings.highPass),
    tapeSaturation: normalizeBasicEffectSettings(fallback.tapeSaturation, settings.tapeSaturation),
    reverb: {
      ...normalizeBasicEffectSettings(fallback.reverb, settings.reverb),
      profile: settings.reverb?.profile ?? fallback.reverb.profile,
    },
    bitcrusher: normalizeBasicEffectSettings(fallback.bitcrusher, settings.bitcrusher),
    chorus: normalizeBasicEffectSettings(fallback.chorus, settings.chorus),
    vinylCrackle: normalizeBasicEffectSettings(fallback.vinylCrackle, settings.vinylCrackle),
    pitchWobble: normalizeBasicEffectSettings(fallback.pitchWobble, settings.pitchWobble),
    stereoDrift: normalizeBasicEffectSettings(fallback.stereoDrift, settings.stereoDrift),
    dropout: normalizeBasicEffectSettings(fallback.dropout, settings.dropout),
    slowdown: normalizeBasicEffectSettings(fallback.slowdown, settings.slowdown),
    vocalCut: normalizeBasicEffectSettings(fallback.vocalCut, settings.vocalCut),
    equalizer: settings.equalizer ? {
      enabled: typeof settings.equalizer.enabled === 'boolean'
        ? settings.equalizer.enabled
        : fallback.equalizer!.enabled,
      bands: normalizeEqualizerBands(settings.equalizer.bands),
    } : fallback.equalizer,
  };
}

export function cloneEffectSettings(settings: EffectSettings): EffectSettings {
  return JSON.parse(JSON.stringify(settings)) as EffectSettings;
}

export function disableEffectSettings(settings: EffectSettingsInput): EffectSettings {
  const normalized = normalizeEffectSettings(settings);
  const disabled: EffectSettings = {
    ...normalized,
    lowPass: { ...normalized.lowPass, enabled: false },
    highPass: { ...normalized.highPass, enabled: false },
    tapeSaturation: { ...normalized.tapeSaturation, enabled: false },
    reverb: { ...normalized.reverb, enabled: false },
    bitcrusher: { ...normalized.bitcrusher, enabled: false },
    chorus: { ...normalized.chorus, enabled: false },
    vinylCrackle: { ...normalized.vinylCrackle, enabled: false },
    pitchWobble: { ...normalized.pitchWobble, enabled: false },
    stereoDrift: { ...normalized.stereoDrift, enabled: false },
    dropout: { ...normalized.dropout, enabled: false },
    slowdown: { ...normalized.slowdown, enabled: false },
    vocalCut: { ...normalized.vocalCut, enabled: false },
  };
  if (disabled.equalizer) {
    disabled.equalizer = {
      enabled: false,
      bands: disabled.equalizer.bands.map((band) => ({ ...band })),
    };
  }
  return disabled;
}

/** Alias for disableEffectSettings — used by desktop app */
export const buildBypassEffectSettings = disableEffectSettings;
