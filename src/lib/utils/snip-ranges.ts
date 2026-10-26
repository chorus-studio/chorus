// A snip is the set of sections a user marked on a track plus what happens to
// them: in `play` mode only those sections play, in `skip` mode everything but
// those sections plays. The playback engine never looks at the mode — it works
// from the play segments `toSegments` derives, so one rule set covers single and
// multi-section snips in either mode.
import { round1 } from './snip-time'

export type SnipMode = 'play' | 'skip'
export type SnipRange = { start: number; end: number }
/** Stored per track. Ranges are in seconds at 0.1 s resolution. */
export type Snip = { mode: SnipMode; ranges: SnipRange[] }
/**
 * What plays, sorted and non-overlapping. `end: null` means "to the end of the
 * track" so skip mode never depends on the duration being known.
 */
export type PlaySegment = { start: number; end: number | null }

/** Shortest section the editor allows, in seconds. */
export const MIN_SECTION_LENGTH = 1
/** Length of a section added with the + button, in seconds. */
export const NEW_SECTION_LENGTH = 10
/** How long the editor keeps playing past a bound the user just moved. */
export const EDIT_GRACE_SECONDS = 3

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

const isRange = (r: unknown): r is SnipRange =>
    typeof r === 'object' &&
    r !== null &&
    isNum((r as SnipRange).start) &&
    isNum((r as SnipRange).end)

export function isSnip(raw: unknown): raw is Snip {
    if (typeof raw !== 'object' || raw === null) return false
    const { mode, ranges } = raw as Snip
    return (mode === 'play' || mode === 'skip') && Array.isArray(ranges) && ranges.every(isRange)
}

/**
 * Accepts the stored shape from any version — `{ mode, ranges }` or the legacy
 * `{ start_time, end_time }` (one play section) — and returns the current shape,
 * or null for anything unusable.
 */
export function migrateSnip(raw: unknown): Snip | null {
    if (isSnip(raw)) return raw
    if (typeof raw !== 'object' || raw === null) return null
    const { start_time, end_time } = raw as { start_time?: unknown; end_time?: unknown }
    if (!isNum(start_time) || !isNum(end_time) || !(end_time > start_time)) return null
    return { mode: 'play', ranges: [{ start: round1(start_time), end: round1(end_time) }] }
}

/** The editor's starting point for a track without a snip: play the whole track. */
export function defaultSnip(duration: number): Snip {
    return { mode: 'play', ranges: [{ start: 0, end: Math.max(0, round1(duration)) }] }
}

/**
 * Sort, clamp into the track (when its duration is known), drop sections
 * shorter than `minLength`, and merge overlapping or touching neighbours.
 */
export function normalizeRanges(
    ranges: SnipRange[],
    duration: number,
    minLength = MIN_SECTION_LENGTH
): SnipRange[] {
    const max = duration > 0 ? duration : Infinity
    const clean = ranges
        .filter(isRange)
        .map(({ start, end }) => ({
            start: round1(Math.max(0, Math.min(start, max))),
            end: round1(Math.max(0, Math.min(end, max)))
        }))
        .filter(({ start, end }) => end - start >= minLength)
        .sort((a, b) => a.start - b.start)

    const merged: SnipRange[] = []
    for (const range of clean) {
        const last = merged[merged.length - 1]
        if (last && range.start <= last.end) {
            last.end = Math.max(last.end, range.end)
        } else {
            merged.push({ ...range })
        }
    }
    return merged
}

/**
 * The play segments for a snip. An empty result means "no constraint" (no
 * snip, or nothing usable in it). A segment that reaches the known duration
 * becomes open-ended so the engine treats it as the natural track end.
 */
export function toSegments(snip: Snip | null | undefined, duration: number): PlaySegment[] {
    if (!snip) return []
    const ranges = normalizeRanges(snip.ranges, duration)
    if (ranges.length === 0) return []
    const known = duration > 0
    const openIfAtEnd = (end: number): number | null => (known && end >= duration ? null : end)

    if (snip.mode === 'play') {
        return ranges.map(({ start, end }) => ({ start, end: openIfAtEnd(end) }))
    }

    const segments: PlaySegment[] = []
    let cursor = 0
    for (const cut of ranges) {
        if (cut.start > cursor) segments.push({ start: cursor, end: cut.start })
        cursor = Math.max(cursor, cut.end)
    }
    if (!known || cursor < duration) segments.push({ start: cursor, end: null })
    return segments
}

