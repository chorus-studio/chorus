/**
 * Progress through an artist's discography: which tracks of which releases
 * have been heard, and where to pick up. Pure; the store persists it, the
 * watcher feeds it from the now-playing bar, and the page buttons and the
 * dialog decide what is tracked.
 *
 * An artist is tracked one of three ways:
 *  - `discography`: the artist page's button listed every release, so the
 *    denominators are the real discography, cut by the counting filters;
 *  - `albums`: only the releases tracked on their own, from the album page;
 *  - `heard`: nothing was chosen, the entry came from auto-tracking what
 *    played (or from before tracking was opt-in).
 */
export type ReleaseKind = 'album' | 'single' | 'compilation'
export type AlbumTrack = { id: string; name: string }

export type AlbumProgress = {
    id: string
    name: string
    year?: string | null
    cover?: string | null
    /** How Spotify lists it; entries learnt from the bar have none and count as albums. */
    kind?: ReleaseKind
    /** Track count from the listing, the denominator until the track list is fetched. */
    total?: number
    tracks: AlbumTrack[]
    /** Track ids heard, in the order first heard. */
    heard: string[]
    /** Tracked on its own, from the album page. */
    tracked?: boolean
    updated_at: number
}

export type ArtistProgress = {
    id: string
    name: string
    albums: Record<string, AlbumProgress>
    /** The track playing when the artist was last heard. */
    last: { album_id: string; track_id: string; track_name: string } | null
    /** The whole discography is tracked, from the artist page. */
    tracked?: boolean
    /** When the discography was last listed; null when never. */
    listed_at?: number | null
    updated_at: number
}

export type DiscographyState = Record<string, ArtistProgress>

/** Which release kinds count towards progress, and whether variant editions are hidden. */
export type Filters = {
    albums: boolean
    singles: boolean
    compilations: boolean
    /** Hide remixes, live, deluxe and other editions by name (a heuristic). */
    hide_variants: boolean
}

export type DiscographyPrefs = {
    filters: Filters
    /** Note every artist played, not only the tracked ones. */
    auto_track: boolean
}

export const defaultFilters: Filters = {
    albums: true,
    singles: false,
    compilations: false,
    hide_variants: false
}

export const defaultPrefs: DiscographyPrefs = { filters: defaultFilters, auto_track: false }

export type Scope = 'discography' | 'albums' | 'heard'

/** A release as the discography listing describes it. */
export type Listed = {
    id: string
    name: string
    year: string | null
    cover: string | null
    kind: ReleaseKind
    total: number
}

export type Play = {
    artist: { id: string; name: string }
    album: {
        id: string
        name: string
        year?: string | null
        cover?: string | null
        kind?: ReleaseKind
        total?: number
        tracks: AlbumTrack[]
    }
    track: { id: string; name: string }
}

/** Spotify's release types folded into the three kinds that are counted; EPs count as singles. */
export function kindOf(type: string | null | undefined): ReleaseKind {
    switch (String(type ?? '').toUpperCase()) {
        case 'SINGLE':
        case 'EP':
            return 'single'
        case 'COMPILATION':
            return 'compilation'
        default:
            return 'album'
    }
}

/**
 * A variant edition by name: a remix, live, deluxe, anniversary or bonus
 * edition after a bracket, dash or colon ("Rose in the Dark (Deluxe)",
 * "Tyrone - Remix"), or a title that ends in one ("Sunshine Remixes"). Plain
 * titles that merely contain such a word ("Live Through This") are not.
 */
const VARIANT_QUALIFIER =
    /[([\-–—:][^)\]]*\b(remix(?:es|ed)?|live|deluxe|expanded|anniversary|edition|instrumentals?|acoustic|commentary|karaoke|bonus\s+tracks?|sped\s+up|slowed)\b/i
const VARIANT_TAIL = /\S\s+(remixes|remixed|deluxe)$/i

export function isVariant(name: string): boolean {
    return VARIANT_QUALIFIER.test(name) || VARIANT_TAIL.test(name)
}

export function scopeOf(artist: ArtistProgress): Scope {
    if (artist.tracked) return 'discography'
    if (Object.values(artist.albums).some((album) => album.tracked)) return 'albums'
    return 'heard'
}

/** Whether a release of this kind and name is counted under the filters. */
export function passesFilters(
    album: Pick<AlbumProgress, 'kind' | 'name'>,
    filters: Filters
): boolean {
    const kind = album.kind ?? 'album'
    if (kind === 'album' && !filters.albums) return false
    if (kind === 'single' && !filters.singles) return false
    if (kind === 'compilation' && !filters.compilations) return false
    if (filters.hide_variants && isVariant(album.name)) return false
    return true
}

/**
 * Whether an album counts towards its artist's progress: a release tracked
 * on its own always does; an artist tracked album by album counts nothing
 * else; otherwise the filters decide.
 */
export function counts(album: AlbumProgress, artist: ArtistProgress, filters: Filters): boolean {
    if (album.tracked) return true
    if (scopeOf(artist) === 'albums') return false
    return passesFilters(album, filters)
}

