import { setOptions, request } from '../request'
import { defineProxyService } from '@webext-core/proxy-service'

const API_URL = 'https://api-partner.spotify.com/pathfinder/v2/query'

export interface TrackService {
    checkIfTracksInCollection(ids: string): Promise<boolean[]>
    getTrackIdFromAlbumId({
        albumId,
        songId
    }: {
        albumId: string
        songId: string
    }): Promise<string | null>
    updateLikedTracks({ ids, action }: { ids: string; action: 'add' | 'remove' }): Promise<void>
}

export class TrackService implements TrackService {
    async getTrackIdFromAlbumId({ albumId, songId }: { albumId: string; songId: string }) {
        const body = {
            variables: {
                uri: `spotify:album:${albumId}`,
                locale: '',
                offset: 0,
                limit: 50
            },
            operationName: 'getAlbum',
            extensions: {
                persistedQuery: {
                    version: 1,
                    sha256Hash: '97dd13a1f28c80d66115a13697a7ffd94fe3bebdb94da42159456e1d82bfee76'
                }
            }
        }
        const options = await setOptions({ method: 'POST', body })
        if (!options) throw new Error('No options found')

        try {
            const response = (await request({ url: API_URL, options })) as any
            const foundTrack = response.data.albumUnion.tracksV2.items.find((track: any) => {
                const trackInfo = track.track
                const artists = trackInfo.artists.items
                    .map((artist: any) => artist.name ?? artist.profile.name)
                    .join(',')
                const songTitle = `${trackInfo.name} by ${artists}`
                return songTitle == songId
            })
            return (
                foundTrack?.uri?.split(':')?.pop() ??
                foundTrack?.track?.uri?.split(':')?.pop() ??
                null
            )
        } catch (error: any) {
            console.error(error)
            return null
        }
    }

    // !! method must be either PUT or DELETE !!
    async updateLikedTracks({ ids, action }: { ids: string; action: 'add' | 'remove' }) {
        const body = {
            variables: { uris: ids.split(',').map((id) => `spotify:track:${id}`) },
            operationName: action === 'add' ? 'addToLibrary' : 'removeFromLibrary',
            extensions: {
                persistedQuery: {
                    version: 1,
                    sha256Hash: 'a3c1ff58e6a36fec5fe1e3a193dc95d9071d96b9ba53c5ba9c1494fb1ee73915'
                }
            }
        }

        const options = await setOptions({ method: 'POST', body })
        if (!options) throw new Error('No options found')

        try {
            return await request({ url: API_URL, options })
        } catch (error) {
            console.error(error)
            return null
        }
    }

    // ids must be comma-separated of spotify ids. Ex. ids=jksfdlkjd,jfdklkfdsj,lsuouw
    async checkIfTracksInCollection(ids: string) {
        const body = {
            variables: {
                uris: ids.split(',').map((id) => `spotify:track:${id}`)
            },
            operationName: 'isCurated',
            extensions: {
                persistedQuery: {
                    version: 1,
                    sha256Hash: 'e4ed1f91a2cc5415befedb85acf8671dc1a4bf3ca1a5b945a6386101a22e28a6'
                }
            }
        }

        const options = await setOptions({ method: 'POST', body })
        if (!options) throw new Error('No options found')

        try {
            const response = (await request({ url: API_URL, options })) as any
            return response.data.lookup.map((item: any) => item.data.isCurated)
        } catch (error) {
            console.error(error)
            return null
        }
    }
}

export const [registerTrackService, getTrackService] = defineProxyService(
    'TrackService',
    () => new TrackService()
)
