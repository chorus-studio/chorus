import { dataStore } from '$lib/stores/data'
import type { SimpleTrack } from '$lib/stores/data/cache'
import { measureDOMQueries, measureAPICall } from '$lib/utils/performance'

import { getQueueService, type QueueService } from '$lib/api/services/queue'

class Queue {
    private queueService: QueueService
    private nextQueuedTracks: string[]
    private userBlockedTracks: SimpleTrack[]
    private apiQueuedTrackIds: string[] = []
    private originalQueue: Array<any> = []
    private originalQueueTimestamp: number = 0
    private readonly QUEUE_EXPIRY_TIME = 30000 // 30 seconds
    private refreshTimeout: NodeJS.Timeout | null = null
    private _lastQueueHash: string | null = null
    public _isUpdatingQueue: boolean = false // Track when we're updating to prevent observer feedback loop

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
        if (!this.nextQueuedTracks.length) return

        // Set flag to prevent observer from triggering during our update
        this._isUpdatingQueue = true

        try {
            await this.queueService.setQueueList(this.nextQueuedTracks)

            // Wait for Spotify to process the update and update the DOM
            // This prevents the observer from seeing our own changes
            await new Promise((resolve) => setTimeout(resolve, 2000))
        } finally {
            // Always reset flag even if API call fails
            this._isUpdatingQueue = false
        }
    }

    async refreshQueue() {
        // Clear existing timeout to debounce rapid calls
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout)
        }

        // Debounce to prevent race conditions
        return new Promise<void>((resolve) => {
            this.refreshTimeout = setTimeout(async () => {
                await this.getQueuedTracks()

                // Only update queue if it actually changed to prevent infinite feedback loop
                const currentQueueHash = JSON.stringify(this.nextQueuedTracks)
                if (currentQueueHash !== this._lastQueueHash) {
                    this._lastQueueHash = currentQueueHash
                    await this.setQueuedTracks()
                }

                this.refreshTimeout = null
                resolve()
            }, 500) // 500ms debounce (increased from 300ms for better stability)
        })
    }

    async restoreUnblockedTrack(unblockedTrackId: string) {
        // When unblocking a track, simply refresh the queue.
        // If the track is still in Spotify's upcoming queue, it will be included.
        // If it was already played/skipped, Spotify won't have it in the queue anymore,
        // so it won't be restored - which is the correct behavior.
        return this.refreshQueue()
    }

    async getQueuedTracks() {
        const queueList = (await measureAPICall('get-queue-list', () =>
            this.queueService.getQueueList()
        )) as any
        const spotifyQueuedTracks = queueList?.player_state?.next_tracks || []

        // Store original queue if it's expired or empty
        const now = Date.now()
        if (
            now - this.originalQueueTimestamp > this.QUEUE_EXPIRY_TIME ||
            this.originalQueue.length === 0
        ) {
            this.originalQueue = [...spotifyQueuedTracks]
            this.originalQueueTimestamp = now
        }

        // Extract track IDs from API response
        this.apiQueuedTrackIds = spotifyQueuedTracks
            .map((track: any) => {
                // Extract track ID from spotify:track:TRACK_ID format
                return track.uri?.replace('spotify:track:', '') || ''
            })
            .filter(Boolean)

        this.userBlockedTracks = this.filterUnblockedTracks()

        // Always filter the queue to remove any blocked tracks
        this.nextQueuedTracks = this.filterQueuedTracks({
            spotifyQueuedTracks,
            userBlockedTracks: this.userBlockedTracks
        })
    }

    filterUnblockedTracks() {
        const blockedTracks = this.blockedTracks

        // First try to use API data if available
        if (this.apiQueuedTrackIds.length > 0) {
            return blockedTracks.filter((track) => this.apiQueuedTrackIds.includes(track.track_id))
        }

        // Fallback to DOM parsing when queue UI is open
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
        // Ignore mutations caused by our own queue updates to prevent infinite loop
        if (this.queue._isUpdatingQueue) {
            return
        }

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
