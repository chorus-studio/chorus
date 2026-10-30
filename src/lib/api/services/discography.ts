import { defineProxyService } from '@webext-core/proxy-service'
import { BaseAPIService } from '../base-service'
import { kindOf, type Listed } from '$lib/utils/discography'

const API_URL = 'https://api-partner.spotify.com/pathfinder/v2/query'

/** The web player's own persisted query for an artist's full discography, newest first. */
const ARTIST_DISCOGRAPHY = {
    operationName: 'queryArtistDiscographyAll',
    sha256Hash: '5e07d323febb57b4a56a42abbf781490e58764aa45feb6e3dc0591564fc56599',
    dedupe: true
} as const

/** Releases asked for per page, and the most an artist is listed to. */
const PAGE = 100
const LIMIT = 500

type CoverSource = { url?: string; width?: number | null }

/** The cover nearest 300 px (a grid card at 2×), else the first on offer. */
export function pickCover(sources: unknown): string | null {
    if (!Array.isArray(sources)) return null
    const withUrl = (sources as CoverSource[]).filter((source) => typeof source?.url === 'string')
    if (withUrl.length === 0) return null
    const nearest = withUrl.reduce((best, source) =>
        Math.abs((source.width ?? 300) - 300) < Math.abs((best.width ?? 300) - 300) ? source : best
    )
    return nearest.url ?? null
}

function toListed(item: any): Listed | null {
    const id = String(item?.uri ?? '').split(':').at(-1) ?? ''
    if (!id || item?.playability?.playable === false) return null
    const iso = String(item?.date?.isoString ?? '')
    const year =
        item?.date?.year != null ? String(item.date.year) : iso ? iso.slice(0, 4) : null
    const total = Number(item?.tracks?.totalCount)
    return {
        id,
        name: String(item?.name ?? ''),
        year,
        cover: pickCover(item?.coverArt?.sources),
        kind: kindOf(item?.type),
        total: Number.isFinite(total) && total > 0 ? total : 0
    }
}

export type ArtistListing = { id: string; name: string; releases: Listed[] }

export interface DiscographyService {
    /**
     * Every release Spotify lists for an artist (albums, singles and EPs,
     * compilations; not appearances), one per release group so regional
     * duplicates are not counted twice. Null when Spotify did not answer.
     */
    getArtistDiscography(artistId: string): Promise<ArtistListing | null>
}

export class DiscographyService extends BaseAPIService implements DiscographyService {
    constructor() {
        super(API_URL)
    }

    async getArtistDiscography(artistId: string): Promise<ArtistListing | null> {
        const uri = `spotify:artist:${artistId}`
        const releases: Listed[] = []
        const seen = new Set<string>()
        let name = ''
        let answered = false
        for (let offset = 0; offset < LIMIT; offset += PAGE) {
            const response = await this.executeGraphQLQuery<any>(
                { ...ARTIST_DISCOGRAPHY, cacheKey: `discography-all-${artistId}-${offset}` },
                { uri, offset, limit: PAGE, order: 'DATE_DESC' }
            )
            const union = response?.artistUnion
            if (!union) break
            answered = true
            name ||= String(union.profile?.name ?? '')
            const all = union.discography?.all
            const groups: any[] = Array.isArray(all?.items) ? all.items : []
            for (const group of groups) {
                const listed = toListed(group?.releases?.items?.[0])
                if (listed && !seen.has(listed.id)) {
                    seen.add(listed.id)
                    releases.push(listed)
                }
            }
            const total = Number(all?.totalCount)
            if (groups.length === 0 || !Number.isFinite(total) || offset + PAGE >= total) break
        }
        if (!answered) return null
        return { id: artistId, name, releases }
    }
}

export const [registerDiscographyService, getDiscographyService] = defineProxyService(
    'DiscographyService',
    () => new DiscographyService()
)
