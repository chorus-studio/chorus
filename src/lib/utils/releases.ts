/**
 * New releases: what Spotify lists for the artists and shows a person follows,
 * cut to a range and grouped for the New releases dialog. Pure; the store
 * (stores/new-releases.ts) holds the state and the service
 * (api/services/new-releases.ts) does the fetching.
 */

import { timeAgo } from './time-ago'

export type ReleaseType = 'ALBUM' | 'SINGLE' | 'EP' | 'COMPILATION' | 'EPISODE'
export type ReleaseKind = 'album' | 'single' | 'compilation' | 'episode'
export type Scope = 'music' | 'podcasts' | 'all'
export type Range = 'today' | 'yesterday' | 'week' | 'month'
export type GroupBy = 'date' | 'artist' | 'type'

export type Release = {
    uri: string
    id: string
    type: ReleaseType
    title: string
    /** The artist, or the show for an episode. */
    artist: { uri: string; name: string }
    /** Cover art around 300 px, or none. */
    cover: string | null
    /** When it came out, ms: the local start of that day for a dated release, the moment for an episode. */
    time: number
    trackCount?: number
    durationMs?: number
}

export type Filter = { albums: boolean; singles: boolean; compilations: boolean }
/** A uri with when it was noted, so old entries can be dropped. */
export type Stamped = { uri: string; created_at: string }

export type ReleasesState = {
    scope: Scope
    range: Range
    group_by: GroupBy
    filters: Filter
    music: Release[]
    shows: Release[]
    music_updated_at: string | null
    shows_updated_at: string | null
    dismissed: Stamped[]
    library: Stamped[]
    /** Releases in view for the badge; `seen_count` is the total when the dialog was last open. */
    music_count: number
    shows_count: number
    seen_count: number
}

export type ReleaseGroup = { key: string; label: string; items: Release[] }

export const DAY = 24 * 60 * 60 * 1000
/** How many days a sync keeps; a narrower range is cut client-side, so changing it needs no fetch. */
export const KEEP_DAYS = 30
/** A sync older than this is redone when Spotify loads or the dialog opens. */
export const STALE_MS = 6 * 60 * 60 * 1000
/** Calendar days each range covers, today included. */
export const RANGE_DAYS: Record<Range, number> = { today: 1, yesterday: 2, week: 7, month: 30 }
export const RANGE_WORD: Record<Range, string> = {
    today: 'today',
    yesterday: 'since yesterday',
    week: 'this week',
    month: 'this month'
}

export const defaultFilters: Filter = { albums: true, singles: true, compilations: true }

export const defaultReleasesState: ReleasesState = {
    scope: 'music',
    range: 'week',
    group_by: 'date',
    filters: defaultFilters,
    music: [],
    shows: [],
    music_updated_at: null,
    shows_updated_at: null,
    dismissed: [],
    library: [],
    music_count: 0,
    shows_count: 0,
    seen_count: 0
}

export function startOfDay(ms: number): number {
    const date = new Date(ms)
    date.setHours(0, 0, 0, 0)
    return date.getTime()
}

/** Whole calendar days between a moment and now; rounded, so a DST day still counts as one. */
export function daysAgo(time: number, now = Date.now()): number {
    return Math.round((startOfDay(now) - startOfDay(time)) / DAY)
}

// Spotify dates an album as midnight UTC; that is a calendar date, not a
// moment, so it is read in the person's own zone (a Friday release stays
// Friday west of Greenwich). An episode carries the moment it went out.
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})T00:00:00(?:\.000)?Z$/

export function releaseTime(iso: string | null | undefined): number | null {
    if (!iso) return null
    const dated = DATE_ONLY.exec(iso)
    if (dated) return new Date(Number(dated[1]), Number(dated[2]) - 1, Number(dated[3])).getTime()
    const time = Date.parse(iso)
    return Number.isFinite(time) ? time : null
}

/** The oldest moment a sync keeps: KEEP_DAYS calendar days, today included. */
export function keepSince(now = Date.now()): number {
    return startOfDay(now) - (KEEP_DAYS - 1) * DAY
}

export function kindOf(type: ReleaseType): ReleaseKind {
    if (type === 'ALBUM') return 'album'
    if (type === 'COMPILATION') return 'compilation'
    if (type === 'EPISODE') return 'episode'
    return 'single'
}

export function typeLabel(type: ReleaseType): string {
    if (type === 'EP') return 'EP'
    return type.charAt(0) + type.slice(1).toLowerCase()
}

export const KIND_LABEL: Record<ReleaseKind, string> = {
    album: 'Albums',
    single: 'Singles & EPs',
    compilation: 'Compilations',
    episode: 'Episodes'
}

const KIND_ORDER: ReleaseKind[] = ['album', 'single', 'compilation', 'episode']

