import { getState } from '../utils/state.js'
import { setOptions, request } from '../utils/request.js'

const GET_QUEUE_API_URL = 'https://guc3-spclient.spotify.com/connect-state/v1/devices/hobs_'
const SET_QUEUE_API_URL = 'https://guc3-spclient.spotify.com/connect-state/v1/player/command/'

export function getQueueList() {
    return new Promise(async (resolve, reject) => {
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
            const device_id = await getState('device_id')
            const url = `${GET_QUEUE_API_URL}${device_id}`

            const response = await request({ url, options })
            resolve(response)
        } catch (error) {
            reject(error)
        }
    })
}

export function setQueueList({ next_tracks }) {
    return new Promise(async (resolve, reject) => {
        try {
            const body = { command: { endpoint: 'set_queue', next_tracks } }

            const options = await setOptions({ method: 'POST', body })
            const device_id = await getState('device_id')
            const url = `${SET_QUEUE_API_URL}from/${device_id}/to/${device_id}`

            const response = await request({ url, options })
            resolve(response)
        } catch (error) {
            reject(error)
        }
    })
}
