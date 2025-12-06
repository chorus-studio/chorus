// MS Processor Presets
// Defines preset configurations for mid-side audio processing

export const MS_PRESETS: Record<string, Record<string, number>> = {
    // Basic channel modes
    'left-only': { mode: 1, width: 100, midGain: 0, sideGain: 0, balance: 0 },
    'right-only': { mode: 2, width: 100, midGain: 0, sideGain: 0, balance: 0 },
    'mid-only': { mode: 3, width: 100, midGain: 0, sideGain: 0, balance: 0 },
    'side-only': { mode: 4, width: 100, midGain: 0, sideGain: 0, balance: 0 },
    'swap': { mode: 6, width: 100, midGain: 0, sideGain: 0, balance: 0 },
    'mono': { mode: 7, width: 100, midGain: 0, sideGain: 0, balance: 0 },

    // Stereo width presets
    'narrow': { mode: 5, width: 50, midGain: 0, sideGain: 0, balance: 0 },
    'normal': { mode: 5, width: 100, midGain: 0, sideGain: 0, balance: 0 },
    'wide': { mode: 5, width: 150, midGain: 0, sideGain: 0, balance: 0 },
    'ultra-wide': { mode: 5, width: 200, midGain: 0, sideGain: 0, balance: 0 },

    // Music practice presets
    'vocal-focus': { mode: 5, width: 60, midGain: 3, sideGain: -6, balance: 0 },
    'instrument-isolation': { mode: 5, width: 30, midGain: -12, sideGain: 3, balance: 0 },
    'karaoke': { mode: 4, width: 100, midGain: 0, sideGain: 0, balance: 0 }, // Remove center vocals
    'backing-track': { mode: 4, width: 100, midGain: 0, sideGain: 0, balance: 0 }, // Sides only
    'bass-focus': { mode: 3, width: 100, midGain: 3, sideGain: 0, balance: 0 } // Mid with boost
}

// Basic presets for top section of UI
export const basicPresets = [
    'left-only',
    'right-only',
    'mid-only',
    'side-only',
    'swap',
    'mono'
]

// Advanced presets for bottom section of UI
export const advancedPresets = [
    'narrow',
    'normal',
    'wide',
    'ultra-wide',
    'vocal-focus',
    'instrument-isolation',
    'karaoke',
    'backing-track',
    'bass-focus'
]

export const allPresets = [...basicPresets, ...advancedPresets]