/** The counted albums, newest first. */
export function countedAlbums(artist: ArtistProgress, filters: Filters): AlbumProgress[] {
    return sortedAlbums(artist).filter((album) => counts(album, artist, filters))
}

/** Note a track heard: the album is added on first sight, the track counted once, the place kept. */
export function recordPlay(
    state: DiscographyState,
    play: Play,
    now = Date.now()
): DiscographyState {
    const artist = state[play.artist.id] ?? {
        id: play.artist.id,
        name: play.artist.name,
        albums: {},
        last: null,
        updated_at: now
    }
    const album: AlbumProgress = artist.albums[play.album.id] ?? {
        id: play.album.id,
        name: play.album.name,
        year: play.album.year ?? null,
        cover: play.album.cover ?? null,
        ...(play.album.kind && { kind: play.album.kind }),
        ...(play.album.total && { total: play.album.total }),
        tracks: play.album.tracks,
        heard: [],
        updated_at: now
    }
    const heard = album.heard.includes(play.track.id)
        ? album.heard
        : [...album.heard, play.track.id]
    const tracks = album.tracks.length ? album.tracks : play.album.tracks
    const cover = album.cover ?? play.album.cover ?? null
    return {
        ...state,
        [artist.id]: {
            ...artist,
            name: play.artist.name || artist.name,
            albums: {
                ...artist.albums,
                [album.id]: { ...album, tracks, cover, heard, updated_at: now }
            },
            last: { album_id: album.id, track_id: play.track.id, track_name: play.track.name },
            updated_at: now
        }
    }
}

/**
 * Whether a play should be noted at all: always under auto-track, otherwise
 * only for a tracked discography or a release tracked on its own.
 */
export function shouldRecord(
    state: DiscographyState,
    prefs: Pick<DiscographyPrefs, 'auto_track'>,
    artist_id: string,
    album_id: string
): boolean {
    if (prefs.auto_track) return true
    const artist = state[artist_id]
    if (!artist) return false
    if (artist.tracked) return true
    return Boolean(artist.albums[album_id]?.tracked)
}

/**
 * Track an artist's whole discography from its listing. Releases already
 * known keep what was heard and any track list fetched; the listing brings
 * the kind, cover and track count. Listing again refreshes the same way.
 */
export function trackArtist(
    state: DiscographyState,
    artist: { id: string; name: string },
    listed: Listed[],
    now = Date.now()
): DiscographyState {
    const prev = state[artist.id]
    const albums: Record<string, AlbumProgress> = { ...(prev?.albums ?? {}) }
    for (const release of listed) {
        const old = albums[release.id]
        albums[release.id] = {
            id: release.id,
            name: release.name || old?.name || 'Release',
            year: release.year ?? old?.year ?? null,
            cover: release.cover ?? old?.cover ?? null,
            kind: release.kind,
            total: release.total,
            tracks: old?.tracks ?? [],
            heard: old?.heard ?? [],
            ...(old?.tracked && { tracked: true }),
            updated_at: old?.updated_at ?? now
        }
    }
    return {
        ...state,
        [artist.id]: {
            id: artist.id,
            name: artist.name || prev?.name || 'Artist',
            albums,
            last: prev?.last ?? null,
            tracked: true,
            listed_at: now,
            updated_at: now
        }
    }
}

/** Stop tracking an artist: the entry and everything heard under it goes. */
export function untrackArtist(state: DiscographyState, artist_id: string): DiscographyState {
    if (!(artist_id in state)) return state
    const next = { ...state }
    delete next[artist_id]
    return next
}

/** Track one release on its own. The artist entry is made if needed, without tracking the rest. */
export function trackAlbum(
    state: DiscographyState,
    artist: { id: string; name: string },
    album: Omit<Listed, 'kind' | 'total'> & Partial<Pick<Listed, 'kind' | 'total'>> & {
        tracks?: AlbumTrack[]
    },
    now = Date.now()
): DiscographyState {
    const prev = state[artist.id] ?? {
        id: artist.id,
        name: artist.name,
        albums: {},
        last: null,
        updated_at: now
    }
    const old = prev.albums[album.id]
    return {
        ...state,
        [artist.id]: {
            ...prev,
            name: artist.name || prev.name,
            albums: {
                ...prev.albums,
                [album.id]: {
                    id: album.id,
                    name: album.name || old?.name || 'Release',
                    year: album.year ?? old?.year ?? null,
                    cover: album.cover ?? old?.cover ?? null,
                    ...((album.kind ?? old?.kind) && { kind: album.kind ?? old?.kind }),
                    ...((album.total ?? old?.total) && { total: album.total ?? old?.total }),
                    tracks: album.tracks?.length ? album.tracks : (old?.tracks ?? []),
                    heard: old?.heard ?? [],
                    tracked: true,
                    updated_at: old?.updated_at ?? now
                }
            },
            updated_at: now
        }
    }
}

/**
 * Stop tracking one release. Under a tracked discography it merely stops
 * being pinned; otherwise it is dropped, and so is the artist once nothing
 * is left.
 */
