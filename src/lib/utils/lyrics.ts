/** One lyric line and the second it starts at. */
export type LyricLine = { start: number; text: string }
export type Lyrics = {
    /** False when the lines carry no usable times (unsynced lyrics). */
    synced: boolean
    lines: LyricLine[]
}

/**
 * Shape the lines from the web player's color-lyrics response ({ lyrics:
 * { syncType, lines: [{ startTimeMs, words }] } }); null when there are none.
 */
export function parseLyrics(response: unknown): Lyrics | null {
    const lyrics = (response as { lyrics?: Record<string, unknown> } | null)?.lyrics
    if (!lyrics || !Array.isArray(lyrics.lines)) return null
    const lines: LyricLine[] = []
    for (const raw of lyrics.lines as Array<Record<string, unknown>>) {
        if (!raw || typeof raw !== 'object') continue
        const text = typeof raw.words === 'string' ? raw.words.trim() : ''
        const ms = Number(raw.startTimeMs)
        if (!text || !Number.isFinite(ms)) continue
        lines.push({ start: Math.round(ms / 100) / 10, text })
    }
    if (lines.length === 0) return null
    lines.sort((a, b) => a.start - b.start)
    const synced = lyrics.syncType === 'LINE_SYNCED' && lines.some((line) => line.start > 0)
    return { synced, lines }
}
