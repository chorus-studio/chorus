import { SkipIcon } from './skip-icon'
import { HeartIcon } from './heart-icon'

import { dataStore } from '$lib/stores/data'
import type { Collection } from '$lib/stores/data/cache'
import { getTrackId, trackSongInfo } from '$lib/utils/song'
import { getTrackService, TrackService } from '$lib/api/services/track'

export class TrackList {
    private skipIcon: SkipIcon
    private heartIcon: HeartIcon
    private icons: Array<SkipIcon | HeartIcon>
    private trackService: TrackService

    constructor() {
        this.skipIcon = new SkipIcon()
        this.heartIcon = new HeartIcon()
        this.trackService = getTrackService()
        this.icons = [this.heartIcon, this.skipIcon]
    }

    get trackRows() {
        const trackRows = document.querySelectorAll('[data-testid="tracklist-row"]')
        return trackRows?.length > 0 ? Array.from(trackRows) : []
    }

    private get trackIdsToCheck() {
        if (!this.trackRows?.length) return []

        const trackIds = new Set(
            this.trackRows.map((row) => getTrackId(row as HTMLElement)?.track_id)
        )
        const collectionTrackIds = new Set(dataStore.collection_ids)
        return [...trackIds.difference(collectionTrackIds)]
    }

    private get plusCircles() {
        const plusCircleButtons = document.querySelectorAll(
            '[role="presentation"] > div > button[data-encore-id="buttonTertiary"][aria-checked]'
        )
        if (!plusCircleButtons.length) return []
        return Array.from(plusCircleButtons) as HTMLButtonElement[]
    }

    private updateButtonStyles({
        button,
        show = false
    }: {
        button: HTMLButtonElement
        show: boolean
    }) {
        button.style.padding = show ? '12px' : '0'
        button.style.width = show ? '16px' : '0'
        button.style.visibility = show ? 'visible' : 'hidden'
        button.style.marginRight = show ? '12px' : '0'
    }

    private hidePlusCircles() {
        this.plusCircles.forEach((button) => this.updateButtonStyles({ button, show: false }))
    }

    private async updateCollectionLikedTracks(ids: string[]) {
        const data = (await this.trackService.checkIfTracksInCollection(ids.join(','))) as boolean[]
        const collection = dataStore.collectionObject
        const collectionToMerge = ids.reduce((obj: Collection, id: string, idx: number) => {
            if (collection[id]) {
                obj[id] = collection[id]
                obj[id].liked = Boolean(data[idx])
            }
            return obj
        }, {})
        dataStore.mergeCollection(collectionToMerge)
    }

    private get isOnLikedSongsPage() {
        return location.pathname == '/collection/tracks'
    }

    async setUpBlocking() {
        if (!this.trackRows?.length) return
        this.hidePlusCircles()

        const trackIds = this.trackIdsToCheck.filter((id) => id !== undefined)

        if (trackIds.length && !this.isOnLikedSongsPage) {
            await this.updateCollectionLikedTracks(trackIds)
        }

        this.setRowEvents()
    }

    isSpotifyHighlighted(row: HTMLElement) {
        const button = row.querySelector('button[data-encore-id="buttonTertiary"]')
        if (!button) return false
        const ariaChecked = button.getAttribute('aria-checked')
        const ariaLabel = button.getAttribute('aria-label')
        const isInLikedPlaylist = ariaLabel?.includes('Add to playlist')
        return ariaChecked ? JSON.parse(ariaChecked) && isInLikedPlaylist : false
    }

    async isLiked(row: HTMLElement) {
        if (this.isOnLikedSongsPage) return true
        if (row.getAttribute('data-testid') != 'tracklist-row') return false
        const track = trackSongInfo(row)
        if (!track?.track_id) return false

        const isAlreadyLiked = dataStore.checkInUserCollection(track.track_id)
        if (isAlreadyLiked !== null) return isAlreadyLiked

        const response = await this.trackService.checkIfTracksInCollection(track.track_id)
        if (!response) return false

        const isLiked = (response as Array<boolean>)?.at(0) ?? false
        await dataStore.updateTrack({ track_id: track.track_id!, value: { liked: isLiked } })
        dataStore.updateUserCollection({ track_id: track.track_id!, liked: isLiked })

        return isLiked
    }

    async generateSimpleTrack(row: HTMLElement) {
        const track = trackSongInfo(row)
        if (!track?.track_id) return

        const isLiked = await this.isLiked(row)
        dataStore.updateUserCollection({
            track_id: track.track_id,
            liked: isLiked
        })

        await dataStore.updateTrack({
            track_id: track.track_id,
            value: {
                liked: isLiked,
                track_id: track.track_id,
                song_id: track.id!,
                blocked: false
            }
        })
    }

    private setRowEvents() {
        this.trackRows?.forEach(async (row) => {
            await this.generateSimpleTrack(row as HTMLElement)
            const trackInfo = trackSongInfo(row as HTMLElement)
            const track = dataStore.collectionObject[trackInfo?.track_id!]
            this.icons.forEach((icon) => icon.setUI({ row, track }))
        })
    }
}
