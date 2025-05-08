import { storage } from '@wxt-dev/storage'
import { setOptions, request } from '$lib/api/request'
import { defineProxyService } from '@webext-core/proxy-service'

const GET_QUEUE_API_URL = 'https://guc3-spclient.spotify.com/connect-state/v1/devices/hobs_'
const SET_QUEUE_API_URL = 'https://guc3-spclient.spotify.com/connect-state/v1/player/command/'

export interface QueueService {
    getQueueList(): Promise<unknown>
    setQueueList(next_tracks: string[]): Promise<unknown>
    playRelease(uri: string): Promise<unknown>
}

export class QueueService implements QueueService {
    async getQueueList() {
        try {
            const body = {
                member_type: 'CONNECT_STATE',
                device: {
                    device_info: {
                        capabilities: {
                            can_be_player: false,
                            hidden: true,
                            needs_full_player_state: true
                        }
                    }
                }
            }

            const options = await setOptions({ method: 'PUT', body, connect: true })
            if (!options) throw new Error('No options found')

            const device_id = await storage.getItem('local:chorus_device_id')
            const url = `${GET_QUEUE_API_URL}${device_id}`

            return await request({ url, options })
        } catch (error) {
            console.error(error)
        }
    }

    async setQueueList(next_tracks: string[]) {
        try {
            const body = { command: { endpoint: 'set_queue', next_tracks } }

            const options = await setOptions({ method: 'POST', body })
            if (!options) throw new Error('No options found')

            const device_id = await storage.getItem('local:chorus_device_id')
            const url = `${SET_QUEUE_API_URL}from/${device_id}/to/${device_id}`

            return await request({ url, options })
        } catch (error) {
            console.error(error)
        }
    }

    async playRelease(uri: string) {
        const body = {
            command: {
                context: {
                    uri,
                    url: `context://${uri}`,
                    metadata: {}
                },
                // play_origin: {
                //     feature_identifier: 'whats_new_panel',
                //     feature_version: 'web-player_2025-05-06_1746540979391_9c18a06',
                //     referrer_identifier: 'whats_new_panel'
                // },
                options: { license: 'tft', skip_to: {}, player_options_override: {} },
                // logging_params: {
                //     page_instance_ids: [],
                //     interaction_ids: [],
                //     command_id: 'af18996f94c9d6194f96d803d7470c1f'
                // },
                endpoint: 'play'
            }
        }

        const options = await setOptions({ method: 'POST', body })
        if (!options) throw new Error('No options found')

        const device_id = await storage.getItem('local:chorus_device_id')
        const url = `${SET_QUEUE_API_URL}from/${device_id}/to/${device_id}`

        return await request({ url, options })
    }
}

export const [registerQueueService, getQueueService] = defineProxyService(
    'QueueService',
    () => new QueueService()
)
