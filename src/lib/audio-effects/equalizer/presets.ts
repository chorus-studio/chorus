// Standard full-spectrum 10-band graphic EQ. Presets are 10-value gain arrays that
// map 1:1 to these bands (previously there were 19 filters, so preset values only
// reached the bass 10 bands and everything above 1kHz was inert).
//
// Culled 2026-10-28 to one preset per shape: nothing here moves a band more than
// 3 dB, so two curves under about 0.5 dB rms apart were one sound with two names
// (the removed names resolve to their twin below). The two reducers used to be
// the boosters' tilts in reverse; they now only cut their own end, Treble reducer
// a degree harder than Classical's gentle roll-off.
export const EQ_FILTERS: { freq: number; gain: number; type: string }[] = [
    { freq: 32, gain: 0, type: 'lowshelf' },
    { freq: 64, gain: 0, type: 'peaking' },
    { freq: 125, gain: 0, type: 'peaking' },
    { freq: 250, gain: 0, type: 'peaking' },
    { freq: 500, gain: 0, type: 'peaking' },
    { freq: 1000, gain: 0, type: 'peaking' },
    { freq: 2000, gain: 0, type: 'peaking' },
    { freq: 4000, gain: 0, type: 'peaking' },
    { freq: 8000, gain: 0, type: 'peaking' },
    { freq: 16_000, gain: 0, type: 'highshelf' }
]

const SPOTIFY_PRESETS: Record<string, number[]> = {
    Acoustic: [1.0, 0.8, 0.0, -0.8, -1.0, -0.8, 0.0, 0.8, 1.0, 1.2],
    'Bass booster': [2.5, 2.0, 1.5, 1.0, 0.0, -1.0, -1.5, -2.0, -2.0, -2.0],
    'Bass reducer': [-2.5, -2.0, -1.5, -1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    Classical: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.5, -1.5, -1.5, -2.0],
    Dance: [2.0, 1.5, 0.8, 0.0, 0.0, -1.0, -1.5, -1.5, 0.0, 0.0],
    Electronic: [2.0, 1.5, 0.0, -1.0, -1.0, 0.0, 1.8, 2.0, 2.0, 1.8],
    HipHop: [2.0, 2.0, 1.5, -1.0, -1.5, -2.0, -2.0, -2.0, -1.5, -1.0],
    Jazz: [1.5, 1.5, 1.2, 0.0, -0.8, -1.2, -0.8, -0.6, -0.4, -0.2],
    Loudness: [2.0, 2.0, 1.5, 0.0, 0.0, 0.0, 1.5, 1.8, 1.8, 1.8],
    Pop: [0.6, 1.2, 1.8, 1.8, 1.2, 0.0, -0.6, -0.6, 0.6, 0.6],
    RnB: [2.0, 1.8, 1.5, 0.0, -1.0, -2.0, -2.0, -2.0, -2.0, -2.0],
    Rock: [2.0, 1.2, -1.0, -1.8, -0.8, 1.0, 1.8, 2.0, 2.0, 2.0],
    'Spoken word': [1.2, 1.2, 1.0, 0.6, 0.4, 0.0, -0.2, -0.6, -0.8, -1.0],
    'Treble booster': [-1.8, -1.8, -1.5, -1.0, 0.0, 1.0, 1.8, 2.0, 2.0, 2.2],
    'Treble reducer': [0.0, 0.0, 0.0, 0.0, 0.0, -1.5, -2.5, -3.0, -3.0, -3.2],
    'Vocal booster': [0.0, 0.0, 1.0, 1.8, 1.8, 1.0, 0.0, -0.6, -0.6, 0.0]
}

const CUSTOM_PRESETS: Record<string, number[]> = {
    Club: [0.0, 0.0, 1.8, 1.5, 1.5, 1.5, 0.8, 0.0, 0.0, 0.0],
    Live: [-1.0, 0.0, 1.0, 1.5, 1.5, 1.5, 1.0, 0.8, 0.8, 0.8],
    Party: [1.8, 1.8, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.8, 1.8],
    Soft: [1.2, 0.6, 0.0, -0.6, 0.0, 1.0, 1.8, 2.0, 2.2, 2.2],
    Ska: [-0.6, -1.0, -0.8, 0.0, 1.0, 1.5, 1.8, 2.0, 2.2, 1.8],
    'Closed Back': [1.5, 2.2, 1.5, -0.8, -0.8, 0.8, 1.5, 2.2, 2.8, 3.0],
    Podcast: [0.0, 0.0, 0.6, 1.0, 1.8, 1.0, 0.0, -0.6, -1.0, -1.2],
    'Vintage Radio': [-1.5, -1.0, 0.0, 1.5, 2.0, 1.5, 0.0, -1.0, -1.5, -2.0],
    'Metal Core': [1.5, 1.0, -0.5, -1.0, 0.0, 1.5, 2.0, 1.5, 0.5, 0.0]
}

export const spotifyPresets = Object.keys(SPOTIFY_PRESETS)
export const customPresets = Object.keys(CUSTOM_PRESETS)

export const EQ_PRESETS = Object.assign(SPOTIFY_PRESETS, CUSTOM_PRESETS)
export const eqPresetLabels = Object.keys(EQ_PRESETS)

// Presets removed as near-duplicates of a kept twin. A saved name still resolves
// to that twin so old configs and preset slots keep working; the names just
// leave the pickers. Flat and Mastering were no EQ at all.
export const EQ_PRESET_ALIASES: Record<string, string> = {
    Flat: 'none',
    Mastering: 'none',
    'Open Back': 'Closed Back',
    Bass: 'Bass booster',
    Treble: 'Treble booster',
    'Lossy Audio': 'Acoustic',
    ConcertHall: 'Acoustic',
    'Folk Acoustic': 'Acoustic',
    'Lo-Fi Hip Hop': 'Acoustic',
    'Ambient Space': 'Vocal booster',
    Orchestral: 'Podcast',
    'Vocal Focus': 'Podcast',
    Synthwave: 'Soft',
    'Drum & Bass': 'Electronic',
    Gaming: 'Party'
}

export const resolveEQPreset = (effect: string): string => EQ_PRESET_ALIASES[effect] ?? effect
