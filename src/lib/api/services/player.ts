import { storage } from '@wxt-dev/storage'
import { setOptions, request } from '$lib/api/request'
import { defineProxyService } from '@webext-core/proxy-service'

const PLAYER_COMMAND_API_URL = 'https://guc3-spclient.spotify.com/connect-state/v1/player/command/'

export interface PlayerService {
    playRelease(uri: string): Promise<unknown>
    seek(positionMs: number): Promise<unknown>
}

export class PlayerService implements PlayerService {
    async playRelease(uri: string) {
        const body = {
            command: {
                context: {
                    uri,
                    url: `context://${uri}`,
                    metadata: {}
                },
                options: { license: 'tft', skip_to: {}, player_options_override: {} },
                endpoint: 'play'
            }
        }

        const options = await setOptions({ method: 'POST', body })
        if (!options) throw new Error('No options found')

        const device_id = await storage.getItem('local:chorus_device_id')
        const url = `${PLAYER_COMMAND_API_URL}from/${device_id}/to/${device_id}`

        return await request({ url, options })
    }

    async seek(positionMs: number): Promise<unknown> {
        const body = {
            command: {
                value: positionMs,
                endpoint: 'seek_to'
            }
        }

        const options = await setOptions({ method: 'POST', body })
        if (!options) throw new Error('No options found')

        const device_id = await storage.getItem('local:chorus_device_id')
        const url = `${PLAYER_COMMAND_API_URL}from/${device_id}/to/${device_id}`

        return await request({ url, options })
    }
}

export const [registerPlayerService, getPlayerService] = defineProxyService(
    'PlayerService',
    () => new PlayerService()
)
