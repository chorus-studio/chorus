import Reverb from '../lib/audio-effects/reverb'
import Equalizer from '../lib/audio-effects/equalizer'
import AudioManager from '../lib/audio-effects/audio-manager'

function parseTime(timeString: string) {
    const parts = timeString.split(/[:.]/).map(Number)
    let hours = 0
    let minutes = 0
    let seconds = 0
    let milliseconds = 0

    if (parts.length === 4) {
        ;[hours, minutes, seconds, milliseconds] = parts
    } else if (parts.length === 3) {
        if (timeString.includes('.')) {
            ;[minutes, seconds, milliseconds] = parts
        } else {
            ;[hours, minutes, seconds] = parts
        }
    } else if (parts.length === 2) {
        if (timeString.includes('.')) {
            ;[seconds, milliseconds] = parts
        } else {
            ;[minutes, seconds] = parts
        }
    } else {
        return NaN
    }

    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
}

export class MediaPlayer {
    private _element: HTMLVideoElement | HTMLAudioElement
    private _audioManager: AudioManager | null
    private _reverb: Reverb | null
    private _equalizer: Equalizer | null

    constructor(element: HTMLVideoElement | HTMLAudioElement) {
        this._element = element
        this._audioManager = null
        this._reverb = null
        this._equalizer = null
        this.element.crossOrigin = 'anonymous'
        this.disconnectEffects()
    }

    setup() {
        if (this._audioManager && this._reverb && this._equalizer) return

        this._audioManager = new AudioManager(this._element)
        this._reverb = new Reverb(this._audioManager)
        this._equalizer = new Equalizer(this._audioManager)
    }

    async clearAllEffects() {
        await this.applyEffects({ equalizer: 'none', reverb: 'none' })
    }

    disconnectEffects() {
        this._audioManager?.cleanup()
        this._audioManager = null
        this._reverb = null
        this._equalizer = null
    }

    async applyEffects(audioEffects: { equalizer: string; reverb: string }) {
        this.setup()

        const { equalizer, reverb } = audioEffects

        await this.setEffect({ type: 'equalizer', effect: equalizer })
        await this.setEffect({ type: 'reverb', effect: reverb })
    }

    get host() {
        const hostname = window.location.hostname
        const parts = hostname.split('.')
        if (parts.length > 2) return parts[parts.length - 2]

        return parts[0]
    }

    async setEffect({ type, effect }: { type: string; effect: string }) {
        this.setup()

        if (type == 'reverb') {
            await this._reverb?.setReverbEffect(effect)
        } else {
            this._equalizer?.setEQEffect(effect)
        }
    }

    seekOffset(offset: number) {
        const newTime = Math.min(this.duration, this.currentTime + offset)

        if (this.progressBar) {
            this.seekToPosition(newTime)
        } else {
            this.currentTime = newTime
        }
    }

    get progressBar() {
        return document.querySelector(
            '.playbackTimeline__progressWrapper, .progress-bar > .slider-container[aria-label="Slider"]'
        )
    }

