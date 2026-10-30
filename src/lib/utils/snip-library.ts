import type { SimpleTrack } from '$lib/stores/data/cache'
import type { Snip, SnipRange } from '$lib/utils/snip-ranges'
import { formatRulerTime } from '$lib/utils/snip-time'

/** Helpers for the Snips dialog: the saved sections of every track, as a list. */

/** Newest snip first; entries saved before the timestamp existed sink to the end, by title. */
export function sortSnipped(tracks: SimpleTrack[]): SimpleTrack[] {
    return [...tracks].sort(
        (a, b) => (b.snipped_at ?? 0) - (a.snipped_at ?? 0) || a.song_id.localeCompare(b.song_id)
    )
}

const formatRange = ({ start, end }: SnipRange) =>
    `${formatRulerTime(start)}–${formatRulerTime(end)}`

/** "0:42–1:11 · 2:05–2:30", with a "+n" tail once there are more than `shown` sections. */
export function describeRanges(snip: Snip, shown = 3): string {
    const parts = snip.ranges.slice(0, shown).map(formatRange)
    const rest = snip.ranges.length - parts.length
    return rest > 0 ? `${parts.join(' · ')} +${rest}` : parts.join(' · ')
}

/** Total seconds the sections cover. */
export function rangesLength(snip: Snip): number {
    return snip.ranges.reduce((sum, { start, end }) => sum + Math.max(0, end - start), 0)
}

/** "Title by Artist" → its two halves, as the player bar stores them. */
export function parseSongId(songId: string): { title: string; artists: string } {
    const parts = songId.split(' by ')
    return { title: parts[0] || '', artists: parts.slice(1).join(', ') || '' }
}
