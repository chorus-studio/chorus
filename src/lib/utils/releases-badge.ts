/**
 * The toolbar badge: how many new releases arrived since the New Releases
 * view was last opened. The page refreshes the counts when it loads; the
 * view marks everything seen when it opens.
 */
export type ReleaseCounts = {
    music_count?: number
    shows_count?: number
    /** The total when the view was last opened. */
    seen_count?: number
}

export function unseenReleases(state: ReleaseCounts | null | undefined): number {
    if (!state) return 0
    const total = (state.music_count ?? 0) + (state.shows_count ?? 0)
    return Math.max(0, total - (state.seen_count ?? 0))
}

/** What the badge shows: nothing for zero, "99+" past two digits. */
export function badgeText(count: number): string {
    if (!(count > 0)) return ''
    return count > 99 ? '99+' : String(Math.floor(count))
}
