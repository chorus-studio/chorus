import { dataStore } from '$lib/stores/data'
import type { SimpleTrack } from '$lib/stores/data/cache'

import { getQueueService, type QueueService } from '$lib/api/services/queue'

class Queue {
    private queueService: QueueService
    private nextQueuedTracks: string[]
    private userBlockedTracks: SimpleTrack[]

    constructor() {
        this.nextQueuedTracks = []
        this.userBlockedTracks = []
        this.queueService = getQueueService()
    }

    get addedToQueue() {
        return document.querySelector('[aria-label="Next in queue"]')?.children || []
    }

    get nextInQueue() {
        return document.querySelector('[aria-label="Next up"]')?.children || []
    }

    get tracksInQueue() {
        return [...this.addedToQueue, ...this.nextInQueue].map((div) => {
            const songInfo = Array.from(div.querySelectorAll('p > span')) as HTMLSpanElement[]

            const songTitle = songInfo?.at(0)?.innerText
            const songArtistsInfo = songInfo
                ?.at(1)
                ?.querySelectorAll('span > a') as NodeListOf<HTMLAnchorElement>

            const songArtists = Array.from(songArtistsInfo)
                .map((a) => a.innerText)
                .join(', ')

            return `${songTitle} by ${songArtists}`
        })
    }

    get blockedTracks() {
        return dataStore.blocked
    }

    async setQueuedTracks() {
        if (!this.userBlockedTracks.length) return
        if (!this.nextQueuedTracks.length) return

        await this.queueService.setQueueList(this.nextQueuedTracks)
    }

    async refreshQueue() {
        await this.getQueuedTracks()
        await this.setQueuedTracks()
    }

    async getQueuedTracks() {
        this.userBlockedTracks = this.filterUnblockedTracks()
        if (!this.userBlockedTracks.length) return

        const queueList = await this.queueService.getQueueList()
        const spotifyQueuedTracks = queueList?.player_state?.next_tracks || []
        this.nextQueuedTracks = this.filterQueuedTracks({
            spotifyQueuedTracks,
            userBlockedTracks: this.userBlockedTracks
        })
    }

    filterUnblockedTracks() {
        const blockedTracks = this.blockedTracks
        const queuedTracks = this.tracksInQueue
        return blockedTracks.filter((track) => queuedTracks.includes(track.song_id))
    }

    filterQueuedTracks({
        spotifyQueuedTracks,
        userBlockedTracks
    }: {
        spotifyQueuedTracks: Array<any>
        userBlockedTracks: SimpleTrack[]
    }) {
        const userBlockedTrackIds = userBlockedTracks.map(
            (track) => `spotify:track:${track.track_id}`
        )
        return spotifyQueuedTracks.filter((item) => !userBlockedTrackIds.includes(item.uri))
    }
}

export const queue = new Queue()

export class QueueObserver {
    private queue: Queue = queue
    private timeout: NodeJS.Timeout | null = null
    private observer: MutationObserver | null = null
    private interval: NodeJS.Timeout | null = null

    observe() {
        this.interval = setInterval(() => {
            if (this.observer) return

            const target = document.querySelector('aside[aria-label="Queue"]')
            if (!target) {
                this.disconnect()
                return
            }
            this.observer = new MutationObserver(this.handleMutation)
            this.observer.observe(target, { childList: true, subtree: true })
        }, 1000)
    }

    handleMutation = (mutations: MutationRecord[]) => {
        for (const mutation of mutations) {
            if (!this.isAsideQueueView(mutation)) return

            if (this.timeout) clearTimeout(this.timeout)
            this.timeout = setTimeout(async () => this.queue.refreshQueue(), 1500)
        }
    }

    isAsideQueueView(mutation: MutationRecord) {
        const target = mutation.target as HTMLElement
        if (target?.localName !== 'ul') return false

        const listLabels = ['Next in queue', 'Next up', 'Now playing']
        const attribute = target.getAttribute('aria-label') as string | null
        return listLabels.includes(attribute as string)
    }

    clearTimer() {
        if (this.interval) {
            clearInterval(this.interval)
        }
    }

    disconnect() {
        this.observer?.disconnect()
        this.observer = null
        this.clearTimer()
    }
}
