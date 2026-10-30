import type { LyricLine } from '$lib/utils/lyrics'
import { MIN_SECTION_LENGTH, type SnipRange } from '$lib/utils/snip-ranges'
import { round1 } from '$lib/utils/snip-time'

/**
 * The section two lyric lines bound: from where the first starts to where
 * the line after the last starts (or the track end, or a beat after the last
 * line when the length is unknown). Either line may be clicked first.
 */
export function lineSpan(
    lines: LyricLine[],
    a: number,
    b: number,
    duration: number
): SnipRange | null {
    const first = Math.min(a, b)
    const last = Math.max(a, b)
    if (!lines[first] || !lines[last]) return null
    const start = round1(lines[first].start)
    const next = lines[last + 1]
    let end = next ? next.start : duration > 0 ? duration : lines[last].start + 5
    end = round1(Math.max(end, start + MIN_SECTION_LENGTH))
    if (duration > 0) end = Math.min(end, round1(duration))
    return end - start >= MIN_SECTION_LENGTH ? { start, end } : null
}

/** The line playing at `position`: the last one that has started. */
export function lineAt(lines: LyricLine[], position: number): number {
    let index = -1
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].start <= position) index = i
        else break
    }
    return index
}
