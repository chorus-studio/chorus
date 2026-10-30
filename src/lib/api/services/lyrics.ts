import { defineProxyService } from '@webext-core/proxy-service'
import { BaseAPIService } from '../base-service'
import { parseLyrics, type Lyrics } from '$lib/utils/lyrics'

/**
 * The web player's own lyrics endpoint. With the App-Platform header it
 * answers with every line and, for line-synced lyrics, when each starts; a
 * track without lyrics answers 404, which reads as null here.
 */
const API_URL = 'https://spclient.wg.spotify.com/color-lyrics/v2/track'

export { parseLyrics, type LyricLine, type Lyrics } from '$lib/utils/lyrics'

export interface LyricsService {
    getLyrics(track_id: string): Promise<Lyrics | null>
}

export class LyricsService extends BaseAPIService implements LyricsService {
    constructor() {
        super(API_URL)
    }

    async getLyrics(track_id: string): Promise<Lyrics | null> {
        if (!track_id) return null
        const response = await this.executeRequest<unknown>(
            `/${track_id}?format=json&market=from_token`,
            { platform: true, dedupe: true, cacheKey: `lyrics-${track_id}` }
        )
        return parseLyrics(response)
    }
}

export const [registerLyricsService, getLyricsService] = defineProxyService(
    'LyricsService',
    () => new LyricsService()
)
