export type CrossfadeType = 'linear' | 'exponential' | 'equal-power'

export interface CrossfadeSettings {
    enabled: boolean
    duration: number // seconds (3-12)
    type: CrossfadeType
    minTrackLength: number // Don't crossfade tracks shorter than this
}

export interface AudioBufferChunk {
    data: string // base64 encoded
    range: { start: number; end: number }
    trackId: string
    url: string
}

export const DEFAULT_CROSSFADE_SETTINGS: CrossfadeSettings = {
    enabled: false,
    duration: 6, // Spotify's default
    type: 'equal-power',
    minTrackLength: 30
}
