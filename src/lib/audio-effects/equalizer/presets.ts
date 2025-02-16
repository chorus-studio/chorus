export const EQ_FILTERS: { freq: number; gain: number; type: string }[] = [
    { freq: 60, gain: 0, type: 'lowshelf' },
    { freq: 150, gain: 0, type: 'peaking' },
    { freq: 400, gain: 0, type: 'peaking' },
    { freq: 1000, gain: 0, type: 'peaking' },
    { freq: 2400, gain: 0, type: 'peaking' },
    { freq: 15_000, gain: 0, type: 'highshelf' }
]

// Helper to clamp gain values between -12 and 12 dB
const clampGain = (gain: number) => Math.max(-12, Math.min(12, gain))

const SPOTIFY_PRESETS: { [key: string]: number[] } = {
    Flat: [0, 0, 0, 0, 0, 0],
    Acoustic: [
        clampGain(1.5),
        clampGain(-1.5),
        clampGain(-1.0),
        clampGain(0.0),
        clampGain(1.5),
        clampGain(2.0)
    ],
    'Bass booster': [
        clampGain(6.0),
        clampGain(3.6),
        clampGain(-3.0),
        clampGain(-6.0),
        clampGain(-7.2),
        clampGain(-7.2)
    ],
    'Bass reducer': [
        clampGain(-6.0),
        clampGain(-3.0),
        clampGain(3.0),
        clampGain(6.0),
        clampGain(7.2),
        clampGain(7.2)
    ],
    Classical: [
        clampGain(0.0),
        clampGain(0.0),
        clampGain(0.0),
        clampGain(0.0),
        clampGain(-4.32),
        clampGain(-5.76)
    ],
    Dance: [
        clampGain(5.76),
        clampGain(0.0),
        clampGain(-3.36),
        clampGain(-4.32),
        clampGain(-4.32),
        clampGain(0.0)
    ],
    Deep: [
        clampGain(5.0),
        clampGain(-4.0),
        clampGain(-5.0),
        clampGain(-6.0),
        clampGain(-6.5),
        clampGain(-6.5)
    ],
    Electronic: [
        clampGain(4.8),
        clampGain(-2.88),
        clampGain(0.0),
        clampGain(4.8),
        clampGain(5.76),
        clampGain(5.28)
    ],
    HipHop: [
        clampGain(5.0),
        clampGain(-3.0),
        clampGain(-4.0),
        clampGain(-5.0),
        clampGain(-4.0),
        clampGain(-3.0)
    ],
    Jazz: [
        clampGain(3.0),
        clampGain(-2.0),
        clampGain(-3.0),
        clampGain(-2.0),
        clampGain(-1.5),
        clampGain(-0.5)
    ],
    Latin: [
        clampGain(4.0),
        clampGain(-4.0),
        clampGain(-5.0),
        clampGain(-4.5),
        clampGain(-3.5),
        clampGain(-1.5)
    ],
    Loudness: [
        clampGain(5.0),
        clampGain(0.0),
        clampGain(0.0),
        clampGain(5.0),
        clampGain(5.0),
        clampGain(5.0)
    ],
    Lounge: [
        clampGain(1.5),
        clampGain(-1.0),
        clampGain(-1.5),
        clampGain(-1.5),
        clampGain(-1.0),
        clampGain(0.0)
    ],
    Piano: [
        clampGain(3.0),
        clampGain(-2.0),
        clampGain(-3.0),
        clampGain(-2.5),
        clampGain(-1.5),
        clampGain(-0.5)
    ],
    Pop: [
        clampGain(0.96),
        clampGain(3.36),
        clampGain(0.0),
        clampGain(-1.44),
        clampGain(-1.44),
        clampGain(0.96)
    ],
    RnB: [
        clampGain(5.0),
        clampGain(-3.0),
        clampGain(-5.0),
        clampGain(-6.0),
        clampGain(-6.5),
        clampGain(-6.5)
    ],
    Rock: [
        clampGain(4.8),
        clampGain(-1.92),
        clampGain(2.4),
        clampGain(5.28),
        clampGain(6.72),
        clampGain(6.72)
    ],
    'Small speakers': [
        clampGain(3.0),
        clampGain(-3.5),
        clampGain(-5.0),
        clampGain(-5.0),
        clampGain(-5.0),
        clampGain(-4.0)
    ],
    'Spoken word': [
        clampGain(2.0),
        clampGain(1.0),
        clampGain(0.0),
        clampGain(-0.5),
        clampGain(-1.5),
        clampGain(-2.0)
    ],
    'Treble booster': [
        clampGain(-6.0),
        clampGain(0.0),
        clampGain(3.0),
        clampGain(6.0),
        clampGain(7.2),
        clampGain(8.4)
    ],
    'Treble reducer': [
        clampGain(6.0),
        clampGain(0.0),
        clampGain(-3.0),
        clampGain(-6.0),
        clampGain(-7.2),
        clampGain(-8.4)
    ],
    'Vocal booster': [
        clampGain(0.0),
        clampGain(2.4),
        clampGain(4.8),
        clampGain(2.4),
        clampGain(-1.2),
        clampGain(0.0)
    ]
}

