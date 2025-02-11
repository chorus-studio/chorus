import { getState } from '../utils/state.js'
import { setOptions, request } from '../utils/request.js'

const API_URL = 'https://api.spotify.com/v1/me/player'

function playSharedTrack({ track_id, position }) {
    return new Promise(async (resolve, reject) => {
        try {
            const body = {
                uris: [`spotify:track:${track_id}`],
                position_ms: Math.max(parseInt(position, 10), 0) * 1000
            }
            const options = await setOptions({ method: 'PUT', body })
            const device_id = await getState('device_id')
            const url = `${API_URL}/play?device_id=${device_id}`

            const response = await request({ url, options })
            resolve(response)
        } catch (error) {
            reject(error)
        }
    })
}

function seekTrackToPosition({ position }) {
    return new Promise(async (resolve, reject) => {
        try {
            const options = await setOptions({ method: 'PUT' })
            const device_id = await getState('device_id')
            const url = `${API_URL}/seek?position_ms=${position}&device_id=${device_id}`
            const response = await request({ url, options })
            resolve(response)
        } catch (error) {
            reject(error)
        }
    })
}
export { playSharedTrack, seekTrackToPosition }
