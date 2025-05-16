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

function getRequestBody(type: 'music' | 'shows') {
    return {
        operationName: 'libraryV3',
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: '0082bf82412db50128add72dbdb73e2961d59100b9cbf41fb25c568bd8bc358b'
            }
        },
        variables: {
            filters: [type === 'music' ? 'Artists' : 'Podcasts & Shows'],
            limit: 50_000,
            textFilter: '',
            offset: 0,
            order: type === 'music' ? 'Alphabetical' : 'Recents'
        }
    }
}

export async function getShowsList() {
    const body = getRequestBody('shows')
    const options = await setOptions({ method: 'POST', body })

    if (!options) throw new Error('Failed to set request options: missing authentication')

    try {
        const response = (await request({ url: API_URL, options })) as any
        return response.data.me.libraryV3.items.map((item: any) => ({
            uri: item.item.data.uri,
            name: item.item.data.name
        }))
    } catch (error) {
        console.error(error)
        return []
    }
}

export async function getArtistList() {
    const body = getRequestBody('music')
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

async function getPodcastInfo(show: Show) {
    const body = {
        variables: { uri: show.uri, offset: 0, limit: 100 },
        operationName: 'queryPodcastEpisodes',
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: '89c3f9e7216f39cefa5c097821a31015e0bc3079e4c11013d457de4314395168'
            }
        }
    }

    const options = await setOptions({ method: 'POST', body })
    if (!options) throw new Error('Failed to set request options: missing authentication')

    try {
        const response = (await request({ url: API_URL, options })) as any
        if (!response) throw new Error('Failed to get podcast info')

        const episodes = response.data.podcastUnionV2.episodesV2.items.map((item: any) => {
            return item.entity.data
        })

        const store = await storage.getItem<NewReleases>(NEW_RELEASES_STORE_KEY)

        return parsePodcastInfo({
            data: episodes,
            show,
            config: {
                range: store?.range ?? 'week',
                updated_at: store?.shows_updated_at ?? new Date().toISOString()
            }
        })
    } catch (error) {
        console.error(error)
        return []
    }
}

const rangeMap: Record<Range, number> = {
    week: 7,
    today: 0,
    month: 30,
    yesterday: 1
}

function parsePodcastInfo({
    data,
    show,
    config
}: {
    show: Show
    data: any[]
    config: { range: Range; updated_at: string }
}) {
    const list = []
    for (const episode of data) {
        const trackMeta = getTrackMetadata({
            artist: { uri: show.uri, name: show.name },
            track: episode,
            config: {
                range: config?.range ?? 'week',
                updated_at: config?.updated_at ?? new Date().toISOString()
            }
        }) as ShowMetadata | null

        if (!trackMeta) continue

        list.push(trackMeta)
    }

    return list
}

export type Show = {
    uri: string
    name: string
}

export async function fetchShowsReleases() {
    const shows = (await getShowsList()) as Array<Show>
    const podcastRequests = shows.map(async (show) => {
        return await getPodcastInfo(show).catch((error) => {
            console.error(error)
            return []
        })
    })

    const responses = await Promise.all(podcastRequests)
    return responses.flat().filter((release): release is TrackMetadata => release !== undefined)
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
            config: {
                filters: store?.filters ?? defaultFilters,
                range: store?.range ?? 'week',
                updated_at: store?.music_updated_at ?? new Date().toISOString()
            }
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
    date?: {
        isoString: string
    }
    releaseDate?: {
        isoString: string
    }
    coverArt: {
        sources: {
            url: string
        }[]
    }
    tracks?: {
        totalCount: number
    }
    playability: {
        playable: boolean
    }
}

export type TrackMetadata = {
    uri: string
    time: number
    type: string
    title: string
    artist: Artist
    imageUrl: string
    trackCount?: number
}

export type ShowMetadata = Omit<TrackMetadata, 'trackCount'>

function getTrackMetadata({
    artist,
    track,
    config
}: {
    artist: Artist
    track: Track
    config: { range: Range; updated_at: string }
}): TrackMetadata | null {
    const date = track?.date?.isoString ?? track.releaseDate?.isoString ?? ''
    if (date === '') return null

    const time = Date.parse(date)
    const today = new Date()
    const limitInMs = 24 * 3600 * 1000 * rangeMap[config.range]
    const trackDate = new Date(time)

    if (config.range === 'today') {
        trackDate.setHours(0, 0, 0, 0)
        today.setHours(0, 0, 0, 0)
        if (today.getTime() !== trackDate.getTime()) return null
    } else if (today.getTime() - time >= limitInMs || !track.playability.playable) return null

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
        ...(track?.tracks && { trackCount: track.tracks.totalCount })
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
    config: { filters: Filter; range: Range; updated_at: string }
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
                const trackMeta = getTrackMetadata({
                    artist,
                    track,
                    config: { range: config.range, updated_at: config.updated_at }
                })
                if (!trackMeta) continue

                trackMeta.type = track.type
                list.push(trackMeta)
            }
        }
    }

    return list
}

export async function fetchMusicReleases() {
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
    getShowsReleases(): Promise<ShowMetadata[]>
    getArtistReleases(): Promise<TrackMetadata[]>
    updateLibrary({ uri, remove }: { uri: string; remove: boolean }): Promise<void>
}

export class NewReleasesService implements NewReleasesService {
    async getMusicReleases() {
        try {
            return await fetchMusicReleases()
        } catch (error) {
            console.error(error)
            return []
        }
    }

    async getShowsReleases() {
        try {
            return await fetchShowsReleases()
        } catch (error) {
            console.error(error)
            return []
        }
    }

    async updateLibrary({ uri, remove = false }: { uri: string; remove: boolean }) {
        const body = {
            variables: { uris: [uri] },
            operationName: remove ? 'removeFromLibrary' : 'addToLibrary',
            extensions: {
                persistedQuery: {
                    version: 1,
                    sha256Hash: 'a3c1ff58e6a36fec5fe1e3a193dc95d9071d96b9ba53c5ba9c1494fb1ee73915'
                }
            }
        }

        const options = await setOptions({ method: 'POST', body })
        if (!options) throw new Error('Failed to set request options: missing authentication')

        try {
            await request({ url: API_URL, options })
        } catch (error) {
            console.error(error)
        }
    }
}

export const [registerNewReleasesService, getNewReleasesService] = defineProxyService(
    'NewReleasesService',
    () => new NewReleasesService()
)