export function untrackAlbum(
    state: DiscographyState,
    artist_id: string,
    album_id: string
): DiscographyState {
    const artist = state[artist_id]
    const album = artist?.albums[album_id]
    if (!artist || !album) return state
    if (artist.tracked) {
        const { tracked: _tracked, ...rest } = album
        return { ...state, [artist_id]: { ...artist, albums: { ...artist.albums, [album_id]: rest } } }
    }
    const albums = { ...artist.albums }
    delete albums[album_id]
    if (Object.keys(albums).length === 0) return untrackArtist(state, artist_id)
    const last = artist.last?.album_id === album_id ? null : artist.last
    return { ...state, [artist_id]: { ...artist, albums, last } }
}

export type AlbumSummary = { heard: number; total: number; done: boolean }

/** Heard against the track list when it is known, else against the listed count. */
export function albumSummary(album: AlbumProgress): AlbumSummary {
    if (album.tracks.length) {
        const total = album.tracks.length
        const known = new Set(album.tracks.map((t) => t.id))
        const heard = album.heard.filter((id) => known.has(id)).length
        return { heard, total, done: heard >= total }
    }
    const total = album.total ?? 0
    const heard = total ? Math.min(album.heard.length, total) : album.heard.length
    return { heard, total, done: total > 0 && heard >= total }
}

export type ArtistSummary = {
    albums: number
    albumsDone: number
    tracksHeard: number
    tracksTotal: number
    /** 0..1 of the known tracks heard. */
    fraction: number
}

export function artistSummary(
    artist: ArtistProgress,
    filters: Filters = defaultFilters
): ArtistSummary {
    const albums = countedAlbums(artist, filters)
    let albumsDone = 0
    let tracksHeard = 0
    let tracksTotal = 0
    for (const album of albums) {
        const s = albumSummary(album)
        if (s.done) albumsDone++
        tracksHeard += s.heard
        tracksTotal += s.total
    }
    return {
        albums: albums.length,
        albumsDone,
        tracksHeard,
        tracksTotal,
        fraction: tracksTotal ? Math.min(1, tracksHeard / tracksTotal) : 0
    }
}

/** Albums newest first by year, then by name; only the counted ones when filters are given. */
export function sortedAlbums(artist: ArtistProgress, filters?: Filters): AlbumProgress[] {
    const albums = Object.values(artist.albums).sort(
        (a, b) =>
            String(b.year ?? '').localeCompare(String(a.year ?? '')) || a.name.localeCompare(b.name)
    )
    return filters ? albums.filter((album) => counts(album, artist, filters)) : albums
}

/** The first track of an album not heard yet; its first track when all are; null without a track list. */
export function nextUnheard(album: AlbumProgress): AlbumTrack | null {
    const heard = new Set(album.heard)
    return album.tracks.find((t) => !heard.has(t.id)) ?? album.tracks[0] ?? null
}

/**
 * Where to pick up: the last track heard while its counted album still has
 * unheard tracks, otherwise the next unheard track of the next unfinished
 * counted album (its start when the track list is not known yet).
 */
export function resumeTarget(
    artist: ArtistProgress,
    filters: Filters = defaultFilters
): { album_id: string; track_id: string | null } | null {
    const counted = countedAlbums(artist, filters)
    if (artist.last) {
        const album = counted.find((a) => a.id === artist.last?.album_id)
        if (album && !albumSummary(album).done)
            return { album_id: album.id, track_id: artist.last.track_id }
    }
    for (const album of counted) {
        if (albumSummary(album).done) continue
        return { album_id: album.id, track_id: nextUnheard(album)?.id ?? null }
    }
    return null
}

/** The last track heard and its album, when that album still counts. */
export function lastHeard(
    artist: ArtistProgress,
    filters: Filters = defaultFilters
): { track_name: string; album_name: string } | null {
    if (!artist.last) return null
    const album = artist.albums[artist.last.album_id]
    if (!album || !counts(album, artist, filters)) return null
    return { track_name: artist.last.track_name, album_name: album.name }
}

/** Artists most recently heard or tracked first. */
export function sortedArtists(state: DiscographyState): ArtistProgress[] {
    return Object.values(state).sort((a, b) => b.updated_at - a.updated_at)
}

/** Saved preferences from any earlier shape, filled from the defaults. */
export function migratePrefs(saved: unknown): DiscographyPrefs {
    const s = (saved ?? {}) as Partial<DiscographyPrefs>
    const f = (s.filters ?? {}) as Partial<Filters>
    return {
        filters: {
            albums: typeof f.albums === 'boolean' ? f.albums : defaultFilters.albums,
            singles: typeof f.singles === 'boolean' ? f.singles : defaultFilters.singles,
            compilations:
                typeof f.compilations === 'boolean' ? f.compilations : defaultFilters.compilations,
            hide_variants:
                typeof f.hide_variants === 'boolean' ? f.hide_variants : defaultFilters.hide_variants
        },
        auto_track: typeof s.auto_track === 'boolean' ? s.auto_track : defaultPrefs.auto_track
    }
}
