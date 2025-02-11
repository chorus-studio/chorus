import { currentData } from '../data/current'
import Dispatcher from '../events/dispatcher'

export default class Queue {
    constructor() {
        this._nextQueuedTracks = []
        this._userBlockedTracks = []
        this._dispatcher = new Dispatcher()
    }

    get #addedToQueue() {
        return document.querySelector('[aria-label="Next in queue"]')?.children || []
    }

    get #nextInQueue() {
        return document.querySelector('[aria-label="Next up"]')?.children || []
    }

    get #tracksInQueue() {
        return [...this.#addedToQueue, ...this.#nextInQueue].map((div) => {
            const songInfo = Array.from(div.querySelectorAll('p > span'))

            const songTitle = songInfo.at(0).innerText

            const songArtistsInfo = songInfo.at(1).querySelectorAll('span > a')
            const songArtists = Array.from(songArtistsInfo)
                .map((a) => a.innerText)
                .join(', ')

            return `${songTitle} by ${songArtists}`
        })
    }

    get #blockedTracks() {
        return currentData.blockedTracks
    }

    async #dispatchQueueList() {
        return await this._dispatcher.sendEvent({
            eventType: 'queue.get',
            detail: { key: 'queue.get', values: {} }
        })
    }

    async refreshQueue() {
        await this.#getQueuedTracks()
        await this.#setQueuedTracks()
    }

    async #dispatchQueueSetter() {
        return await this._dispatcher.sendEvent({
            eventType: 'queue.set',
            detail: { key: 'queue.set', values: { next_tracks: this._nextQueuedTracks } }
        })
    }

    async #setQueuedTracks() {
        if (!this._userBlockedTracks.length) return
        if (!this._nextQueuedTracks.length) return

        await this.#dispatchQueueSetter()
    }

    async #getQueuedTracks() {
        this._userBlockedTracks = this.#filterUnBlockedTracks()
        if (!this._userBlockedTracks.length) return

        const queueList = await this.#dispatchQueueList()

        const spotifyQueuedTracks = queueList?.data?.player_state?.next_tracks
        this._nextQueuedTracks = this.#filterQueuedTracks({
            spotifyQueuedTracks,
            userBlockedTracks: this._userBlockedTracks
        })
    }

    #filterUnBlockedTracks() {
        const blocked = this.#blockedTracks
        const tracksInQueue = this.#tracksInQueue
        return blocked.filter((track) => tracksInQueue.includes(track.id))
    }

    #filterQueuedTracks({ spotifyQueuedTracks, userBlockedTracks }) {
        const userBlockedTrackIds = userBlockedTracks.map(
            (track) => `spotify:track:${track.trackId}`
        )
        return spotifyQueuedTracks.filter((item) => !userBlockedTrackIds.includes(item.uri))
    }
}
