// The Dattorro plate's parameters, in the order of the custom preset vectors.
const PLATE_PARAMS = [
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
export type ReverbEngine = 'fdn' | 'plate'

// Pre-delay is stored in samples at 44.1 kHz (the config editor shows it in ms).
const SR = 44100
const ms = (t: number) => Math.round(t * (SR / 1000))

// Rooms run on the FDN worklet (src/public/fdn-processor.js). Columns:
// pre-delay ms · bandwidth (input lowpass, 1 = full) · decay (RT60: 0.1 s at
// 0, 1 s at 0.5, 10 s at 1) · damping (how much faster highs die) · size
// (line lengths, a fifth to all of zita-rev1's) · early (reflection level) ·
// modulation depth ms · wet. Dry sits at unity: a room adds its tail on top
// of the track at the level it had. Wet was set on 2026-10-28 so each room
// carries the energy its plate predecessor did over the first 300 ms, and
// decay so the 500 Hz–1 kHz T60 lands on the intended time (offline harness).
type RoomRow = [number, number, number, number, number, number, number, number]
const ROOM_TABLE: Record<string, RoomRow> = {
    small: [3, 0.9, 0.34, 0.35, 0.15, 0.6, 0.3, 0.3],
    library: [4, 0.75, 0.31, 0.6, 0.2, 0.5, 0.3, 0.25],
    studio: [5, 0.95, 0.4, 0.4, 0.25, 0.6, 0.3, 0.3],
    medium: [8, 0.9, 0.48, 0.35, 0.35, 0.55, 0.4, 0.34],
    bathroom: [2, 0.99, 0.52, 0.1, 0.15, 0.7, 0.3, 0.25],
    stairwell: [6, 0.9, 0.6, 0.3, 0.3, 0.65, 0.4, 0.23],
    basement: [5, 0.7, 0.57, 0.6, 0.3, 0.5, 0.4, 0.36],
    large: [12, 0.9, 0.62, 0.3, 0.5, 0.5, 0.4, 0.41],
    garage: [8, 0.85, 0.54, 0.25, 0.4, 0.6, 0.4, 0.38],
    pool: [10, 0.99, 0.69, 0.05, 0.45, 0.6, 0.4, 0.35],
    hall: [20, 0.9, 0.7, 0.35, 0.7, 0.45, 0.5, 0.56],
    cave: [15, 0.7, 0.78, 0.6, 0.6, 0.5, 0.5, 0.56],
    subway: [14, 0.8, 0.72, 0.4, 0.55, 0.6, 0.5, 0.36],
    arena: [30, 0.9, 0.81, 0.3, 0.9, 0.4, 0.6, 0.65],
    cathedral: [40, 0.85, 0.91, 0.3, 1, 0.35, 0.6, 0.8]
}

const room = ([pre, bandwidth, decay, damping, size, early, depth, wet]: RoomRow) => ({
    preDelay: ms(pre),
    bandwidth,
    inputDiffusion1: 0.7,
    inputDiffusion2: 0.5,
    decay,
    damping,
    size,
    early,
    excursionRate: 0.6,
    excursionDepth: depth,
    dry: 1,
    wet
})

// Custom characters run on the Dattorro plate (src/public/processor.js), in
// PLATE_PARAMS order. Dry sits at unity here too; the vectors are khoin's
// DattorroReverbNode tunings with wet rescaled by 1 / (1 + dry) on 2026-10-27,
// which keeps the balance they had while a gain-1.0 bypass ran beside a
// mono-in worklet (effective dry was 1 + dry).
const CUSTOM: Record<string, number[]> = {
    lofi: [4, 0.24, 0.48, 0.48, 0.32, 0.4, 0.4, 0.56, 0, 0, 1, 0.27],
    radio: [4, 0.32, 0.4, 0.4, 0.24, 0.32, 0.32, 0.64, 0.08, 0.08, 1, 0.21],
    dream: [8, 0.48, 0.4, 0.4, 0.48, 0.32, 0.32, 0.4, 0.24, 0.24, 1, 0.34],
    scifi: [8, 0.4, 0.56, 0.56, 0.4, 0.48, 0.48, 0.32, 0.4, 0.4, 1, 0.42],
    metallic: [8, 0.4, 0.64, 0.64, 0.32, 0.56, 0.56, 0.24, 0.16, 0.16, 1, 0.34],
    crystal: [12, 0.72, 0.4, 0.4, 0.32, 0.32, 0.32, 0.16, 0.24, 0.24, 1, 0.27],
    water: [12, 0.4, 0.48, 0.48, 0.4, 0.4, 0.4, 0.48, 0.16, 0.16, 1, 0.34],
    space: [12, 0.64, 0.48, 0.48, 0.64, 0.56, 0.56, 0.16, 0.32, 0.32, 1, 0.52],
    canyon: [20, 0.64, 0.48, 0.48, 0.56, 0.4, 0.4, 0.32, 0.16, 0.16, 1, 0.42],
    storm: [20, 0.32, 0.56, 0.56, 0.48, 0.48, 0.48, 0.56, 0.24, 0.24, 1, 0.42],
    underwater: [16, 0.16, 0.32, 0.32, 0.56, 0.32, 0.32, 0.64, 0.08, 0.08, 1, 0.42],
    nightmare: [16, 0.16, 0.64, 0.64, 0.48, 0.56, 0.56, 0.72, 0.32, 0.32, 1, 0.42],
    glitch: [4, 0.32, 0.56, 0.56, 0.16, 0.48, 0.48, 0.32, 0.32, 0.32, 1, 0.27],
    echo: [40, 0.9999, 0.75, 0.625, 0.6, 0.7, 0.5, 0.2, 0.2, 0.5, 1, 0.67],
    universe: [32, 0.9999, 0.75, 0.625, 0.8, 0.7, 0.6, 0.1, 0.5, 0.8, 1, 0.82],
    void: [40, 0.9999, 0.75, 0.625, 0.9, 0.7, 0.6, 0.1, 0.4, 0.7, 1, 0.82]
}

export const roomPresets = Object.keys(ROOM_TABLE)
export const customPresets = Object.keys(CUSTOM)
export const impulsePresets = ['kick_ir', 'muffler_ir', 'diffusor_ir', 'telephone_ir']

// Presets removed as near-duplicates of a kept twin. A user's saved effect name
// still resolves to its twin so old configs keep working and sound essentially
// the same; the names just leave the dropdowns. The 2026-10-28 cull measured
// every preset offline (decay, wetness, brightness) and dropped the pairs within
// hearing of each other, plus the digital stand-ins for the recorded impulses.
export const PRESET_ALIASES: Record<string, string> = {
    // 2026-02
    theater: 'hall',
    classroom: 'studio',
    factory: 'garage',
    gym: 'hall',
    jungle: 'canyon',
    rain: 'water',
    magic: 'dream',
    quantum: 'metallic',
    // 2026-10-28, rooms
    office: 'studio',
    restaurant: 'medium',
    mall: 'garage',
    airport: 'hall',
    // 2026-10-28, custom
    ambience: 'small',
    xray: 'crystal',
    kick: 'kick_ir',
    pipe: 'metallic',
    'digital tunnel': 'subway',
    muffler: 'muffler_ir',
    telephone: 'telephone_ir',
    bounce: 'crystal',
    glass: 'crystal',
    chamber: 'studio',
    time: 'dream',
    vintage: 'medium',
    dark: 'underwater',
    ghost: 'medium',
    ocean: 'canyon',
    reverse: 'canyon',
    diffusor: 'void',
    'echo chamber': 'echo'
}

export const resolveReverbPreset = (effect: string): string => PRESET_ALIASES[effect] ?? effect

// Which worklet a digital preset runs on. Unknown and 'none' fall to the plate,
// which is also what a config edit from cold builds.
export const engineFor = (effect: string): ReverbEngine =>
    roomPresets.includes(resolveReverbPreset(effect)) ? 'fdn' : 'plate'

// The FDN's room shape: set at once, never ramped, or a tail would pitch-bend
// while its lines stretched to the new size.
export const STRUCTURAL_PARAMS = ['size', 'early']

export const getParamsListForEffect = ({ effect, preset }: { effect: string; preset: Preset }) => {
    const resolved = resolveReverbPreset(effect)
    if (preset === 'rooms') {
        const row = ROOM_TABLE[resolved]
        if (!row) return []
        return Object.entries(room(row)).map(([name, value]) => ({ name, value }))
    }
    const effectValues = CUSTOM[resolved]
    // Unknown name (e.g. a stale saved preset): no-op instead of crashing the engine.
    if (!effectValues) return []
    return effectValues.map((value, idx) => ({ name: PLATE_PARAMS[idx], value }))
}