/** True when the segments impose nothing: none, or one from the start to the end. */
export function coversWholeTrack(segments: PlaySegment[]): boolean {
    if (segments.length === 0) return true
    return segments.length === 1 && segments[0].start <= 0 && segments[0].end === null
}

/**
 * The segment the polled position sits in. The position is Spotify's elapsed
 * label (whole seconds, the floor of the real position) while bounds are at
 * 0.1 s, so a segment counts from the floor of its start — after a seek to
 * 65.4 the label reads 65, and 65 < 65.4 would seek again on every tick.
 */
export function segmentAt(segments: PlaySegment[], positionSeconds: number): PlaySegment | null {
    return (
        segments.find(
            ({ start, end }) =>
                positionSeconds >= Math.floor(start) && (end === null || positionSeconds < end)
        ) ?? null
    )
}

/** The first segment that starts after the position, if any. */
export function nextSegment(segments: PlaySegment[], positionSeconds: number): PlaySegment | null {
    return segments.find(({ start }) => Math.floor(start) > positionSeconds) ?? null
}

export function firstSegmentStart(segments: PlaySegment[]): number {
    return segments[0]?.start ?? 0
}

export function lastSegment(segments: PlaySegment[]): PlaySegment | null {
    return segments[segments.length - 1] ?? null
}

/**
 * The bound of a section where playback jumps: leaving a play section (its
 * end) or entering a skipped one (its start).
 */
export function jumpEdge(mode: SnipMode, range: SnipRange): number {
    return mode === 'play' ? range.end : range.start
}

/**
 * Let the segment that ends at `edge` run `grace` seconds longer, so a bound
 * the user just moved can be heard with what follows it. Never past the next
 * segment or the end of the track.
 */
export function withGrace(
    segments: PlaySegment[],
    edge: number,
    duration: number,
    grace = EDIT_GRACE_SECONDS
): PlaySegment[] {
    return segments.map((segment, i) => {
        if (segment.end === null || Math.abs(segment.end - edge) > 0.05) return segment
        const next = segments[i + 1]
        let end = segment.end + grace
        if (next) end = Math.min(end, next.start)
        if (duration > 0 && end >= duration) return { ...segment, end: null }
        return { ...segment, end: round1(end) }
    })
}

const rangesEqual = (a: SnipRange[], b: SnipRange[]) =>
    a.length === b.length &&
    a.every((r, i) => round1(r.start) === round1(b[i].start) && round1(r.end) === round1(b[i].end))

export function snipsEqual(a: Snip | null | undefined, b: Snip | null | undefined): boolean {
    if (!a || !b) return !a && !b
    return a.mode === b.mode && rangesEqual(a.ranges, b.ranges)
}

/**
 * Where a new section goes when the user presses +: `NEW_SECTION_LENGTH`
 * seconds from `at`, fitted into the gap around it, else into the nearest gap
 * that has room. Null when no gap can hold a section.
 */
export function placeNewRange(
    ranges: SnipRange[],
    at: number,
    duration: number,
    length = NEW_SECTION_LENGTH
): SnipRange | null {
    if (!(duration > 0)) return null
    const sorted = normalizeRanges(ranges, duration, 0)
    const gaps: SnipRange[] = []
    let cursor = 0
    for (const { start, end } of sorted) {
        if (start - cursor >= MIN_SECTION_LENGTH) gaps.push({ start: cursor, end: start })
        cursor = Math.max(cursor, end)
    }
    if (duration - cursor >= MIN_SECTION_LENGTH) gaps.push({ start: cursor, end: duration })
    if (gaps.length === 0) return null

    const point = round1(Math.max(0, Math.min(at, duration)))
    const distance = (gap: SnipRange) =>
        point < gap.start ? gap.start - point : point > gap.end ? point - gap.end : 0
    const gap = gaps.slice().sort((a, b) => distance(a) - distance(b))[0]

    const size = Math.min(length, gap.end - gap.start)
    let start = Math.max(gap.start, Math.min(point, gap.end - size))
    if (point > gap.end) start = gap.end - size
    return { start: round1(start), end: round1(start + size) }
}
