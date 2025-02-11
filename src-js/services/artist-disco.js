import { request, setOptions } from '../utils/request.js'

const BASE_PATH = 'https://api.spotify.com/v1'

const generateURL = ({ pathType, param }) => {
    const pathName = {
        me: `/me/playlists`,
        albums: '/albums?ids=param',
        tracks: `/playlists/param/tracks`,
        artists: '/artists/param/albums?include_groups=album,single&limit=50'
    }

    if (!param) return `${BASE_PATH}${pathName[pathType]}`

    return `${BASE_PATH}${pathName[pathType].replace('param', param)}`
}

async function fetchArtistAlbumIds(artist_id) {
    const albumIds = []
    let url = generateURL({ pathType: 'artists', param: artist_id })

    while (url) {
        const options = await setOptions({})
        let result = await request({ url, options })
        result.items.forEach((item) => albumIds.push(item.id))
        url = result.next
    }

    return albumIds
}

async function fetchTrackURIs(albumIds) {
    const trackURIs = []
    const groupSize = 20 // Max. num of albums fetched at a time

    for (let group = 0; group <= albumIds.length / 20; group++) {
        const albumIdsGroup = albumIds.slice(group * groupSize, (group + 1) * groupSize)
        const url = generateURL({ pathType: 'albums', param: albumIdsGroup.join(',') })
        const options = await setOptions({})
        const albumInfo = await request({ url, options })
        const albumGroupsTracks = albumInfo?.albums
            ?.map((album) => album?.tracks ?? null)
            .filter(Boolean)

        for (const album of albumGroupsTracks) {
            album.items.forEach(({ uri }) => trackURIs.push(uri))
            let next = album.next

            while (next) {
                const options = await setOptions({})
                const tracks = request({ url: next, options })
                next = tracks.next
                tracks?.items?.forEach(({ uri }) => trackURIs.push(uri))
            }
        }
    }

    return trackURIs
}

async function createPlaylist(name) {
    const url = generateURL({ pathType: 'me' })
    const options = await setOptions({ method: 'POST', body: { name, public: false } })
    const playlist = await request({ url, options })
    return { id: playlist.id, url: playlist.external_urls.spotify }
}

async function addTracksToPlaylist({ playlist, trackURIs }) {
    const groupSize = 100 // Max. num of tracks uploaded at a time

    for (let group = 0; group < trackURIs.length / groupSize; group++) {
        const trackURIsGroup = trackURIs.slice(group * 100, (group + 1) * 100)
        const url = generateURL({ pathType: 'tracks', param: playlist.id })
        const options = await setOptions({ method: 'POST', body: { uris: trackURIsGroup } })
        await request({ url, options })
    }
}

async function createArtistDiscoPlaylist({ artist_name, artist_id }) {
    return new Promise(async (resolve, reject) => {
        try {
            const albumsIds = await fetchArtistAlbumIds(artist_id)
            const trackURIs = await fetchTrackURIs(albumsIds)
            const playlist = await createPlaylist(artist_name)
            await addTracksToPlaylist({ playlist, trackURIs })
            resolve({ artist_name, playlist })
        } catch (error) {
            console.error(error)
            reject(error)
        }
    })
}

export { createArtistDiscoPlaylist }
