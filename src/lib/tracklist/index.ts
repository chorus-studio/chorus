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
        // this._previousRowNum = null
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

    showPlusCircles() {
        const buttons = this.plusCircles.filter((button) => button?.style?.visibility == 'hidden')

        buttons.forEach((button: HTMLButtonElement) =>
            this.updateButtonStyles({ button, show: true })
        )
    }

    private hidePlusCircles() {
        this.plusCircles.forEach((button) => this.updateButtonStyles({ button, show: false }))
    }

    private hidePlusCircle(row: HTMLElement) {
        const button = row.querySelector('button[role="buttonTertiary"]') as HTMLButtonElement
        if (!button) return
        this.updateButtonStyles({ button, show: false })
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

    async generateSimpleTrack(row: HTMLElement) {
        const track = trackSongInfo(row)
        if (!track) return

        if (track?.track_id && this.isOnLikedSongsPage) {
            dataStore.updateUserCollection({
                track_id: track.track_id,
                liked: true
            })
        }

        if (track?.track_id && !dataStore.collectionObject[track.track_id]) {
            await dataStore.updateTrack({
                track_id: track.track_id,
                value: {
                    liked: dataStore.checkInUserCollection(track.track_id),
                    track_id: track.track_id,
                    song_id: track.id!,
                    snipped: false,
                    blocked: false,
                    end_time: track.endTime!,
                    start_time: track.startTime!
                }
            })
        }
    }

    private setRowEvents() {
        this.trackRows?.forEach((row) => {
            this.generateSimpleTrack(row as HTMLElement)
            const trackInfo = trackSongInfo(row as HTMLElement)
            const track = dataStore.collectionObject[trackInfo?.track_id!]
            this.icons.forEach((icon) => icon.setUI({ row, track }))
        })
    }
}
