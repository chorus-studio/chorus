/**
 * Progress through an artist's discography: which tracks of which albums have
 * been heard, and where to pick up. Pure; the store persists it and the
 * watcher feeds it from the now-playing bar.
 */
export type AlbumTrack = { id: string; name: string }

export type AlbumProgress = {
    id: string
    name: string
    year?: string | null
    cover?: string | null
    tracks: AlbumTrack[]
    /** Track ids heard, in the order first heard. */
    heard: string[]
    updated_at: number
}

export type ArtistProgress = {
    id: string
    name: string
    albums: Record<string, AlbumProgress>
    /** The track playing when the artist was last heard. */
    last: { album_id: string; track_id: string; track_name: string } | null
    updated_at: number
}

export type DiscographyState = Record<string, ArtistProgress>

export type Play = {
    artist: { id: string; name: string }
    album: {
        id: string
        name: string
        year?: string | null
        cover?: string | null
        tracks: AlbumTrack[]
    }
    track: { id: string; name: string }
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

export type AlbumSummary = { heard: number; total: number; done: boolean }

export function albumSummary(album: AlbumProgress): AlbumSummary {
    const total = album.tracks.length
    const known = new Set(album.tracks.map((t) => t.id))
    const heard = total ? album.heard.filter((id) => known.has(id)).length : album.heard.length
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

export function artistSummary(artist: ArtistProgress): ArtistSummary {
    const albums = Object.values(artist.albums)
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

/** Albums newest first by year, then by name. */
export function sortedAlbums(artist: ArtistProgress): AlbumProgress[] {
    return Object.values(artist.albums).sort(
        (a, b) =>
            String(b.year ?? '').localeCompare(String(a.year ?? '')) || a.name.localeCompare(b.name)
    )
}

/** The first track of an album not heard yet; its first track when all are. */
export function nextUnheard(album: AlbumProgress): AlbumTrack | null {
    const heard = new Set(album.heard)
    return album.tracks.find((t) => !heard.has(t.id)) ?? album.tracks[0] ?? null
}

/**
 * Where to pick up: the last track heard while its album still has unheard
 * tracks, otherwise the first unheard track of the next unfinished album.
 */
export function resumeTarget(
    artist: ArtistProgress
): { album_id: string; track_id: string } | null {
    if (artist.last) {
        const album = artist.albums[artist.last.album_id]
        if (album && !albumSummary(album).done)
            return { album_id: album.id, track_id: artist.last.track_id }
    }
    for (const album of sortedAlbums(artist)) {
        if (albumSummary(album).done) continue
        const track = nextUnheard(album)
        if (track) return { album_id: album.id, track_id: track.id }
    }
    return null
}

/** Artists most recently heard first. */
export function sortedArtists(state: DiscographyState): ArtistProgress[] {
    return Object.values(state).sort((a, b) => b.updated_at - a.updated_at)
}
