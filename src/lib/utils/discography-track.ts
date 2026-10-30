import { discographyStore } from '$lib/stores/discography'
import { getDiscographyService } from '$lib/api/services/discography'
import { getTrackService } from '$lib/api/services/track'

/**
 * Start tracking an artist's whole discography: list every release, then
 * store them with their track counts. False when Spotify did not answer, in
 * which case nothing changes.
 */
export async function trackDiscography(artist: { id: string; name: string }): Promise<boolean> {
    const listing = await getDiscographyService()
        .getArtistDiscography(artist.id)
        .catch(() => null)
    if (!listing) return false
    await discographyStore.trackArtist(
        { id: artist.id, name: artist.name || listing.name },
        listing.releases
    )
    return true
}

/**
 * Start tracking one release on its own. Its track list is fetched now so
 * the denominator is right straight away; if that fails the release is still
 * tracked and the list comes with the first play.
 */
export async function trackOneAlbum(
    artist: { id: string; name: string },
    album: { id: string; name?: string | null; cover?: string | null }
): Promise<void> {
    const fetched = await getTrackService()
        .getAlbumTracks(album.id)
        .catch(() => null)
    await discographyStore.trackAlbum(artist, {
        id: album.id,
        name: fetched?.name || album.name || 'Album',
        year: fetched?.year ?? null,
        cover: fetched?.cover ?? album.cover ?? null,
        kind: fetched?.kind,
        type: fetched?.type,
        total: fetched?.tracks.length || undefined,
        tracks: fetched?.tracks ?? []
    })
}
