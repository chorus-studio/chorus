import { nowPlaying } from '$lib/stores/now-playing'
import { discographyPrefs, discographyStore } from '$lib/stores/discography'
import { getTrackService } from '$lib/api/services/track'
import { shouldRecord } from '$lib/utils/discography'

/** The first artist the now-playing bar links to, if any. */
export function artistFromBar(root: ParentNode = document): { id: string; name: string } | null {
    const anchor = root.querySelector<HTMLAnchorElement>(
        '[data-testid="now-playing-widget-v2"] a[href*="/artist/"]'
    )
    const match = /\/artist\/([A-Za-z0-9]+)/.exec(anchor?.getAttribute('href') ?? '')
    return match ? { id: match[1], name: (anchor?.textContent ?? '').trim() } : null
}

/** The album the now-playing bar links to (its cover or title), if any. */
export function albumIdFromBar(root: ParentNode = document): string | null {
    const anchor = root.querySelector<HTMLAnchorElement>(
        '[data-testid="now-playing-widget-v2"] a[href*="/album/"]'
    )
    const match = /\/album\/([A-Za-z0-9]+)/.exec(anchor?.getAttribute('href') ?? '')
    return match ? match[1] : null
}

/**
 * Attribute each track played to its album and artist, so the Discographies
 * dialog can show how far through each artist's albums the person is and
 * where to pick up. Only tracked discographies and albums are noted, unless
 * auto-track is on. The album's track list is fetched once per album.
 * Returns the unsubscribe.
 */
export function watchDiscography(): () => void {
    let lastTrack: string | null = null

    async function run(track_id: string, title: string | null, cover: string | null) {
        const artist = artistFromBar()
        const album_id = albumIdFromBar()
        if (!artist || !album_id) return
        if (!shouldRecord(discographyStore.get(), discographyPrefs.get(), artist.id, album_id))
            return
        const known = discographyStore.get()[artist.id]?.albums[album_id]
        let album = known
            ? {
                  id: known.id,
                  name: known.name,
                  year: known.year,
                  cover: known.cover,
                  kind: known.kind,
                  total: known.total,
                  tracks: known.tracks
              }
            : null
        if (!album || album.tracks.length === 0) {
            const fetched = await getTrackService()
                .getAlbumTracks(album_id)
                .catch(() => null)
            album = {
                id: album_id,
                name: fetched?.name ?? album?.name ?? 'Album',
                year: fetched?.year ?? album?.year ?? null,
                cover: album?.cover ?? fetched?.cover ?? cover ?? null,
                kind: album?.kind ?? fetched?.kind,
                total: album?.total,
                tracks: fetched?.tracks ?? album?.tracks ?? []
            }
        }
        await discographyStore.record({
            artist: { id: artist.id, name: artist.name },
            album,
            track: { id: track_id, name: title ?? '' }
        })
    }

    return nowPlaying.subscribe((state) => {
        if (!state.track_id || state.track_id === lastTrack) return
        lastTrack = state.track_id
        const { track_id, title, cover } = state
        // The bar's links settle a beat after the store does.
        setTimeout(() => void run(track_id, title, cover), 200)
    })
}
