import { setOptions, request } from '../request'
import { defineProxyService } from '@webext-core/proxy-service'

const ALBUM_URL = 'https://api.spotify.com/v1/albums'
const TRACK_URL = 'https://api.spotify.com/v1/me/tracks'

export class TrackService {
    async getAlbum(albumId: string) {
        try {
            const url = `${ALBUM_URL}/${albumId}`
            const options = await setOptions({ method: 'GET' })
            return await request({ url, options })
        } catch (error: any) {
            console.error(error)
            return null
        }
    }

    // !! method must be either PUT or DELETE !!
    async updateLikedTracks({ ids, method }: { ids: string; method: 'PUT' | 'DELETE' }) {
        try {
            const options = await setOptions({ method })
            return await request({ url: `${TRACK_URL}?ids=${ids}`, options })
        } catch (error) {
            console.error(error)
            return null
        }
    }

    // ids must be comma-separated of spotify ids. Ex. ids=jksfdlkjd,jfdklkfdsj,lsuouw
    async checkIfTracksInCollection(ids: string) {
        try {
            const options = await setOptions({ method: 'GET' })
            const url = `${TRACK_URL}/contains?ids=${ids}`
            return await request({ url, options })
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