const CUSTOM_PRESETS: { [key: string]: number[] } = {
    Club: [
        clampGain(0.0),
        clampGain(3.36),
        clampGain(3.36),
        clampGain(1.92),
        clampGain(0.0),
        clampGain(0.0)
    ],
    Live: [
        clampGain(-2.88),
        clampGain(3.36),
        clampGain(3.36),
        clampGain(2.4),
        clampGain(1.44),
        clampGain(1.44)
    ],
    Party: [
        clampGain(4.32),
        clampGain(0.0),
        clampGain(0.0),
        clampGain(0.0),
        clampGain(0.0),
        clampGain(4.32)
    ],
    Soft: [
        clampGain(2.88),
        clampGain(0.0),
        clampGain(2.4),
        clampGain(4.8),
        clampGain(5.76),
        clampGain(7.2)
    ],
    Ska: [
        clampGain(-1.44),
        clampGain(0.0),
        clampGain(2.4),
        clampGain(3.36),
        clampGain(5.76),
        clampGain(5.76)
    ],
    Reggae: [
        clampGain(0.0),
        clampGain(-3.36),
        clampGain(0.0),
        clampGain(3.84),
        clampGain(0.0),
        clampGain(0.0)
    ],
    Headphones: [
        clampGain(2.88),
        clampGain(-1.92),
        clampGain(0.96),
        clampGain(2.88),
        clampGain(7.68),
        clampGain(8.64)
    ],
    SoftRock: [
        clampGain(2.4),
        clampGain(-2.4),
        clampGain(-3.36),
        clampGain(-1.92),
        clampGain(1.44),
        clampGain(5.28)
    ],
    LargeHall: [
        clampGain(6.24),
        clampGain(3.36),
        clampGain(-2.88),
        clampGain(-2.88),
        clampGain(0.0),
        clampGain(0.0)
    ],
    Bass: [
        clampGain(4.8),
        clampGain(0.96),
        clampGain(-2.4),
        clampGain(-4.8),
        clampGain(-6.72),
        clampGain(-6.72)
    ],
    Treble: [
        clampGain(-5.76),
        clampGain(1.44),
        clampGain(6.72),
        clampGain(9.6),
        clampGain(9.6),
        clampGain(10.08)
    ],
    Laptop: [
        clampGain(2.88),
        clampGain(-1.92),
        clampGain(0.96),
        clampGain(2.88),
        clampGain(7.68),
        clampGain(8.64)
    ],
    BassTreble: [
        clampGain(4.32),
        clampGain(-2.88),
        clampGain(0.96),
        clampGain(4.8),
        clampGain(7.2),
        clampGain(7.2)
    ],
    Podcast: [
        clampGain(0.0),
        clampGain(2.4),
        clampGain(4.8),
        clampGain(2.4),
        clampGain(-1.2),
        clampGain(-3.6)
    ],
    SmallRoom: [
        clampGain(2.0),
        clampGain(-1.5),
        clampGain(-1.5),
        clampGain(0.0),
        clampGain(2.0),
        clampGain(2.5)
    ],
    LargeRoom: [
        clampGain(3.0),
        clampGain(-2.0),
        clampGain(-2.0),
        clampGain(0.0),
        clampGain(3.0),
        clampGain(4.0)
    ],
    ConcertHall: [
        clampGain(2.5),
        clampGain(0.0),
        clampGain(-1.0),
        clampGain(0.0),
        clampGain(3.0),
        clampGain(3.5)
    ],
    Auditorium: [
        clampGain(2.0),
        clampGain(-1.5),
        clampGain(-1.5),
        clampGain(0.5),
        clampGain(2.5),
        clampGain(3.0)
    ],
    Outdoor: [
        clampGain(3.0),
        clampGain(0.0),
        clampGain(-1.5),
        clampGain(0.0),
        clampGain(2.5),
        clampGain(3.0)
    ]
}

export const spotifyPresets = Object.keys(SPOTIFY_PRESETS)
export const customPresets = Object.keys(CUSTOM_PRESETS)

export const EQ_PRESETS = Object.assign(SPOTIFY_PRESETS, CUSTOM_PRESETS)
export const eqPresetLabels = Object.keys(EQ_PRESETS)
