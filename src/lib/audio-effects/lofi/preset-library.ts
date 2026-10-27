import { BUILT_IN_PRESETS, type Preset } from './constants';

export type PresetSectionId =
  | 'featured'
  | 'lofi-family'
  | 'subtle-cozy'
  | 'tape-retro'
  | 'dreamy-washed'
  | 'spaces'
  | 'experimental';

export interface PresetSection {
  id: PresetSectionId;
  title: string;
  presets: Preset[];
}

export const FEATURED_PRESET_IDS = [
  'lofi-cover',
  'classic-lofi',
  'late-night-study',
  'rainy-cafe',
  'dreamy',
  'old-cassette',
  'hotel-lobby',
  'haunted-ballroom',
  'vintage-radio',
] as const;

const SECTION_ORDER: Array<{ id: PresetSectionId; title: string; presetIds: string[] }> = [
  {
    id: 'featured',
    title: 'Featured',
    presetIds: [...FEATURED_PRESET_IDS],
  },
  {
    id: 'lofi-family',
    title: 'Lo-Fi Family',
    presetIds: [
      'lofi-hiphop',
      'lofi-jazz',
      'lofi-chill',
      'lofi-synthwave',
      'lofi-vaporwave',
    ],
  },
  {
    id: 'subtle-cozy',
    title: 'Subtle & Cozy',
    presetIds: ['sunday-morning', 'next-door', 'pillow-fort'],
  },
  {
    id: 'tape-retro',
    title: 'Tape & Retro',
    presetIds: ['broken-walkman', 'vhs-memories'],
  },
  {
    id: 'dreamy-washed',
    title: 'Dreamy & Washed',
    presetIds: ['foggy-harbor'],
  },
  {
    id: 'spaces',
    title: 'Spaces',
    presetIds: [
      'empty-apartment',
      'basement-show',
      'parking-garage',
      'bathroom-tiles',
      'church-hall',
      'upstairs-party',
    ],
  },
  {
    id: 'experimental',
    title: 'Experimental',
    presetIds: ['underwater', '8-bit-chill'],
  },
];

export function getBuiltInPresetSections(): PresetSection[] {
  return SECTION_ORDER.map((section) => {
    const presets = section.presetIds
      .map((presetId) => BUILT_IN_PRESETS.find((preset) => preset.id === presetId))
      .filter((preset): preset is Preset => Boolean(preset));

    return { id: section.id, title: section.title, presets };
  }).filter((section) => section.presets.length > 0);
}
