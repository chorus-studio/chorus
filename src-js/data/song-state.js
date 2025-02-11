import { currentData } from './current.js'
import { currentSongInfo } from '../utils/song.js'

const sharedSnipValues = () => {
    if (!location?.search) return

    const params = new URLSearchParams(location.search)
    const values = params?.get('ch')
    if (!values) return

    const [startTime, endTime, playbackRate, preservesPitch] = values.split('-')

    return {
        endTime: parseInt(endTime, 10),
        startTime: parseInt(startTime, 10),
        preservesPitch: parseInt(preservesPitch, 10) == 1,
        playbackRate: parseFloat(playbackRate) / 1000
    }
}

export const songState = async () => {
    const state = await currentData.readTrack()
    const sharedSnipState = sharedSnipValues()

    const { id, trackId } = currentSongInfo()
    if (!sharedSnipState) return { ...state, id, trackId, isShared: false }

    const trackIdFromURL = location?.pathname?.split('/')?.at(-1)

    return {
        id,
        isShared: true,
        ...state,
        ...sharedSnipState,
        trackId: trackIdFromURL
    }
}
