import { storage } from '@wxt-dev/storage'
import { setOptions, request } from '../request'
import {
    type Range,
    type Filter,
    type NewReleases,
    defaultFilters,
    NEW_RELEASES_STORE_KEY
} from '$lib/stores/new-releases'
import { defineProxyService } from '@webext-core/proxy-service'

const API_URL = 'https://api-partner.spotify.com/pathfinder/v2/query'

// bare bones spotify artist object
type Artist = {
    uri: string
    name: string
}

export async function getArtistList() {
    const body = {
        operationName: 'libraryV3',
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: '0082bf82412db50128add72dbdb73e2961d59100b9cbf41fb25c568bd8bc358b'
            }
        },
        variables: {
            filters: ['Artists'],
            limit: 50_000,
            textFilter: '',
            offset: 0,
            order: 'Alphabetical'
        }
    }
    const options = await setOptions({ method: 'POST', body })

    if (!options) throw new Error('Failed to set request options: missing authentication')

    try {
        const response = (await request({ url: API_URL, options })) as any
        return response.data.me.libraryV3.items.map((data: any) => ({
            uri: data.item.data.uri,
            name: data.item.data.profile.name
        }))
    } catch (error) {
        console.error(error)
        return []
    }
}

export async function getArtistDiscography(artist: Artist): Promise<TrackMetadata[]> {
    const body = {
        variables: {
            uri: artist.uri,
            offset: 0,
            limit: 100,
            order: 'DATE_DESC'
        },
        operationName: 'queryArtistDiscographyAll',
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: '5e07d323febb57b4a56a42abbf781490e58764aa45feb6e3dc0591564fc56599'
            }
        }
    }

    const options = await setOptions({ method: 'POST', body })

    if (!options) throw new Error('Failed to set request options: missing authentication')

    try {
        const response = (await request({ url: API_URL, options })) as any
        const store = await storage.getItem<NewReleases>(NEW_RELEASES_STORE_KEY)
        return parseArtistDiscography({
            data: response.data,
            artist,
            config: { filters: store?.filters ?? defaultFilters, range: store?.range ?? 'week' }
        })
    } catch (error) {
        console.error(error)
        return []
    }
}

type Track = {
    type: 'ALBUM' | 'COMPILATION' | 'SINGLE' | 'EP'
    uri: string
    name: string
    date: {
        isoString: string
    }
    coverArt: {
        sources: {
            url: string
        }[]
    }
    tracks: {
        totalCount: number
    }
    playability: {
        playable: boolean
    }
}

export type TrackMetadata = {
    type: string
    title: string
    artist: Artist
    imageUrl: string
    time: number
    trackCount: number
    uri: string
}

const rangeMap: Record<Range, number> = {
    week: 7,
    month: 30,
    yesterday: 1
}

function getTrackMetadata({
    artist,
    track,
    range
}: {
    artist: Artist
    track: Track
    range: Range
}): TrackMetadata | null {
    const time = Date.parse(track.date.isoString)
    const today = Date.now()
    const limitInMs = 24 * 3600 * 1000 * rangeMap[range]

    if (today - time >= limitInMs || !track.playability.playable) return null

    return {
        type: track.type,
        uri: track.uri,
        title: track.name,
        artist: {
            name: artist.name,
            uri: artist.uri
        },
        imageUrl: track.coverArt.sources.at(1)!.url, // 64X64
        time,
        trackCount: track.tracks.totalCount
    }
}

type Release = {
    type: 'ALBUM' | 'COMPILATION' | 'SINGLE' | 'EP'
    name: string
    uri: string
    date: { isoString: string }
    coverArt: { sources: { url: string }[] }
    tracks: { totalCount: number }
}

function parseArtistDiscography({
    data,
    artist,
    config
}: {
    data: any
    artist: Artist
    config: { filters: Filter; range: Range }
}): any[] {
    const releases = data.artistUnion.discography.all.items.flatMap(
        (item: any) => item.releases.items
    )
    const list = []
    const types = [
        [config.filters.albums, releases.filter((release: Release) => release.type === 'ALBUM')],
        [
            config.filters.compilations,
            releases.filter((release: Release) => release.type === 'COMPILATION')
        ],
        [
            config.filters.singles,
            releases.filter(
                (release: Release) => release.type === 'SINGLE' || release.type === 'EP'
            )
        ]
    ]

    for (const type of types) {
        if (type[0] && type[1]) {
            for (const track of type[1]) {
                const trackMeta = getTrackMetadata({ artist, track, range: config.range })
                if (!trackMeta) continue

                trackMeta.type = track.type
                list.push(trackMeta)
            }
        }
    }

    return list
}

export async function getArtistReleases() {
    const artists = (await getArtistList()) as Array<Artist>
    const releaseRequests = artists.map(async (artist: Artist) => {
        return await getArtistDiscography(artist).catch((error) => {
            console.error(error)
            return []
        })
    })

    const responses = await Promise.all(releaseRequests)
    return responses.flat().filter((release): release is TrackMetadata => release !== undefined)
}

export interface NewReleasesService {
    getArtistList(): Promise<any>
    getArtistReleases(): Promise<any>
}

export class NewReleasesService implements NewReleasesService {
    async getArtistList() {
        try {
            const response = (await getArtistList()) as any
            return response.data.me.libraryV3.items
        } catch (error) {
            console.error(error)
            return []
        }
    }

    async getMusicReleases() {
        try {
            return await getArtistReleases()
        } catch (error) {
            console.error(error)
            return []
        }
    }
}

export const [registerNewReleasesService, getNewReleasesService] = defineProxyService(
    'NewReleasesService',
    () => new NewReleasesService()
)
