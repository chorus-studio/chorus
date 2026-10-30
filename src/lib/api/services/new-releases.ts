import { defineProxyService } from '@webext-core/proxy-service'
import { BaseAPIService, COMMON_QUERIES } from '../base-service'
import {
    keepSince,
    mapPool,
    releaseTime,
    type Release,
    type ReleaseType
} from '$lib/utils/releases'

const API_URL = 'https://api-partner.spotify.com/pathfinder/v2/query'

// The web player's own persisted queries: the library it keeps, an artist's
// discography newest first, and a show's episodes.
const QUERIES = {
    LIBRARY_V3: {
        operationName: 'libraryV3',
        sha256Hash: '0082bf82412db50128add72dbdb73e2961d59100b9cbf41fb25c568bd8bc358b',
        dedupe: true
    },
    ARTIST_DISCOGRAPHY: {
        operationName: 'queryArtistDiscographyAll',
        sha256Hash: '5e07d323febb57b4a56a42abbf781490e58764aa45feb6e3dc0591564fc56599',
        dedupe: true
    },
    PODCAST_EPISODES: {
        operationName: 'queryPodcastEpisodes',
        sha256Hash: '89c3f9e7216f39cefa5c097821a31015e0bc3079e4c11013d457de4314395168',
        dedupe: true
    }
} as const

/** Requests in flight at once: a sync makes one per followed artist or show. */
const POOL = 6
/** Newest entries asked for per artist or show; a month seldom holds more. */
const PER_SOURCE = 25

type Followed = { uri: string; name: string }
type CoverSource = { url?: string; width?: number | null }

const MUSIC_TYPES: ReleaseType[] = ['ALBUM', 'SINGLE', 'EP', 'COMPILATION']

/** The cover nearest 300 px (a grid card at 2×), else the first on offer. */
function pickCover(sources: unknown): string | null {
    if (!Array.isArray(sources)) return null
    const withUrl = (sources as CoverSource[]).filter((source) => typeof source?.url === 'string')
    if (withUrl.length === 0) return null
    const nearest = withUrl.reduce((best, source) =>
        Math.abs((source.width ?? 300) - 300) < Math.abs((best.width ?? 300) - 300) ? source : best
    )
    return nearest.url ?? null
}

const idOf = (uri: string) => uri.split(':').at(-1) ?? uri

function toRelease(item: any, artist: Followed, since: number): Release | null {
    const uri = String(item?.uri ?? '')
    const type = String(item?.type ?? '').toUpperCase() as ReleaseType
    if (!uri || !MUSIC_TYPES.includes(type)) return null
    const time = releaseTime(item?.date?.isoString ?? item?.releaseDate?.isoString)
    if (time == null || time < since) return null
    if (item?.playability?.playable === false) return null
    const total = Number(item?.tracks?.totalCount)
    return {
        uri,
        id: idOf(uri),
        type,
        title: String(item?.name ?? ''),
        artist,
        cover: pickCover(item?.coverArt?.sources),
        time,
        ...(total > 0 && { trackCount: total })
    }
}

function toEpisode(data: any, show: Followed, since: number): Release | null {
    const uri = String(data?.uri ?? '')
    if (!uri) return null
    const time = releaseTime(data?.releaseDate?.isoString ?? data?.date?.isoString)
    if (time == null || time < since) return null
    if (data?.playability?.playable === false) return null
    const ms = Number(data?.duration?.totalMilliseconds)
    return {
        uri,
        id: idOf(uri),
        type: 'EPISODE',
        title: String(data?.name ?? ''),
        artist: show,
        cover: pickCover(data?.coverArt?.sources),
        time,
        ...(ms > 0 && { durationMs: ms })
    }
}

export interface NewReleasesService {
    /** This month's albums, singles, EPs and compilations from every followed artist. */
    getMusicReleases(): Promise<Release[]>
    /** This month's episodes from every followed show. */
    getShowsReleases(): Promise<Release[]>
    /** Add a release to Your Library, or remove it. */
    updateLibrary(args: { uri: string; remove: boolean }): Promise<void>
}

export class NewReleasesService extends BaseAPIService implements NewReleasesService {
    constructor() {
        super(API_URL)
    }

    /** Everyone followed of a kind, from the library the web player keeps. */
    private async followed(kind: 'artists' | 'shows'): Promise<Followed[]> {
        const variables = {
            filters: [kind === 'artists' ? 'Artists' : 'Podcasts & Shows'],
            limit: 50_000,
            textFilter: '',
            offset: 0,
            order: kind === 'artists' ? 'Alphabetical' : 'Recents'
        }
        const response = await this.executeGraphQLQuery<any>(
            { ...QUERIES.LIBRARY_V3, cacheKey: `library-${kind}` },
            variables
        )
        // No data at all is a failed request (signed out, offline); nobody followed is an empty list.
        if (!response) throw new Error(`Spotify did not list the followed ${kind}`)
        const items = response?.me?.libraryV3?.items
        if (!Array.isArray(items)) return []
        return items
            .map((entry: any): Followed => {
                const data = entry?.item?.data
                return {
                    uri: String(data?.uri ?? ''),
                    name: String(data?.profile?.name ?? data?.name ?? '')
                }
            })
            .filter((followed: Followed) => followed.uri)
    }

    private async artistReleases(artist: Followed, since: number): Promise<Release[]> {
        const response = await this.executeGraphQLQuery<any>(
            { ...QUERIES.ARTIST_DISCOGRAPHY, cacheKey: `discography-${artist.uri}` },
            { uri: artist.uri, offset: 0, limit: PER_SOURCE, order: 'DATE_DESC' }
        )
        const groups = response?.artistUnion?.discography?.all?.items
        if (!Array.isArray(groups)) return []
        const releases: Release[] = []
        for (const group of groups) {
            for (const item of group?.releases?.items ?? []) {
                const release = toRelease(item, artist, since)
                if (release) releases.push(release)
            }
        }
        return releases
    }

    private async showEpisodes(show: Followed, since: number): Promise<Release[]> {
        const response = await this.executeGraphQLQuery<any>(
            { ...QUERIES.PODCAST_EPISODES, cacheKey: `episodes-${show.uri}` },
            { uri: show.uri, offset: 0, limit: PER_SOURCE }
        )
        const items = response?.podcastUnionV2?.episodesV2?.items
        if (!Array.isArray(items)) return []
        return items
            .map((entry: any) => toEpisode(entry?.entity?.data, show, since))
            .filter((release: Release | null): release is Release => release !== null)
    }

    async getMusicReleases(): Promise<Release[]> {
        const since = keepSince()
        const artists = await this.followed('artists')
        const lists = await mapPool(artists, POOL, (artist) => this.artistReleases(artist, since))
        return lists.flat()
    }

    async getShowsReleases(): Promise<Release[]> {
        const since = keepSince()
        const shows = await this.followed('shows')
        const lists = await mapPool(shows, POOL, (show) => this.showEpisodes(show, since))
        return lists.flat()
    }

    async updateLibrary({ uri, remove }: { uri: string; remove: boolean }): Promise<void> {
        const query = remove ? COMMON_QUERIES.REMOVE_FROM_LIBRARY : COMMON_QUERIES.ADD_TO_LIBRARY
        const response = await this.executeGraphQLQuery<unknown>(query, { uris: [uri] })
        if (!response) throw new Error(`Spotify did not ${remove ? 'remove' : 'save'} ${uri}`)
    }
}

export const [registerNewReleasesService, getNewReleasesService] = defineProxyService(
    'NewReleasesService',
    () => new NewReleasesService()
)
