import { dataStore } from '$lib/stores/data'
import type { SimpleTrack } from '$lib/stores/data/cache'
import { measureDOMQueries, measureAPICall } from '$lib/utils/performance'

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

    private _cachedTracksInQueue: string[] = []
    public _cacheTimestamp = 0 // Made public for QueueObserver access
    private static readonly CACHE_DURATION = 1000 // 1 second

    get tracksInQueue() {
        const now = Date.now()
        if (now - this._cacheTimestamp < Queue.CACHE_DURATION) {
            return this._cachedTracksInQueue
        }

        return measureDOMQueries('queue-tracks-parsing', () => {
            const tracks = [...this.addedToQueue, ...this.nextInQueue]
            const result: string[] = []
            
            for (const div of tracks) {
                const songInfo = div.querySelectorAll('p > span')
                if (songInfo.length < 2) continue
                
                const songTitle = songInfo[0]?.textContent
                if (!songTitle) continue
                
                const artistLinks = songInfo[1]?.querySelectorAll('span > a')
                if (!artistLinks?.length) continue
                
                const artists: string[] = []
                for (const link of artistLinks) {
                    artists.push(link.textContent || '')
                }
                
                result.push(`${songTitle} by ${artists.join(', ')}`)
            }
            
            this._cachedTracksInQueue = result
            this._cacheTimestamp = now
            return result
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

        const queueList = await measureAPICall('get-queue-list', () => this.queueService.getQueueList())
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
        let hasRelevantMutation = false
        
        for (const mutation of mutations) {
            if (this.isAsideQueueView(mutation)) {
                hasRelevantMutation = true
                break
            }
        }
        
        if (!hasRelevantMutation) return
        
        // Invalidate cache when mutations occur
        this.queue._cacheTimestamp = 0
        
        if (this.timeout) clearTimeout(this.timeout)
        this.timeout = setTimeout(async () => this.queue.refreshQueue(), 1500)
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
