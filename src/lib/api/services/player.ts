import { storage } from '@wxt-dev/storage'
import { setOptions, request } from '../request'
import { defineProxyService } from '@webext-core/proxy-service'

const API_URL = 'https://api.spotify.com/v1/me/player'

export interface PlayerService {
    playSharedTrack({ track_id, position }: { track_id: string; position: number }): Promise<void>
    seekTrackToPosition(position: number): Promise<void>
}

export class PlayerService implements PlayerService {
    // position is in milliseconds
    async playSharedTrack({ track_id, position }: { track_id: string; position: number }) {
        try {
            const device_id = await storage.getItem('local:chorus_device_id')
            if (!device_id) throw new Error('No device id found')

            const body = {
                position_ms: position,
                uris: [`spotify:track:${track_id}`]
            }
            const options = await setOptions({ method: 'PUT', body })

            const url = `${API_URL}/play?device_id=${device_id}`
            return await request({ url, options })
        } catch (error) {
            throw error
        }
    }

    // position is in milliseconds
    async seekTrackToPosition(position: number) {
        try {
            const options = await setOptions({ method: 'PUT' })
            const device_id = await storage.getItem('local:chorus_device_id')
            if (!device_id) throw new Error('No device id found')

            const url = `${API_URL}/seek?position_ms=${position}&device_id=${device_id}`
            return await request({ url, options })
        } catch (error) {
            throw error
        }
    }
}

export const [registerPlayerService, getPlayerService] = defineProxyService(
    'PlayerService',
    () => new PlayerService()
)
