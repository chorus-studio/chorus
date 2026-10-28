const PARAMS = [
    'preDelay',
    'bandwidth',
    'inputDiffusion1',
    'inputDiffusion2',
    'decay',
    'decayDiffusion1',
    'decayDiffusion2',
    'damping',
    'excursionRate',
    'excursionDepth',
    'dry',
    'wet'
]

type Preset = 'rooms' | 'custom'
type PresetParams = Record<Preset, Record<string, number[]>>

// Dry sits at unity in every preset: switching a reverb on leaves the track
// at the level it had and adds the tail at `wet` (the worklet scales it by
// 0.6). The vectors are khoin's DattorroReverbNode tunings with wet rescaled
// by 1 / (1 + dry) on 2026-10-27, which keeps the balance they had while a
// gain-1.0 bypass ran beside a mono-in worklet (effective dry was 1 + dry).
const PRESETS: PresetParams = {
    rooms: {
        small: [6.4, 0.56, 0.24, 0.24, 0.24, 0.24, 0.24, 0.4, 0, 0, 1, 0.21],
        office: [12, 0.56, 0.32, 0.32, 0.32, 0.24, 0.24, 0.4, 0, 0, 1, 0.21],
        library: [12, 0.48, 0.32, 0.32, 0.24, 0.24, 0.24, 0.56, 0, 0, 1, 0.15],
        studio: [12, 0.56, 0.32, 0.32, 0.32, 0.32, 0.32, 0.32, 0, 0, 1, 0.21],
        restaurant: [16, 0.48, 0.4, 0.4, 0.4, 0.32, 0.32, 0.4, 0, 0, 1, 0.27],
        medium: [12, 0.48, 0.4, 0.4, 0.4, 0.4, 0.4, 0.32, 0, 0, 1, 0.27],
        bathroom: [16, 0.32, 0.56, 0.56, 0.56, 0.48, 0.48, 0.64, 0.08, 0.08, 1, 0.42],
        stairwell: [20, 0.48, 0.4, 0.4, 0.48, 0.32, 0.32, 0.4, 0.08, 0.08, 1, 0.27],
        basement: [20, 0.32, 0.56, 0.56, 0.64, 0.56, 0.56, 0.32, 0, 0, 1, 0.34],
        large: [20, 0.56, 0.48, 0.48, 0.48, 0.48, 0.48, 0.24, 0, 0, 1, 0.34],
        garage: [24, 0.48, 0.48, 0.48, 0.56, 0.4, 0.4, 0.4, 0, 0, 1, 0.34],
        mall: [28, 0.56, 0.48, 0.48, 0.56, 0.4, 0.4, 0.4, 0, 0, 1, 0.34],
        pool: [28, 0.56, 0.48, 0.48, 0.56, 0.4, 0.4, 0.48, 0, 0, 1, 0.42],
        hall: [28, 0.56, 0.56, 0.56, 0.64, 0.56, 0.56, 0.24, 0, 0, 1, 0.42],
        cave: [28, 0.4, 0.64, 0.64, 0.72, 0.64, 0.64, 0.16, 0.16, 0.16, 1, 0.52],
        subway: [32, 0.4, 0.56, 0.56, 0.64, 0.48, 0.48, 0.32, 0.16, 0.16, 1, 0.42],
        airport: [36, 0.56, 0.56, 0.56, 0.64, 0.48, 0.48, 0.32, 0, 0, 1, 0.42],
        arena: [36, 0.56, 0.64, 0.64, 0.72, 0.64, 0.64, 0.16, 0.08, 0.08, 1, 0.52],
        cathedral: [44, 0.56, 0.72, 0.72, 0.76, 0.72, 0.72, 0.08, 0.08, 0.08, 1, 0.62]
    },
    custom: {
        ambience: [16, 0.64, 0.24, 0.24, 0.32, 0.16, 0.16, 0.4, 0, 0, 1, 0.15],
        xray: [4, 0.72, 0.32, 0.32, 0.16, 0.24, 0.24, 0.16, 0.08, 0.08, 1, 0.15],
        kick: [4, 0.16, 0.16, 0.16, 0.16, 0.16, 0.16, 0.08, 0, 0, 1, 0.27],
        lofi: [4, 0.24, 0.48, 0.48, 0.32, 0.4, 0.4, 0.56, 0, 0, 1, 0.27],
        radio: [4, 0.32, 0.4, 0.4, 0.24, 0.32, 0.32, 0.64, 0.08, 0.08, 1, 0.21],
        pipe: [4, 0.4, 0.64, 0.64, 0.48, 0.56, 0.56, 0.32, 0.08, 0.08, 1, 0.34],
        'digital tunnel': [4, 0.48, 0.56, 0.56, 0.56, 0.48, 0.48, 0.4, 0.04, 0.04, 1, 0.52],
        muffler: [4, 0.1, 0.2, 0.2, 0.3, 0.2, 0.2, 0.9, 0, 0, 1, 0.46],
        telephone: [2, 0.1, 0.3, 0.3, 0.2, 0.3, 0.3, 0.8, 0.1, 0.1, 1, 0.58],
        dream: [8, 0.48, 0.4, 0.4, 0.48, 0.32, 0.32, 0.4, 0.24, 0.24, 1, 0.34],
        bounce: [8, 0.56, 0.48, 0.48, 0.24, 0.4, 0.4, 0.32, 0.16, 0.16, 1, 0.21],
        glass: [8, 0.72, 0.48, 0.48, 0.24, 0.4, 0.4, 0.16, 0.16, 0.16, 1, 0.21],
        scifi: [8, 0.4, 0.56, 0.56, 0.4, 0.48, 0.48, 0.32, 0.4, 0.4, 1, 0.42],
        metallic: [8, 0.4, 0.64, 0.64, 0.32, 0.56, 0.56, 0.24, 0.16, 0.16, 1, 0.34],
        crystal: [12, 0.72, 0.4, 0.4, 0.32, 0.32, 0.32, 0.16, 0.24, 0.24, 1, 0.27],
        chamber: [12, 0.56, 0.32, 0.32, 0.24, 0.24, 0.24, 0.48, 0, 0, 1, 0.21],
        time: [12, 0.56, 0.64, 0.64, 0.4, 0.56, 0.56, 0.32, 0.32, 0.32, 1, 0.34],
        water: [12, 0.4, 0.48, 0.48, 0.4, 0.4, 0.4, 0.48, 0.16, 0.16, 1, 0.34],
        vintage: [12, 0.48, 0.4, 0.4, 0.32, 0.32, 0.32, 0.48, 0, 0, 1, 0.27],
        space: [12, 0.64, 0.48, 0.48, 0.64, 0.56, 0.56, 0.16, 0.32, 0.32, 1, 0.52],
        dark: [20, 0.24, 0.48, 0.48, 0.56, 0.4, 0.4, 0.64, 0.08, 0.08, 1, 0.34],
        canyon: [20, 0.64, 0.48, 0.48, 0.56, 0.4, 0.4, 0.32, 0.16, 0.16, 1, 0.42],
        storm: [20, 0.32, 0.56, 0.56, 0.48, 0.48, 0.48, 0.56, 0.24, 0.24, 1, 0.42],
        underwater: [16, 0.16, 0.32, 0.32, 0.56, 0.32, 0.32, 0.64, 0.08, 0.08, 1, 0.42],
        nightmare: [16, 0.16, 0.64, 0.64, 0.48, 0.56, 0.56, 0.72, 0.32, 0.32, 1, 0.42],
        ghost: [24, 0.56, 0.48, 0.48, 0.4, 0.4, 0.4, 0.32, 0.08, 0.08, 1, 0.21],
        ocean: [24, 0.48, 0.4, 0.4, 0.56, 0.32, 0.32, 0.4, 0.16, 0.16, 1, 0.52],
        reverse: [0, 0.56, 0.72, 0.72, 0.48, 0.64, 0.64, 0.24, 0.32, 0.32, 1, 0.4],
        glitch: [4, 0.32, 0.56, 0.56, 0.16, 0.48, 0.48, 0.32, 0.32, 0.32, 1, 0.27],
        diffusor: [0, 0.9999, 0.75, 0.625, 0.9, 0.7, 0.5, 0.1, 0.5, 0.8, 1, 0.82],
        'echo chamber': [32, 0.9999, 0.75, 0.625, 0.7, 0.7, 0.5, 0.2, 0.3, 0.6, 1, 0.67],
        echo: [40, 0.9999, 0.75, 0.625, 0.6, 0.7, 0.5, 0.2, 0.2, 0.5, 1, 0.67],
        universe: [32, 0.9999, 0.75, 0.625, 0.8, 0.7, 0.6, 0.1, 0.5, 0.8, 1, 0.82],
        void: [40, 0.9999, 0.75, 0.625, 0.9, 0.7, 0.6, 0.1, 0.4, 0.7, 1, 0.82]
    }
}

export const roomPresets = Object.keys(PRESETS.rooms)
export const customPresets = Object.keys(PRESETS.custom)
export const impulsePresets = ['kick_ir', 'muffler_ir', 'diffusor_ir', 'telephone_ir']

// Presets removed as near-duplicates of a kept twin (identical or one-param-off
// vectors). A user's saved effect name still resolves to its twin so old configs
// keep working and sound essentially the same; the names just leave the dropdowns.
const PRESET_ALIASES: Record<string, string> = {
    theater: 'hall', // identical vector
    classroom: 'office',
    factory: 'garage',
    gym: 'hall',
    jungle: 'canyon',
    rain: 'water',
    magic: 'time',
    quantum: 'metallic'
}

export const resolveReverbPreset = (effect: string): string => PRESET_ALIASES[effect] ?? effect

export const getParamsListForEffect = ({ effect, preset }: { effect: string; preset: Preset }) => {
    const resolved = resolveReverbPreset(effect)
    const effectValues = PRESETS[preset][resolved as keyof (typeof PRESETS)[typeof preset]]
    // Unknown name (e.g. a stale saved preset): no-op instead of crashing the engine.
    if (!effectValues) return []
    return effectValues.map((value, idx) => ({ name: PARAMS[idx], value }))
}
