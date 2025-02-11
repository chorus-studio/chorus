import { setOptions, request } from '../utils/request.js'

const ALBUM_URL = 'https://api.spotify.com/v1/albums'
const TRACK_URL = 'https://api.spotify.com/v1/me/tracks'

export function getAlbum({ albumId }) {
    return new Promise(async (resolve, reject) => {
        try {
            const options = await setOptions({ method: 'GET' })
            const response = await request({ url: `${ALBUM_URL}/${albumId}`, options })
            resolve(response)
        } catch (error) {
            reject(error)
        }
    })
}

// !! method must be either PUT or DELETE !!
export function updateLikedTracks({ id, method }) {
    return new Promise(async (resolve, reject) => {
        try {
            const options = await setOptions({ method })
            const response = await request({ url: `${TRACK_URL}?ids=${id}`, options })
            resolve(response)
        } catch (error) {
            reject(error)
        }
    })
}

// ids must must be comma-separated of spotify ids. Ex. ids=jksfdlkjd,jfdklkfdsj,lsuouw
export function checkIfTracksInCollection({ ids }) {
    return new Promise(async (resolve, reject) => {
        try {
            const options = await setOptions({ method: 'GET' })
            const url = `${TRACK_URL}/contains?ids=${ids}`
            const response = await request({ url, options })
            resolve(response)
        } catch (error) {
            reject(error)
        }
    })
}
