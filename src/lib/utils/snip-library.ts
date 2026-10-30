import type { SimpleTrack } from '$lib/stores/data/cache'
import { migrateSnip, type Snip, type SnipRange } from '$lib/utils/snip-ranges'
import { formatRulerTime } from '$lib/utils/snip-time'

/**
 * Helpers for the Snips dialog: the saved sections of every track, as a list.
 * Collection entries written by older builds can lack their "Title by Artist"
 * string or hold a snip in the old shape, so nothing here assumes either.
 */

/** Newest snip first; entries saved before the timestamp existed sink to the end, by title. */
export function sortSnipped(tracks: SimpleTrack[]): SimpleTrack[] {
    return [...tracks].sort(
        (a, b) =>
            (b.snipped_at ?? 0) - (a.snipped_at ?? 0) ||
            (a.song_id ?? '').localeCompare(b.song_id ?? '')
    )
}

/** The entries with a usable snip, old shapes brought up to date, newest first. */
export function snippedTracks(tracks: SimpleTrack[]): SimpleTrack[] {
    const kept: SimpleTrack[] = []
    for (const track of tracks) {
        if (!track || typeof track !== 'object') continue
        const snip = migrateSnip(track.snip)
        if (!snip || snip.ranges.length === 0) continue
        kept.push(snip === track.snip ? track : { ...track, snip })
    }
    return sortSnipped(kept)
}

const formatRange = ({ start, end }: SnipRange) =>
    `${formatRulerTime(start)}–${formatRulerTime(end)}`

/** "0:42–1:11 · 2:05–2:30", with a "+n" tail once there are more than `shown` sections. */
export function describeRanges(snip: Snip, shown = 3): string {
    const ranges = snip.ranges ?? []
    const parts = ranges.slice(0, shown).map(formatRange)
    const rest = ranges.length - parts.length
    return rest > 0 ? `${parts.join(' · ')} +${rest}` : parts.join(' · ')
}

/** Total seconds the sections cover. */
export function rangesLength(snip: Snip): number {
    return (snip.ranges ?? []).reduce((sum, { start, end }) => sum + Math.max(0, end - start), 0)
}

/** "Title by Artist" → its two halves, as the player bar stores them; blanks when missing. */
export function parseSongId(songId?: string | null): { title: string; artists: string } {
    const parts = (songId ?? '').split(' by ')
    return { title: parts[0] || '', artists: parts.slice(1).join(', ') || '' }
}