    dispatchPointerEvent({
        element,
        type,
        x,
        y
    }: {
        element: HTMLElement
        type: string
        x: number
        y: number
    }) {
        const event = new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y
        })
        try {
            element?.dispatchEvent(event)
        } catch (error) {
            console.error(`Error dispatching ${type} event: `, error)
        }
    }

    dispatchMouseEvent({
        element,
        type,
        x,
        y
    }: {
        element: HTMLElement
        type: string
        x: number
        y: number
    }) {
        const event = new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y
        })
        try {
            element?.dispatchEvent(event)
        } catch (error) {
            console.error(`Error dispatching ${type} event: `, error)
        }
    }

    seekToPosition(position: number) {
        if (!this.progressBar) return

        const min = Number(this.progressBar.getAttribute('aria-valuemin')) ?? 0
        const max = Number(this.progressBar.getAttribute('aria-valuemax')) ?? this.duration

        if (Number(min) === position && Number(max) === position) return
        const newValue = Math.max(Number(min), Math.min(Number(max), position))

        const percentage = (newValue / max) * 100
        const clampedPercentage = Math.min(100, Math.max(0, percentage))
        const rect = this.progressBar.getBoundingClientRect()
        const x = rect.left + (clampedPercentage * rect.width) / 100
        const y = rect.top + rect.height / 2

        ;['pointerdown', 'pointerup'].forEach((type) => {
            this.dispatchPointerEvent({ element: this.progressBar as HTMLElement, type, x, y })
        })
        ;['mousedown', 'mouseup'].forEach((type) => {
            this.dispatchMouseEvent({ element: this.progressBar as HTMLElement, type, x, y })
        })
    }

    seekTo(position: number) {
        if (this.progressBar) {
            this.seekToPosition(position)
        } else {
            this._element.currentTime = position
        }
    }

    get playPauseElement() {
        return document.querySelector('button.playControls__play')
    }

    manualPlayPause() {
        const playPauseButton = document.querySelector(
            'button[data-testid="control-button-playpause"], button.playControls__play, button.ytp-play-button.ytp-button, #play-pause-button'
        )
        if (playPauseButton) return (playPauseButton as HTMLElement).click()
    }

    togglePlayPause() {
        if (this.playPauseElement) return (this.playPauseElement as HTMLElement).click()

        if (this._element.paused) this._element.play()
        else this._element.pause()
    }

    reset() {
        this.clearAllEffects()
    }

    previous() {
        const prevButton = document.querySelector(
            '[data-testid="control-button-skip-back"], [data-title-no-tooltip="Previous"], button.skipControl__previous, .previous-button'
        )
        if (prevButton) return (prevButton as HTMLElement).click()
    }

    next() {
        const nextButton = document.querySelector(
            '[data-testid="control-button-skip-forward"], [data-title-no-tooltip="Next"], button.skipControl__next, button.play-next-icon, .next-button'
        )
        if (nextButton) return (nextButton as HTMLElement).click()
    }

    toggleLoop() {
        this._element.loop = !this._element.loop
    }

    set currentTime(value) {
        if (this.progressBar) {
            this.seekToPosition(value)
        } else {
            this._element.currentTime = value
        }
    }

    get currentTimeElement() {
        return document.querySelector(
            '.playbackTimeline__progressWrapper, .progress-bar > .slider-container'
        )
    }

    get currentTimeFromElement() {
        const currentTimeElement = this.currentTimeElement
        const currentTime =
            currentTimeElement?.getAttribute('aria-valuenow') ?? currentTimeElement?.textContent
        return currentTime?.includes(':') ? parseTime(currentTime) : Number(currentTime)
    }

    get currentTime() {
        return this.currentTimeElement ? this.currentTimeFromElement : this._element.currentTime
    }

    get durationElement() {
        return document.querySelector(
            '.playbackTimeline__duration > span:last-child, .progress-bar > .slider-container'
        )
    }

    get durationFromElement() {
        const durationElement = this.durationElement
        const duration =
            durationElement?.getAttribute('aria-valuemax') || durationElement?.textContent
        return duration?.includes(':') ? parseTime(duration) : Number(duration)
    }

    get duration() {
        return this.durationElement ? this.durationFromElement : this._element.duration || 0
    }

    // TODO: setup for soundcloud only
    get elementPlayState() {
        if (!this.playPauseElement) return 'paused'

        return this.playPauseElement.classList.contains('playing') ? 'playing' : 'paused'
    }

    get isAudio() {
        if (!this._element) return false

        return this._element.tagName.toLowerCase() === 'audio'
    }

    get playbackState() {
        if (this.playPauseElement) return this.elementPlayState
        return this._element.paused ? 'paused' : 'playing'
    }

    get isLooping() {
        if (!this.isAudio) return this._element.loop
        return this._element.loop
    }

    get element() {
        return this._element
    }

    get state() {
        return {
            duration: this.duration,
            position: this.currentTime,
            isLooping: this._element.loop ?? false,
            playbackState: this.playbackState
        }
    }
}

export default defineUnlistedScript({
    main() {
        console.log('media-player')
        return true
    }
})
