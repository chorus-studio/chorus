import { defineProxyService } from '@webext-core/proxy-service'
import { BaseAPIService, COMMON_QUERIES, type GraphQLQuery } from '../base-service'

const API_URL = 'https://api-partner.spotify.com/pathfinder/v2/query'

export interface TrackService {
    checkIfTracksInCollection(ids: string): Promise<boolean[]>
    getAlbum({ albumId, songId }: { albumId: string; songId: string }): Promise<string | null>

    updateLikedTracks({ ids, action }: { ids: string; action: 'add' | 'remove' }): Promise<void>
}

export class TrackService extends BaseAPIService implements TrackService {
    constructor() {
        super(API_URL)
    }

    async getAlbum({
        albumId,
        songId
    }: {
        albumId: string
        songId: string
    }): Promise<string | null> {
        const variables = {
            uri: `spotify:album:${albumId}`,
            locale: '',
            offset: 0,
            limit: 50
        }

        const response = await this.executeGraphQLQuery<any>(COMMON_QUERIES.GET_ALBUM, variables)

        if (!response?.albumUnion?.tracksV2?.items) {
            return null
        }

        const foundTrack = response.albumUnion.tracksV2.items.find((track: any) => {
            const artists = track.artists.map((artist: any) => artist.name).join(',')
            const songTitle = `${track.name} by ${artists}`
            return songTitle === songId
        })

        return foundTrack?.uri ?? null
    }

    async updateLikedTracks({
        ids,
        action
    }: {
        ids: string
        action: 'add' | 'remove'
    }): Promise<any> {
        const variables = {
            uris: ids.split(',').map((id) => `spotify:track:${id}`)
        }

        const query =
            action === 'add' ? COMMON_QUERIES.ADD_TO_LIBRARY : COMMON_QUERIES.REMOVE_FROM_LIBRARY

        return await this.executeGraphQLQuery<any>(query, variables)
    }

    async checkIfTracksInCollection(ids: string): Promise<boolean[] | null> {
        const variables = {
            uris: ids.split(',').map((id) => `spotify:track:${id}`)
        }

        const response = await this.executeGraphQLQuery<any>(
            { ...COMMON_QUERIES.IS_CURATED, cacheKey: `tracks-in-collection-${ids}` },
            variables
        )

        if (!response?.lookup) {
            return null
        }

        return response.lookup.map((item: any) => item.data.isCurated)
    }
}

export const [registerTrackService, getTrackService] = defineProxyService(
    'TrackService',
    () => new TrackService()
)