/** "12 tracks" or "48 min"; empty when unknown. */
export function releaseMeta(release: Release): string {
    if (release.type === 'EPISODE') {
        if (!release.durationMs) return ''
        const minutes = Math.max(1, Math.round(release.durationMs / 60_000))
        return `${minutes} min`
    }
    if (!release.trackCount) return ''
    return `${release.trackCount} track${release.trackCount === 1 ? '' : 's'}`
}

/** "spotify:album:abc" → "/album/abc", the path Spotify's router takes. */
export function spotifyPath(uri: string): string {
    const [type, id] = uri.split(':').slice(-2)
    return `/${type}/${id}`
}

/**
 * How old a release is, for a row: an episode by the clock ("3h ago"), a dated
 * release by the calendar ("today", "2d ago"), since Spotify dates it at
 * midnight and the hours since then say nothing.
 */
export function releaseAge(release: Release, now = Date.now()): string {
    if (release.type === 'EPISODE') return timeAgo(release.time, now) ?? ''
    const days = daysAgo(release.time, now)
    if (days <= 0) return 'today'
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    if (days < 365) return `${Math.floor(days / 30)}mo ago`
    return `${Math.floor(days / 365)}y ago`
}

export function withinRange(time: number, range: Range, now = Date.now()): boolean {
    return daysAgo(time, now) < RANGE_DAYS[range]
}

function kindAllowed(release: Release, filters: Filter): boolean {
    const kind = kindOf(release.type)
    if (kind === 'album') return filters.albums
    if (kind === 'single') return filters.singles
    if (kind === 'compilation') return filters.compilations
    return true
}

function matches(release: Release, query: string): boolean {
    return (
        release.title.toLowerCase().includes(query) ||
        release.artist.name.toLowerCase().includes(query)
    )
}

export function newestFirst(a: Release, b: Release): number {
    return b.time - a.time || a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
}

function listed(state: ReleasesState): Release[] {
    if (state.scope === 'music') return state.music
    if (state.scope === 'podcasts') return state.shows
    return [...state.music, ...state.shows]
}

/** What the dialog shows: the scope's releases in range, of the kinds kept, not dismissed, matching the search. Newest first. */
export function visibleReleases(
    state: ReleasesState,
    { query = '', now = Date.now() }: { query?: string; now?: number } = {}
): Release[] {
    const hidden = new Set(state.dismissed.map((entry) => entry.uri))
    const needle = query.trim().toLowerCase()
    return listed(state)
        .filter(
            (release) =>
                withinRange(release.time, state.range, now) &&
                !hidden.has(release.uri) &&
                kindAllowed(release, state.filters) &&
                (!needle || matches(release, needle))
        )
        .sort(newestFirst)
}

/** How many of the dismissed are among the releases on hand, so "Restore" can say. */
export function dismissedOnHand(state: ReleasesState, now = Date.now()): number {
    const hidden = new Set(state.dismissed.map((entry) => entry.uri))
    return listed(state).filter(
        (release) =>
            hidden.has(release.uri) &&
            withinRange(release.time, state.range, now) &&
            kindAllowed(release, state.filters)
    ).length
}

/** The badge's counts: releases in view per list, zero for a list the scope leaves out. */
export function scopeCounts(
    state: ReleasesState,
    now = Date.now()
): Pick<ReleasesState, 'music_count' | 'shows_count'> {
    const count = (scope: Scope) => visibleReleases({ ...state, scope }, { now }).length
    return {
        music_count: state.scope === 'podcasts' ? 0 : count('music'),
        shows_count: state.scope === 'music' ? 0 : count('podcasts')
    }
}

