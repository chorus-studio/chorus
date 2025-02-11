import CacheStore from './cache.js'
import Dispatcher from '../events/dispatcher.js'
import { currentSongInfo } from '../utils/song.js'
import { playback } from '../utils/playback.js'

const DO_NOT_INCLUDE = [
    'connection_id',
    'reverb',
    'equalizer',
    'now-playing',
    'device_id',
    'auth_token',
    'enabled',
    'globals',
    'chorus-seek'
]

class DataStore {
    #cache
    #dispatcher

    constructor({ cache, dispatcher }) {
        this.#cache = cache
        this.#dispatcher = dispatcher
    }

    get blockedTracks() {
        const cacheValues = Object.values(JSON.parse(JSON.stringify(this.#cache.cache)))
        return cacheValues.filter((value) => {
            try {
                let parsed = JSON.parse(value)
                const id = parsed?.id
                if (!id) return false

                return id.includes('by') && parsed.isSkipped
            } catch {
                return false
            }
        })
    }

    get collectionTrackIds() {
        const userCurations = this.#cache.getValue({ key: 'user-curated', value: {} })
        return Object.keys(userCurations)
    }

    checkInCollection(id) {
        const userCurations = this.#cache.getValue({ key: 'user-curated', value: {} })
        if (userCurations.hasOwnProperty(id)) return userCurations[id]

        return null
    }

    saveInCollection({ id, saved }) {
        if (!id) return

        const userCurations = this.#cache.getValue({ key: 'user-curated', value: {} })
        userCurations[id] = saved

        this.#cache.update({ key: 'user-curated', value: userCurations })
    }

    mergetoCollection(newEntries) {
        const userCurations = this.#cache.getValue({ key: 'user-curated', value: {} })
        const collection = Object.assign(userCurations, newEntries)
        this.#cache.update({ key: 'user-curated', value: collection })
    }

    async populate() {
        const response = await this.#dispatcher.sendEvent({
            eventType: 'storage.populate',
            detail: {}
        })

        Object.keys(response).forEach((key) => {
            const value = response[key]

            // TODO: parse the values instead. If not parseable it will not have
            // and not require  a isSkipped value
            if (!DO_NOT_INCLUDE.includes(key) && !value.hasOwnProperty('isSkipped')) {
                value.isSkipped = value?.endTime == 0
            }

            this.#cache.update({
                key,
                value: typeof value !== 'string' ? JSON.stringify(value) : value
            })
        })
    }

    getTrack({ id, value = {} }) {
        return this.#cache.getValue({ key: id, value })
    }

    async setNowPlaying(track) {
        const { id, cover } = currentSongInfo()
        const [title, artists] = id?.split(' by ')

        const duration = playback.duration()
        await this.#dispatcher.sendEvent({
            eventType: 'storage.set',
            detail: {
                key: 'now-playing',
                values: { id, title, artists, cover, duration, ...track }
            }
        })

        this.#cache.update({
            key: 'now-playing',
            value: { id, duration, title, artists, cover, autoLoop: false, ...track }
        })

        return this.#cache.getKey(id)
    }

    #shouldDeleteTrack({ isSkipped, playbackRate = '1', isSnip }) {
        if (isSkipped || isSnip || playbackRate != '1') return false

        return true
    }

    getReverb() {
        return this.#cache.getValue({ key: 'reverb', value: 'none' })
    }

    getEqualizer() {
        return this.#cache.getValue({ key: 'equalizer', value: 'none' })
    }

    async saveReverb(effect) {
        const key = 'reverb'
        await this.#dispatcher.sendEvent({
            eventType: 'storage.set',
            detail: { key, values: effect }
        })
        this.#cache.update({ key, value: effect })
        return this.#cache.getKey(key)
    }

    async saveEqualizer(effect) {
        const key = 'equalizer'
        await this.#dispatcher.sendEvent({
            eventType: 'storage.set',
            detail: { key, values: effect }
        })
        this.#cache.update({ key, value: effect })
        return this.#cache.getKey(key)
    }

    async saveTrack({ id, value }) {
        let response
        const isTrack = !['chorus-seek', 'globals'].includes(id)

        if (isTrack && this.#shouldDeleteTrack(value)) {
            await this.deleteTrack(id)
        } else {
            response = await this.#dispatcher.sendEvent({
                eventType: 'storage.set',
                detail: { key: id, values: value }
            })
        }

        this.#cache.update({ key: id, value: response ?? value })
        return this.#cache.getKey(id)
    }

    async deleteTrack(id) {
        await this.#dispatcher.sendEvent({ eventType: 'storage.delete', detail: { key: id } })
        this.#cache.removeKey(id)
    }
}

export const store = new DataStore({ cache: new CacheStore(), dispatcher: new Dispatcher() })
