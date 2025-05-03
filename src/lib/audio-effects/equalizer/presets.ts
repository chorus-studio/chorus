export const EQ_FILTERS: { freq: number; gain: number; type: string }[] = [
    { freq: 20, gain: 0, type: 'lowshelf' },
    { freq: 32, gain: 0, type: 'lowshelf' },
    { freq: 50, gain: 0, type: 'lowshelf' },
    { freq: 64, gain: 0, type: 'peaking' },
    { freq: 125, gain: 0, type: 'peaking' },
    { freq: 150, gain: 0, type: 'peaking' },
    { freq: 250, gain: 0, type: 'peaking' },
    { freq: 400, gain: 0, type: 'peaking' },
    { freq: 500, gain: 0, type: 'peaking' },
    { freq: 1000, gain: 0, type: 'peaking' },
    { freq: 2000, gain: 0, type: 'peaking' },
    { freq: 2400, gain: 0, type: 'peaking' },
    { freq: 3000, gain: 0, type: 'peaking' },
    { freq: 4000, gain: 0, type: 'peaking' },
    { freq: 6000, gain: 0, type: 'peaking' },
    { freq: 8000, gain: 0, type: 'peaking' },
    { freq: 12_000, gain: 0, type: 'peaking' },
    { freq: 14_000, gain: 0, type: 'highshelf' },
    { freq: 16_000, gain: 0, type: 'highshelf' }
]

const SPOTIFY_PRESETS: Record<string, number[]> = {
    Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    Acoustic: [1.0, 0.8, 0.0, -0.8, -1.0, -0.8, 0.0, 0.8, 1.0, 1.2],
    'Bass booster': [2.5, 2.0, 1.5, 1.0, 0.0, -1.0, -1.5, -2.0, -2.0, -2.0],
    'Bass reducer': [-2.0, -2.0, -1.5, -1.0, 0.0, 1.0, 1.5, 2.0, 2.0, 2.0],
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
    'Treble reducer': [1.8, 1.8, 1.5, 1.0, 0.0, -1.0, -1.8, -2.0, -2.0, -2.2],
    'Vocal booster': [0.0, 0.0, 1.0, 1.8, 1.8, 1.0, 0.0, -0.6, -0.6, 0.0]
}

const CUSTOM_PRESETS: Record<string, number[]> = {
    Club: [0.0, 0.0, 1.8, 1.5, 1.5, 1.5, 0.8, 0.0, 0.0, 0.0],
    Live: [-1.0, 0.0, 1.0, 1.5, 1.5, 1.5, 1.0, 0.8, 0.8, 0.8],
    Party: [1.8, 1.8, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.8, 1.8],
    Soft: [1.2, 0.6, 0.0, -0.6, 0.0, 1.0, 1.8, 2.0, 2.2, 2.2],
    Ska: [-0.6, -1.0, -0.8, 0.0, 1.0, 1.5, 1.8, 2.0, 2.2, 1.8],
    'Open Back': [1.0, 2.0, 1.2, -0.8, -0.6, 0.6, 1.2, 2.0, 2.5, 2.8],
    'Closed Back': [1.5, 2.2, 1.5, -0.8, -0.8, 0.8, 1.5, 2.2, 2.8, 3.0],
    Bass: [2.0, 2.2, 2.2, 1.5, 0.6, -0.8, -1.8, -2.0, -2.0, -2.0],
    Treble: [-2.0, -2.0, -2.0, -1.0, 0.8, 2.2, 2.8, 2.8, 2.8, 3.0],
    'Lossy Audio': [0.8, 1.0, 0.8, 0.0, -0.4, -0.4, 0.0, 0.8, 1.0, 1.2],
    Podcast: [0.0, 0.0, 0.6, 1.0, 1.8, 1.0, 0.0, -0.6, -1.0, -1.2],
    ConcertHall: [1.2, 1.0, 0.6, 0.0, -0.6, -0.6, 0.0, 1.0, 1.5, 1.6],
    Mastering: [-0.3, -0.3, -0.3, -0.3, -0.3, -0.3, -0.3, -0.3, -0.3, -0.3],
    'Vintage Radio': [-1.5, -1.0, 0.0, 1.5, 2.0, 1.5, 0.0, -1.0, -1.5, -2.0],
    'Metal Core': [1.5, 1.0, -0.5, -1.0, 0.0, 1.5, 2.0, 1.5, 0.5, 0.0],
    'Ambient Space': [-0.5, -0.5, 0.0, 0.5, 1.0, 1.5, 1.0, 0.5, 0.0, -0.5],
    'Folk Acoustic': [0.5, 0.8, 1.0, 0.5, 0.0, -0.5, 0.0, 0.5, 0.8, 1.0],
    Synthwave: [1.0, 0.5, 0.0, -0.5, 0.0, 1.0, 1.5, 1.8, 1.5, 1.0],
    'Lo-Fi Hip Hop': [1.5, 1.0, 0.0, -0.5, -1.0, -0.5, 0.0, 0.5, 1.0, 1.5],
    Orchestral: [0.0, 0.0, 0.5, 1.0, 1.5, 1.0, 0.5, 0.0, -0.5, -1.0],
    'Drum & Bass': [2.0, 1.5, 0.0, -1.0, -1.5, -1.0, 0.0, 1.0, 1.5, 1.0],
    'Vocal Focus': [-0.5, -0.5, 0.0, 1.0, 1.5, 1.0, 0.0, -0.5, -1.0, -1.5],
    Gaming: [1.0, 1.5, 1.0, 0.0, -0.5, 0.0, 1.0, 1.5, 1.0, 0.5]
}

export const spotifyPresets = Object.keys(SPOTIFY_PRESETS)
export const customPresets = Object.keys(CUSTOM_PRESETS)

export const EQ_PRESETS = Object.assign(SPOTIFY_PRESETS, CUSTOM_PRESETS)
export const eqPresetLabels = Object.keys(EQ_PRESETS)