function dayKey(time: number): string {
    const date = new Date(time)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${date.getFullYear()}-${month}-${day}`
}

/** "Today", "Yesterday", a weekday within the week, then "Fri, Oct 24" (with the year once it differs). */
export function dayLabel(time: number, now = Date.now()): string {
    const ago = daysAgo(time, now)
    if (ago === 0) return 'Today'
    if (ago === 1) return 'Yesterday'
    if (ago > 1 && ago < 7) {
        return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(time)
    }
    const sameYear = new Date(time).getFullYear() === new Date(now).getFullYear()
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        ...(sameYear ? {} : { year: 'numeric' })
    }).format(time)
}

export function groupReleases(
    items: Release[],
    group_by: GroupBy,
    now = Date.now()
): ReleaseGroup[] {
    const sorted = [...items].sort(newestFirst)
    const groups = new Map<string, ReleaseGroup>()
    const keyOf = (release: Release): [string, string] => {
        if (group_by === 'artist') return [release.artist.uri, release.artist.name]
        if (group_by === 'type') {
            const kind = kindOf(release.type)
            return [kind, KIND_LABEL[kind]]
        }
        return [dayKey(release.time), dayLabel(release.time, now)]
    }
    for (const release of sorted) {
        const [key, label] = keyOf(release)
        const group = groups.get(key)
        if (group) group.items.push(release)
        else groups.set(key, { key, label, items: [release] })
    }
    const list = Array.from(groups.values())
    if (group_by === 'artist') {
        list.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
    } else if (group_by === 'type') {
        list.sort(
            (a, b) =>
                KIND_ORDER.indexOf(a.key as ReleaseKind) - KIND_ORDER.indexOf(b.key as ReleaseKind)
        )
    }
    // By date the groups are already newest first, as the items were.
    return list
}

export function isStale(updated_at: string | null | undefined, now = Date.now()): boolean {
    if (!updated_at) return true
    const at = Date.parse(updated_at)
    return !Number.isFinite(at) || now - at > STALE_MS
}

/** When the scope's lists were last synced: the older of the two for All, none while one is missing. */
export function lastSynced(state: ReleasesState): number | null {
    const music = state.music_updated_at ? Date.parse(state.music_updated_at) : null
    const shows = state.shows_updated_at ? Date.parse(state.shows_updated_at) : null
    if (state.scope === 'music') return music
    if (state.scope === 'podcasts') return shows
    if (music == null || shows == null) return null
    return Math.min(music, shows)
}

/** Drop entries older than the sync window; a dismissal or save outlives the release it was for otherwise. */
export function pruneStamped(list: Stamped[], now = Date.now()): Stamped[] {
    const since = now - KEEP_DAYS * DAY
    return list.filter((entry) => {
        const at = Date.parse(entry.created_at)
        return Number.isFinite(at) && at > since
    })
}

export function stamp(uri: string, now = Date.now()): Stamped {
    return { uri, created_at: new Date(now).toISOString() }
}

const TYPES: ReleaseType[] = ['ALBUM', 'SINGLE', 'EP', 'COMPILATION', 'EPISODE']

export function isRelease(value: unknown): value is Release {
    const item = value as Partial<Release> | null
    return (
        !!item &&
        typeof item.uri === 'string' &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.time === 'number' &&
        TYPES.includes(item.type as ReleaseType) &&
        typeof item.artist?.name === 'string' &&
        typeof item.artist?.uri === 'string'
    )
}

function stampedList(value: unknown): Stamped[] {
    if (!Array.isArray(value)) return []
    return value.filter(
        (entry): entry is Stamped =>
            !!entry && typeof entry.uri === 'string' && typeof entry.created_at === 'string'
    )
}

/**
 * Read a saved state, including the shape from before the dialog (release_type,
 * music_data …). Settings, dismissals and saves carry over; release lists in
 * the old shape are dropped and fetched again.
 */
export function migrateReleasesState(saved: unknown): ReleasesState {
    const old = (saved ?? {}) as Record<string, unknown>
    const scopes: Scope[] = ['music', 'podcasts', 'all']
    const ranges: Range[] = ['today', 'yesterday', 'week', 'month']
    const groupings: GroupBy[] = ['date', 'artist', 'type']
    const legacyScope =
        old.release_type === 'shows&podcasts'
            ? 'podcasts'
            : old.release_type === 'all'
              ? 'all'
              : undefined
    const scope = scopes.includes(old.scope as Scope) ? (old.scope as Scope) : legacyScope
    const filters = (old.filters ?? {}) as Partial<Filter>
    const releases = (value: unknown) => (Array.isArray(value) ? value.filter(isRelease) : [])
    const text = (value: unknown) => (typeof value === 'string' ? value : null)
    const count = (value: unknown) => (typeof value === 'number' && value >= 0 ? value : 0)
    return {
        scope: scope ?? defaultReleasesState.scope,
        range: ranges.includes(old.range as Range)
            ? (old.range as Range)
            : defaultReleasesState.range,
        group_by: groupings.includes(old.group_by as GroupBy)
            ? (old.group_by as GroupBy)
            : defaultReleasesState.group_by,
        filters: {
            albums: filters.albums ?? true,
            singles: filters.singles ?? true,
            compilations: filters.compilations ?? true
        },
        music: releases(old.music),
        shows: releases(old.shows),
        music_updated_at: Array.isArray(old.music) ? text(old.music_updated_at) : null,
        shows_updated_at: Array.isArray(old.shows) ? text(old.shows_updated_at) : null,
        dismissed: stampedList(old.dismissed),
        library: stampedList(old.library),
        music_count: count(old.music_count),
        shows_count: count(old.shows_count),
        seen_count: count(old.seen_count)
    }
}

/** Map with at most `limit` calls in flight; results keep the input order. */
export async function mapPool<T, R>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<R>
): Promise<R[]> {
    const results: R[] = new Array(items.length)
    let next = 0
    async function worker() {
        while (next < items.length) {
            const index = next++
            results[index] = await fn(items[index])
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
    return results
}
