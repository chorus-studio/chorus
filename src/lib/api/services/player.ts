import { storage } from '@wxt-dev/storage'
import { setOptions, request } from '$lib/api/request'
import { defineProxyService } from '@webext-core/proxy-service'

const PLAYER_COMMAND_API_URL = 'https://guc3-spclient.spotify.com/connect-state/v1/player/command/'

export interface PlayerService {
    playRelease(uri: string, position_ms?: number): Promise<unknown>
    seek(position_ms: number): Promise<unknown>
    skipNext(): Promise<unknown>
    getNextTrackUri(): Promise<string | null>
    setNextTrackUri(uri: string | null): Promise<void>
}

export class PlayerService implements PlayerService {
    async playRelease(uri: string, position_ms?: number) {
        const body = {
            command: {
                context: {
                    uri,
                    url: `context://${uri}`,
                    metadata: {}
                },
                options: {
                    license: 'tft',
                    skip_to: {},
                    player_options_override: { ...(position_ms && { position_ms }) }
                },
                endpoint: 'play'
            }
        }

        const options = await setOptions({ method: 'POST', body })
        if (!options) throw new Error('No options found')

        const device_id = await storage.getItem('local:chorus_device_id')
        const url = `${PLAYER_COMMAND_API_URL}from/${device_id}/to/${device_id}`

        return await request({ url, options })
    }

    async seek(position_ms: number): Promise<unknown> {
        const body = {
            command: {
                value: position_ms,
                endpoint: 'seek_to'
            }
        }

        const options = await setOptions({ method: 'POST', body })
        if (!options) throw new Error('No options found')

        const device_id = await storage.getItem('local:chorus_device_id')
        const url = `${PLAYER_COMMAND_API_URL}from/${device_id}/to/${device_id}`

        return await request({ url, options })
    }

    async skipNext(): Promise<unknown> {
        const body = {
            command: {
                endpoint: 'skip_next'
            }
        }

        const options = await setOptions({ method: 'POST', body })
        if (!options) throw new Error('No options found')

        const device_id = await storage.getItem('local:chorus_device_id')
        const url = `${PLAYER_COMMAND_API_URL}from/${device_id}/to/${device_id}`

        return await request({ url, options })
    }

    // Store next track URI from dealer WebSocket (set by background script)
    private static _nextTrackUri: string | null = null

    async getNextTrackUri(): Promise<string | null> {
        return PlayerService._nextTrackUri
    }

    async setNextTrackUri(uri: string | null): Promise<void> {
        PlayerService._nextTrackUri = uri
    }
}

export const [registerPlayerService, getPlayerService] = defineProxyService(
    'PlayerService',
    () => new PlayerService()
)
