import { get } from 'svelte/store'
import { loopStore } from '$lib/stores/loop'
import { mediaStore } from '$lib/stores/media'
import { effectsStore } from '$lib/stores/effects'
import { lofiStore } from '$lib/stores/lofi'
import { nowPlaying } from '$lib/stores/now-playing'
import { snipStore } from '$lib/stores/snip'
import { announceSkip, noteTrackStarted } from '$lib/utils/skip-notice'
import { playback } from '$lib/utils/playback'
import { currentSongInfo } from '$lib/utils/song'
import { playbackObserver } from '$lib/observers/playback'
import {
    coversWholeTrack,
    firstSegmentStart,
    jumpEdge,
    nextSegment,
    segmentAt,
    toSegments,
    withGrace,
    type PlaySegment
} from '$lib/utils/snip-ranges'

// Refactored services
import { TrackStateManager } from '$lib/services/track-state-manager'
import { PlaybackController } from '$lib/services/playback-controller'
import { TrackNotificationService } from '$lib/services/track-notification-service'

export class TrackObserver {
    private trackStateManager: TrackStateManager
    private playbackController: PlaybackController
    private notificationService: TrackNotificationService
    private boundProcessMediaPlayInit: (event: CustomEvent) => void
    private _pollInterval: ReturnType<typeof setInterval> | null = null
    private _skipping = false

    constructor() {
        this.trackStateManager = new TrackStateManager()
        this.playbackController = new PlaybackController()
        this.notificationService = new TrackNotificationService()
        this.boundProcessMediaPlayInit = this.processMediaPlayInit.bind(this)
    }

    async initialize() {
        playbackObserver.updateChorusUI()
        await this.processSongTransition()

        // Poll playback position from Spotify's UI instead of FROM_MEDIA_TIMEUPDATE.
        // The UI always shows the correct track's position, avoiding stale
        // currentTime values from old MediaElement instances.
        this._pollInterval = setInterval(() => this.pollPlaybackPosition(), 200)

        document.addEventListener(
            'FROM_MEDIA_PLAY_INIT',
            this.boundProcessMediaPlayInit as EventListener
        )
    }

    private async processMediaPlayInit() {
        await this.trackStateManager.updateTrackType()
        await this.trackStateManager.setPlayback()
        this.setEffect()
    }

    // Simplified getters for commonly accessed stores
    get currentSong() {
        return get(nowPlaying)
    }

    get snip() {
        return get(snipStore)
    }

    get loop() {
        return get(loopStore)
    }

    // Re-send the saved effects to the media layer for the new track: the Chorus
    // slots and the lofi rack. A quick preset is these stores plus playback, so
    // nothing else needs re-applying.
    setEffect() {
        effectsStore.dispatchEffect()
        lofiStore.dispatch()
    }

    private async updateTrackType(): Promise<void> {
        await this.trackStateManager.updateTrackType()
        playbackObserver.updateChorusUI()
    }

    updateCurrentTime(time: number): void {
        this.playbackController.updateCurrentTime(time)
    }

    nextTrack(): void {
        this.playbackController.nextTrack()
    }

    /**
     * The play segments in force right now: the editor's draft while the snip
     * tab is open, so edits are heard as they are made, otherwise the saved
     * snip. A bound the user just moved that is where playback jumps gets a
     * few seconds of grace, so the join can be heard before it is enforced.
     */
    private activeSegments(): { segments: PlaySegment[]; editing: boolean } {
        const song = this.currentSong
        const draft = this.snip
        if (!draft) return { segments: toSegments(song.snip, song.duration), editing: false }

        let segments = toSegments(draft, song.duration)
        const range = draft.ranges[draft.selected]
        const moved = draft.last_updated
        if (range && moved && jumpEdge(draft.mode, range) === range[moved]) {
            segments = withGrace(segments, range[moved], song.duration)
        }
        return { segments, editing: true }
    }

