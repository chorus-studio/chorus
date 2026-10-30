import { defineProxyService } from '@webext-core/proxy-service'
import { kindOf, releaseTypeOf, type ReleaseKind, type ReleaseType } from '$lib/utils/discography'
import { pickCover } from './discography'
import { BaseAPIService, COMMON_QUERIES, type GraphQLQuery } from '../base-service'

const API_URL = 'https://api-partner.spotify.com/pathfinder/v2/query'

export type AlbumTracks = {
    name: string
    year: string | null
    /** Cover art around 300 px, or none. */
    cover: string | null
    /** Album, single (EPs included) or compilation, and Spotify's own type when it gave one. */
    kind: ReleaseKind
    type?: ReleaseType
    tracks: Array<{ id: string; name: string }>
}

export interface TrackService {
    checkIfTracksInCollection(ids: string): Promise<boolean[]>
    getAlbum({ albumId, songId }: { albumId: string; songId: string }): Promise<string | null>
    getAlbumTracks(albumId: string): Promise<AlbumTracks | null>

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
        const trackInfoList = response?.albumUnion?.tracksV2?.items

        if (!trackInfoList) return null

        const foundTrack = trackInfoList?.find(({ track }: any) => {
            const artists = track.artists.items.map((artist: any) => artist.profile.name).join(',')
            const songTitle = `${track.name} by ${artists}`
            return songTitle === songId
        })

        return foundTrack?.uri ?? null
    }

    /** An album's name, year and track list, for discography progress. */
    async getAlbumTracks(albumId: string): Promise<AlbumTracks | null> {
        const variables = { uri: `spotify:album:${albumId}`, locale: '', offset: 0, limit: 50 }
        const response = await this.executeGraphQLQuery<any>(
            { ...COMMON_QUERIES.GET_ALBUM, cacheKey: `album-tracks-${albumId}` },
            variables
        )
        const album = response?.albumUnion
        const items = album?.tracksV2?.items
        if (!album || !Array.isArray(items)) return null
        const tracks = items
            .map(({ track }: any) => ({
                id:
                    String(track?.uri ?? '')
                        .split(':')
                        .at(-1) ?? '',
                name: String(track?.name ?? '')
            }))
            .filter((t: { id: string }) => t.id)
        return {
            name: String(album.name ?? ''),
            year: album.date?.year != null ? String(album.date.year) : null,
            cover: pickCover(album.coverArt?.sources),
            kind: kindOf(album.type),
            type: releaseTypeOf(album.type),
            tracks
        }
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
