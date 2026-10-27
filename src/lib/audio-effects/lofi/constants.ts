import {
  normalizeEffectSettings,
  type EffectSettings,
  type EffectSettingsInput,
} from './audio/effect-settings';

export const WEB_APP_URL = 'https://lovelofi.app';
export const WEB_ONBOARDING_URL = `${WEB_APP_URL}/onboarding`;
export const WEB_SUPPORT_URL = `${WEB_APP_URL}/support`;
export const WEB_UNINSTALL_URL = `${WEB_APP_URL}/uninstall?source=extension-uninstall`;

export interface Preset {
  id: string;
  name: string;
  description: string;
  settings: EffectSettings;
}

interface PresetDefinition extends Omit<Preset, 'settings'> {
  settings: EffectSettingsInput;
}

const RAW_BUILT_IN_PRESETS: PresetDefinition[] = [
  // --- Subtle / Everyday ---
  {
    id: 'classic-lofi',
    name: 'Classic Lo-Fi',
    description: 'The everyday signature: rounded highs, soft studio air, and just enough tape dust to feel familiar.',
    settings: {
      lowPass: { enabled: true, intensity: 34 },
      highPass: { enabled: false, intensity: 0 },
      tapeSaturation: { enabled: true, intensity: 18 },
      reverb: { enabled: true, intensity: 18, profile: 'studio' },
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: false, intensity: 0 },
      vinylCrackle: { enabled: true, intensity: 12 },
      pitchWobble: { enabled: true, intensity: 4 },
      stereoDrift: { enabled: false, intensity: 0 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: false, intensity: 0 },
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
  {
    id: 'lofi-hiphop',
    name: 'Lo-Fi Hip-Hop',
    description: 'Dusty drums and mellow samples — warmer lows, more crackle, tighter room',
    settings: {
      lowPass: { enabled: true, intensity: 44 },
      highPass: { enabled: false, intensity: 0 },
      tapeSaturation: { enabled: true, intensity: 20 },
      reverb: { enabled: true, intensity: 16, profile: 'room' },
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: false, intensity: 0 },
      vinylCrackle: { enabled: true, intensity: 28 },
      pitchWobble: { enabled: true, intensity: 8 },
      stereoDrift: { enabled: false, intensity: 0 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: false, intensity: 0 },
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
  {
    id: 'lofi-jazz',
    name: 'Lo-Fi Jazz',
    description: 'Softer edges for live instruments — airy warmth, low dust, and a natural room',
    settings: {
      lowPass: { enabled: true, intensity: 24 },
      highPass: { enabled: false, intensity: 0 },
      tapeSaturation: { enabled: true, intensity: 10 },
      reverb: { enabled: true, intensity: 24, profile: 'studio' },
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: true, intensity: 8 },
      vinylCrackle: { enabled: true, intensity: 8 },
      pitchWobble: { enabled: false, intensity: 0 },
      stereoDrift: { enabled: true, intensity: 6 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: false, intensity: 0 },
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
  {
    id: 'lofi-chill',
    name: 'Lo-Fi Chill',
    description: 'Gentle and unobtrusive — a clean cozy treatment for background listening',
    settings: {
      lowPass: { enabled: true, intensity: 28 },
      highPass: { enabled: false, intensity: 0 },
      tapeSaturation: { enabled: true, intensity: 8 },
      reverb: { enabled: true, intensity: 16, profile: 'studio' },
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: true, intensity: 10 },
      vinylCrackle: { enabled: true, intensity: 10 },
      pitchWobble: { enabled: false, intensity: 0 },
      stereoDrift: { enabled: false, intensity: 0 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: false, intensity: 0 },
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
  {
    id: 'lofi-synthwave',
    name: 'Lo-Fi Synthwave',
    description: 'Retro neon haze — less muffled, wider chorus, and glossy tape wear',
    settings: {
      lowPass: { enabled: true, intensity: 18 },
      highPass: { enabled: false, intensity: 0 },
      tapeSaturation: { enabled: true, intensity: 16 },
      reverb: { enabled: true, intensity: 22, profile: 'spring' },
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: true, intensity: 24 },
      vinylCrackle: { enabled: true, intensity: 8 },
      pitchWobble: { enabled: true, intensity: 8 },
      stereoDrift: { enabled: true, intensity: 16 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: false, intensity: 0 },
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
  {
    id: 'lofi-vaporwave',
    name: 'Lo-Fi Vaporwave',
    description: 'Drowsy and degraded — slowed, smeared, and drifting through pink fog',
    settings: {
      lowPass: { enabled: true, intensity: 40 },
      highPass: { enabled: false, intensity: 0 },
      tapeSaturation: { enabled: true, intensity: 18 },
      reverb: { enabled: true, intensity: 42, profile: 'hall' },
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: true, intensity: 18 },
      vinylCrackle: { enabled: true, intensity: 18 },
      pitchWobble: { enabled: true, intensity: 16 },
      stereoDrift: { enabled: true, intensity: 20 },
      dropout: { enabled: true, intensity: 6 },
      slowdown: { enabled: true, intensity: 24 },
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
  {
    id: 'sunday-morning',
    name: 'Sunday Morning',
    description: 'Barely-there warmth — just enough to soften the edges',
    settings: {
      lowPass: { enabled: true, intensity: 18 },    // ~3350 Hz — gentle rolloff
      highPass: { enabled: false, intensity: 0 },
      tapeSaturation: { enabled: true, intensity: 8 },
      reverb: { enabled: true, intensity: 16, profile: 'studio' },
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: true, intensity: 10 },
      vinylCrackle: { enabled: true, intensity: 10 },
      pitchWobble: { enabled: false, intensity: 0 },
      stereoDrift: { enabled: false, intensity: 0 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: false, intensity: 0 },
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
  {
    id: 'late-night-study',
    name: 'Late Night Study',
    description: 'Focused and intimate, with soft room tone, restrained texture, and enough motion to stay alive.',
    settings: {
      lowPass: { enabled: true, intensity: 34 },    // ~2800 Hz — warm but still legible
      highPass: { enabled: false, intensity: 0 },
      tapeSaturation: { enabled: true, intensity: 12 },
      reverb: { enabled: true, intensity: 28, profile: 'room' },
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: true, intensity: 8 },
      vinylCrackle: { enabled: true, intensity: 12 },
      pitchWobble: { enabled: true, intensity: 3 },
      stereoDrift: { enabled: false, intensity: 0 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: false, intensity: 0 },
      vocalCut: { enabled: false, intensity: 0 },
      equalizer: {
        enabled: true,
        bands: [
          { freq: 90, gain: -1, q: 0.9 },
          { freq: 250, gain: 1.5, q: 1.0 },
          { freq: 1000, gain: 0, q: 1.0 },
          { freq: 3500, gain: -1.5, q: 1.1 },
          { freq: 9000, gain: -3, q: 0.8 },
        ],
      },
    },
  },
  // --- Vinyl / Analog Texture ---
  {
    id: 'rainy-cafe',
    name: 'Rainy Cafe',
    description: 'Muffled cafe speakers, softened detail, and a little record dust, like music drifting in from the next room.',
    settings: {
      lowPass: { enabled: true, intensity: 40 },    // ~2560 Hz — muffled warmth
      highPass: { enabled: false, intensity: 0 },
      tapeSaturation: { enabled: true, intensity: 14 },
      reverb: { enabled: true, intensity: 18, profile: 'cassette' },     // small speaker-room blur
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: false, intensity: 0 },
      vinylCrackle: { enabled: true, intensity: 30 },
      pitchWobble: { enabled: false, intensity: 0 },
      stereoDrift: { enabled: true, intensity: 4 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: false, intensity: 0 },
      vocalCut: { enabled: false, intensity: 0 },
      equalizer: {
        enabled: true,
        bands: [
          { freq: 90, gain: -2, q: 0.9 },
          { freq: 250, gain: 2, q: 1.0 },
          { freq: 1000, gain: -1, q: 1.0 },
          { freq: 3500, gain: -3, q: 1.1 },
          { freq: 9000, gain: -6, q: 0.8 },
        ],
      },
    },
  },
  {
    id: 'old-cassette',
    name: 'Old Cassette',
    description: 'A worn but listenable cassette pass with softened highs, audible wow, and a touch of mechanical instability.',
    settings: {
      lowPass: { enabled: true, intensity: 30 },    // ~2920 Hz
      highPass: { enabled: true, intensity: 10 },   // ~90 Hz — thin tape bass
      tapeSaturation: { enabled: true, intensity: 30 },
      reverb: { enabled: false, intensity: 0, profile: 'cassette' },
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: false, intensity: 0 },
      vinylCrackle: { enabled: true, intensity: 12 },
      pitchWobble: { enabled: true, intensity: 20 },  // audible wow & flutter
      stereoDrift: { enabled: true, intensity: 14 },
      dropout: { enabled: true, intensity: 4 },
      slowdown: { enabled: false, intensity: 0 },
      vocalCut: { enabled: false, intensity: 0 },
      equalizer: {
        enabled: true,
        bands: [
          { freq: 90, gain: -4, q: 0.9 },
          { freq: 250, gain: -1, q: 1.0 },
          { freq: 1000, gain: 1, q: 1.0 },
          { freq: 3500, gain: -2, q: 1.1 },
          { freq: 9000, gain: -7, q: 0.8 },
        ],
      },
    },
  },
  {
    id: 'broken-walkman',
    name: 'Broken Walkman',
    description: 'Dying batteries, chewed tape — beautifully broken',
    settings: {
      lowPass: { enabled: true, intensity: 35 },
      highPass: { enabled: true, intensity: 16 },
      tapeSaturation: { enabled: true, intensity: 40 },  // heavy saturation
      reverb: { enabled: false, intensity: 0, profile: 'cassette' },
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: false, intensity: 0 },
      vinylCrackle: { enabled: true, intensity: 18 },
      pitchWobble: { enabled: true, intensity: 32 },   // heavy wow
      stereoDrift: { enabled: true, intensity: 24 },
      dropout: { enabled: true, intensity: 10 },       // frequent dropouts
      slowdown: { enabled: true, intensity: 34 },     // dying batteries = slow tape
      vocalCut: { enabled: false, intensity: 0 },
      equalizer: {
        enabled: true,
        bands: [
          { freq: 90, gain: -5, q: 0.9 },
          { freq: 250, gain: 2, q: 1.0 },
          { freq: 1000, gain: -1.5, q: 1.0 },
          { freq: 3500, gain: -4, q: 1.1 },
          { freq: 9000, gain: -8, q: 0.8 },
        ],
      },
    },
  },
  // --- Spacious / Reverb-heavy ---
  {
    id: 'dreamy',
    name: 'Dreamy',
    description: 'A wide, floating wash with soft shimmer and gentle drag for sleepy, late-night listening.',
    settings: {
      lowPass: { enabled: true, intensity: 24 },    // ~3140 Hz — hazy but still airy
      highPass: { enabled: false, intensity: 0 },
      tapeSaturation: { enabled: false, intensity: 0 },
      reverb: { enabled: true, intensity: 50, profile: 'hall' },     // big wet reverb
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: true, intensity: 20 },     // shimmer
      vinylCrackle: { enabled: false, intensity: 0 },
      pitchWobble: { enabled: true, intensity: 6 },
      stereoDrift: { enabled: true, intensity: 10 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: true, intensity: 12 },     // gentle float
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
  {
    id: 'foggy-harbor',
    name: 'Foggy Harbor',
    description: 'Distant, muffled, drifting through dense fog',
    settings: {
      lowPass: { enabled: true, intensity: 52 },    // ~2130 Hz — quite muffled
      highPass: { enabled: false, intensity: 0 },
      tapeSaturation: { enabled: true, intensity: 8 },
      reverb: { enabled: true, intensity: 64, profile: 'hall' },     // massive reverb
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: true, intensity: 16 },
      vinylCrackle: { enabled: false, intensity: 0 },
      pitchWobble: { enabled: true, intensity: 5 },
      stereoDrift: { enabled: true, intensity: 20 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: false, intensity: 0 },
      vocalCut: { enabled: false, intensity: 0 },
      equalizer: {
        enabled: true,
        bands: [
          { freq: 90, gain: -3, q: 0.9 },
          { freq: 250, gain: 1, q: 1.0 },
          { freq: 1000, gain: -2, q: 1.0 },
          { freq: 3500, gain: -4, q: 1.1 },
          { freq: 9000, gain: -7, q: 0.8 },
        ],
      },
    },
  },
  {
    id: 'underwater',
    name: 'Underwater',
    description: 'Submerged — everything is filtered, slow, and distant',
    settings: {
      lowPass: { enabled: true, intensity: 65 },    // ~1700 Hz — deeply muffled
      highPass: { enabled: false, intensity: 0 },
      tapeSaturation: { enabled: false, intensity: 0 },
      reverb: { enabled: true, intensity: 55 },
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: true, intensity: 35 },     // slow undulating modulation
      vinylCrackle: { enabled: false, intensity: 0 },
      pitchWobble: { enabled: true, intensity: 10 },
      stereoDrift: { enabled: true, intensity: 25 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: true, intensity: 35 },     // submerged drift
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
  // --- Lo-fi Radio / Bandwidth-limited ---
  {
    id: 'vintage-radio',
    name: 'Vintage Radio',
    description: 'Narrow-band radio tone with papery mids, old-speaker warmth, and a little station grit.',
    settings: {
      lowPass: { enabled: true, intensity: 58 },    // ~1910 Hz — narrow bandwidth
      highPass: { enabled: true, intensity: 36 },   // ~310 Hz — thin out bass
      tapeSaturation: { enabled: true, intensity: 22 },
      reverb: { enabled: false, intensity: 0, profile: 'spring' },
      bitcrusher: { enabled: true, intensity: 14 }, // ~14-bit — subtle aliasing
      chorus: { enabled: false, intensity: 0 },
      vinylCrackle: { enabled: true, intensity: 16 },
      pitchWobble: { enabled: true, intensity: 4 },
      stereoDrift: { enabled: false, intensity: 0 },
      dropout: { enabled: true, intensity: 6 },
      slowdown: { enabled: false, intensity: 0 },
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
  // --- Digital Degradation ---
  {
    id: 'vhs-memories',
    name: 'VHS Memories',
    description: 'Worn video tape — soft bitcrush, tracking drift, tape hiss',
    settings: {
      lowPass: { enabled: true, intensity: 38 },
      highPass: { enabled: true, intensity: 15 },   // ~140 Hz
      tapeSaturation: { enabled: true, intensity: 28 },
      reverb: { enabled: true, intensity: 10, profile: 'cassette' },     // tiny room ambience
      bitcrusher: { enabled: true, intensity: 22 },  // ~13-bit — subtle
      chorus: { enabled: false, intensity: 0 },
      vinylCrackle: { enabled: false, intensity: 0 },
      pitchWobble: { enabled: true, intensity: 14 },
      stereoDrift: { enabled: true, intensity: 22 },
      dropout: { enabled: true, intensity: 6 },
      slowdown: { enabled: false, intensity: 0 },
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
  {
    id: '8-bit-chill',
    name: '8-Bit Chill',
    description: 'Retro digital — crunchy bitcrusher meets warm reverb',
    settings: {
      lowPass: { enabled: true, intensity: 22 },    // ~3210 Hz — keep some clarity
      highPass: { enabled: false, intensity: 0 },
      tapeSaturation: { enabled: false, intensity: 0 },
      reverb: { enabled: true, intensity: 26, profile: 'studio' },
      bitcrusher: { enabled: true, intensity: 42 },  // ~11-bit — audible crunch
      chorus: { enabled: false, intensity: 0 },
      vinylCrackle: { enabled: false, intensity: 0 },
      pitchWobble: { enabled: false, intensity: 0 },
      stereoDrift: { enabled: false, intensity: 0 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: false, intensity: 0 },
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
  // --- Room / Space ---
  {
    id: 'empty-apartment',
    name: 'Empty Apartment',
    description: 'Bare walls, wood floors — small room with bright early reflections',
    settings: {
      lowPass: { enabled: true, intensity: 20 },    // ~3280 Hz — slightly warm
      highPass: { enabled: false, intensity: 0 },
      tapeSaturation: { enabled: true, intensity: 10 },
      reverb: { enabled: true, intensity: 30 },     // small-medium room
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: false, intensity: 0 },
      vinylCrackle: { enabled: false, intensity: 0 },
      pitchWobble: { enabled: false, intensity: 0 },
      stereoDrift: { enabled: true, intensity: 8 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: false, intensity: 0 },
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
  {
    id: 'basement-show',
    name: 'Basement Show',
    description: 'Low ceiling, concrete walls — tight reverb, saturated PA system',
    settings: {
      lowPass: { enabled: true, intensity: 35 },    // ~2740 Hz — muffled by walls
      highPass: { enabled: true, intensity: 8 },     // ~80 Hz — muddy bass cut
      tapeSaturation: { enabled: true, intensity: 30 },  // overdriven PA
      reverb: { enabled: true, intensity: 25 },     // short, tight
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: false, intensity: 0 },
      vinylCrackle: { enabled: false, intensity: 0 },
      pitchWobble: { enabled: false, intensity: 0 },
      stereoDrift: { enabled: false, intensity: 0 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: false, intensity: 0 },
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
  {
    id: 'hotel-lobby',
    name: 'Hotel Lobby',
    description: 'A polished lobby bloom with airy reflections, elegant width, and a warm upscale haze.',
    settings: {
      lowPass: { enabled: true, intensity: 22 },    // ~3210 Hz — airy but soft
      highPass: { enabled: false, intensity: 0 },
      tapeSaturation: { enabled: false, intensity: 0 },
      reverb: { enabled: true, intensity: 38, profile: 'hall' },     // large reflective space
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: true, intensity: 8 },      // subtle shimmer
      vinylCrackle: { enabled: false, intensity: 0 },
      pitchWobble: { enabled: false, intensity: 0 },
      stereoDrift: { enabled: true, intensity: 10 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: false, intensity: 0 },
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
  {
    id: 'parking-garage',
    name: 'Parking Garage',
    description: 'Concrete cathedral — metallic echoes, dark and cavernous',
    settings: {
      lowPass: { enabled: true, intensity: 30 },    // ~2920 Hz — industrial tone
      highPass: { enabled: true, intensity: 12 },   // ~120 Hz — boomy bass tamed
      tapeSaturation: { enabled: true, intensity: 12 },
      reverb: { enabled: true, intensity: 58, profile: 'hall' },     // huge concrete reverb
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: false, intensity: 0 },
      vinylCrackle: { enabled: false, intensity: 0 },
      pitchWobble: { enabled: false, intensity: 0 },
      stereoDrift: { enabled: true, intensity: 20 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: false, intensity: 0 },
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
  {
    id: 'bathroom-tiles',
    name: 'Bathroom Tiles',
    description: 'Singing in the shower — bright, tight reverb with flutter echoes',
    settings: {
      lowPass: { enabled: true, intensity: 15 },    // ~3460 Hz — bright reflections
      highPass: { enabled: true, intensity: 6 },     // ~60 Hz — less bass buildup
      tapeSaturation: { enabled: false, intensity: 0 },
      reverb: { enabled: true, intensity: 34, profile: 'spring' },     // medium, bright
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: true, intensity: 16 },     // flutter echo effect
      vinylCrackle: { enabled: false, intensity: 0 },
      pitchWobble: { enabled: false, intensity: 0 },
      stereoDrift: { enabled: true, intensity: 10 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: false, intensity: 0 },
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
  {
    id: 'church-hall',
    name: 'Church Hall',
    description: 'Vast stone nave — long decay, warm organ-like resonance',
    settings: {
      lowPass: { enabled: true, intensity: 40 },    // ~2560 Hz — dark, warm
      highPass: { enabled: false, intensity: 0 },
      tapeSaturation: { enabled: true, intensity: 6 },
      reverb: { enabled: true, intensity: 72, profile: 'hall' },     // cathedral-scale
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: true, intensity: 20 },     // organ-like modulation
      vinylCrackle: { enabled: false, intensity: 0 },
      pitchWobble: { enabled: true, intensity: 4 },  // subtle drift
      stereoDrift: { enabled: true, intensity: 22 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: false, intensity: 0 },
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
  // --- Muffled / Through-the-wall ---
  {
    id: 'next-door',
    name: 'Next Door',
    description: 'Music bleeding through the wall — muffled, warm, just out of reach',
    settings: {
      lowPass: { enabled: true, intensity: 70 },    // ~1530 Hz — heavy muffle
      highPass: { enabled: true, intensity: 18 },   // ~170 Hz — wall absorbs low end
      tapeSaturation: { enabled: true, intensity: 10 },
      reverb: { enabled: true, intensity: 22 },     // small room ambience
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: false, intensity: 0 },
      vinylCrackle: { enabled: false, intensity: 0 },
      pitchWobble: { enabled: false, intensity: 0 },
      stereoDrift: { enabled: false, intensity: 0 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: true, intensity: 20 },     // sleepy pace
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
  {
    id: 'pillow-fort',
    name: 'Pillow Fort',
    description: 'Buried under blankets — ultra-muffled, cozy, low-end only',
    settings: {
      lowPass: { enabled: true, intensity: 78 },    // ~1260 Hz — very dark
      highPass: { enabled: false, intensity: 0 },   // keep the full low end
      tapeSaturation: { enabled: true, intensity: 14 },
      reverb: { enabled: true, intensity: 15 },     // tiny space
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: true, intensity: 8 },      // gentle softening
      vinylCrackle: { enabled: false, intensity: 0 },
      pitchWobble: { enabled: true, intensity: 5 },  // sleepy drift
      stereoDrift: { enabled: false, intensity: 0 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: false, intensity: 0 },
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
  {
    id: 'upstairs-party',
    name: 'Upstairs Party',
    description: 'Bass and mids thumping through the ceiling — distant beat, no detail',
    settings: {
      lowPass: { enabled: true, intensity: 82 },    // ~1120 Hz — extreme muffle
      highPass: { enabled: true, intensity: 30 },   // ~260 Hz — only the thump comes through
      tapeSaturation: { enabled: true, intensity: 18 },
      reverb: { enabled: true, intensity: 28 },     // room resonance
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: false, intensity: 0 },
      vinylCrackle: { enabled: false, intensity: 0 },
      pitchWobble: { enabled: false, intensity: 0 },
      stereoDrift: { enabled: true, intensity: 12 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: false, intensity: 0 },
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
  // --- Moody / Atmospheric ---
  {
    id: 'haunted-ballroom',
    name: 'Haunted Ballroom',
    description: 'A dark ballroom bloom with warped motion, dusty ghosts in the air, and long trailing echoes.',
    settings: {
      lowPass: { enabled: true, intensity: 44 },    // ~2420 Hz — dark and moody
      highPass: { enabled: false, intensity: 0 },
      tapeSaturation: { enabled: true, intensity: 10 },
      reverb: { enabled: true, intensity: 60, profile: 'hall' },     // cavernous
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: true, intensity: 24 },     // eerie detuning
      vinylCrackle: { enabled: true, intensity: 20 },
      pitchWobble: { enabled: true, intensity: 14 }, // ghostly warping
      stereoDrift: { enabled: true, intensity: 16 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: true, intensity: 18 },     // ghostly drag
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
  // --- Song Covers ---
  {
    id: 'lofi-cover',
    name: 'Lo-Fi Cover',
    description: 'Slowed down, warmed up — the classic "slowed + reverb" cover sound for any song.',
    settings: {
      lowPass: { enabled: true, intensity: 32 },
      highPass: { enabled: false, intensity: 0 },
      tapeSaturation: { enabled: true, intensity: 20 },
      reverb: { enabled: true, intensity: 24, profile: 'cassette' },
      bitcrusher: { enabled: false, intensity: 0 },
      chorus: { enabled: false, intensity: 0 },
      vinylCrackle: { enabled: true, intensity: 16 },
      pitchWobble: { enabled: true, intensity: 6 },
      stereoDrift: { enabled: false, intensity: 0 },
      dropout: { enabled: false, intensity: 0 },
      slowdown: { enabled: true, intensity: 35 },
      vocalCut: { enabled: false, intensity: 0 },
    },
  },
];

export const BUILT_IN_PRESETS: Preset[] = RAW_BUILT_IN_PRESETS.map((preset) => ({
  ...preset,
  settings: normalizeEffectSettings(preset.settings),
}));

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'late-night';

export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'late-night';
}

export const TIME_PRESET_MAP: Record<TimeOfDay, string> = {
  morning: 'dreamy',
  afternoon: 'rainy-cafe',
  evening: 'late-night-study',
  'late-night': 'old-cassette',
};

export function getSuggestedPresetId(
  suggestions: Record<TimeOfDay, string> = TIME_PRESET_MAP,
): string {
  return suggestions[getTimeOfDay()];
}