    async processSongTransition() {
        this._skipping = false
        const songInfo = this.currentSong
        noteTrackStarted(songInfo?.track_id)

        if (this.playbackController.isBlocked(songInfo)) {
            announceSkip(songInfo)
            return this.nextTrack()
        }

        const mutedForSkip = this.playbackController.mutedForSkip
        if (mutedForSkip) {
            this.playbackController.clearMutedForSkip()
        }

        // A snip whose first section starts later than 0:00 is seeked there by
        // the first poll; stay muted until then so the opening isn't heard.
        const segments = toSegments(songInfo?.snip, songInfo?.duration ?? 0)
        const seeksOnStart = segments.length > 0 && firstSegmentStart(segments) > 0
        if (seeksOnStart) {
            this.playbackController.setSeeking(true)
            this.playbackController.mute()
        }

        setTimeout(() => {
            if (seeksOnStart || mutedForSkip) {
                this.playbackController.unMute()
            }
            this.playbackController.setSeeking(false)
        }, 100)

        await this.trackStateManager.setPlayback()
        await this.updateTrackType()
        this.setEffect()

        await this.notificationService.showTrackChangeNotification(songInfo)
    }

    /** Loop back to `start`, or move on when a counted loop has run out. */
    private async loopOrAdvance(start: number) {
        // Suppress polls before calling handleLooping to prevent multiple
        // ticks from decrementing the loop count while the UI still shows the
        // old (pre-seek) position.
        this.playbackController.setSeeking(true)
        const looped = await this.playbackController.handleLooping(start)
        if (looped) return

        this.playbackController.setSeeking(false)
        this._skipping = true
        this.nextTrack()
    }

    private async pollPlaybackPosition() {
        if (!this.playbackController.isControlEnabled) return
        if (!this.currentSong) return
        if (this._skipping) return

        const currentSong = this.currentSong

        // Bail when the DOM already shows a different track than the store.
        // User-initiated skips never set _skipping, and the store update is
        // async — a tick in that window would apply the OLD track's snip/loop
        // state to the NEW track (e.g. seek it to the old snip's start).
        // undefined = unreadable (widget mid-swap, or a label the
        // 'Now playing: ' parse doesn't match, e.g. localized UI) — treat as
        // unknown, not as a different track, or the poll dies permanently.
        const domId = currentSongInfo().id
        if (domId !== undefined && domId !== currentSong.id) return

        const positionSeconds = playback.current()
        if (positionSeconds == null) return

        const currentTimeMS = positionSeconds * 1000

        if (this.playbackController.isBlocked(currentSong)) {
            announceSkip(currentSong)
            this._skipping = true
            return this.nextTrack()
        }

        const { segments, editing } = this.activeSegments()
        const start = firstSegmentStart(segments)
        const duration = currentSong.duration
        // duration 0 means "never known", not a zero-length track — without
        // the guard it would make atTrackEnd permanently true and insta-skip.
        const known = duration > 0
        const atTrackEnd = known && currentTimeMS >= duration * 1000 - 100
        // Looping at the natural end checks 1 s early to beat Spotify's
        // auto-advance (polling only sees whole seconds).
        const nearTrackEnd = known && currentTimeMS + 1000 >= duration * 1000 - 100

        if (!coversWholeTrack(segments)) {
            const inside = segmentAt(segments, positionSeconds)
            if (!inside) {
                // Before or between sections: jump to the next one.
                const next = nextSegment(segments, positionSeconds)
                if (next) return this.playbackController.jumpTo(next.start)

                // Past the last section: the snip has played out.
                if (editing) return this.playbackController.jumpTo(start)
                if (this.loop.looping) return this.loopOrAdvance(start)
                this._skipping = true
                return this.nextTrack()
            }
            // A section that ends before the track does needs nothing more;
            // one that runs to the end is handled with the track end below.
            if (inside.end !== null) return
            // While editing, keep the track going round rather than letting
            // Spotify move on, so the draft stays audible.
            if (editing && nearTrackEnd) return this.playbackController.jumpTo(start)
        }

        // The natural end of the track: no snip, or its last section runs to the end.
        if (this.loop.looping && nearTrackEnd) return this.loopOrAdvance(start)
        if (!atTrackEnd) return

        // A counted loop that ran out, or a snipped / blocked track, moves on
        // without waiting for Spotify's own auto-advance.
        const loopExhausted = this.loop.type === 'amount' && this.loop.iteration === 0
        if (loopExhausted || currentSong.snip || currentSong.blocked) {
            this._skipping = true
            this.nextTrack()
        }
    }

    async disconnect() {
        if (this._pollInterval) {
            clearInterval(this._pollInterval)
            this._pollInterval = null
        }

        document.removeEventListener(
            'FROM_MEDIA_PLAY_INIT',
            this.boundProcessMediaPlayInit as EventListener
        )

        // Clean up services
        this.notificationService.cleanup()

        const media = get(mediaStore)
        if (media.active) await mediaStore.setActive(false)
    }
}

export const trackObserver = new TrackObserver()
