import MediaOverride from './media-override'
import Reverb from '$lib/audio-effects/reverb'
import type { Rate } from '$lib/stores/playback'
import Equalizer from '$lib/audio-effects/equalizer'
import AudioManager from '$lib/audio-effects/audio-manager'
export default class MediaElement {
    private source: HTMLMediaElement
    private _reverb: Reverb | null = null
    public mediaOverride?: MediaOverride
    private _equalizer: Equalizer | null = null
    private _audioManager: AudioManager | null = null

    constructor(source: HTMLMediaElement) {
        this.source = source
        this.source.crossOrigin = 'anonymous'
        this.setupEventListeners()
        this.loadMediaOverride()
    }

    private loadMediaOverride(): void {
        if (this.mediaOverride) return

        // Initialize audio effects
        this._audioManager = new AudioManager(this.source)
        this._reverb = new Reverb(this._audioManager)
        this._equalizer = new Equalizer(this._audioManager)

        this.mediaOverride = new MediaOverride({
            source: this.source,
            reverb: this._reverb!,
            equalizer: this._equalizer!,
            audioManager: this._audioManager!
        })
    }

    private setupEventListeners(): void {
        // Add timeupdate event listener
        this.source.addEventListener('timeupdate', () => {
            document.dispatchEvent(
                new CustomEvent('FROM_MEDIA_TIMEUPDATE', {
                    detail: { currentTime: this.source.currentTime }
                })
            )
        })

        this.source.addEventListener('play', async () => {
            document.dispatchEvent(new CustomEvent('FROM_MEDIA_PLAY_INIT'))
        })

        // Set up window message listener
        window.addEventListener('message', (event) => {
            // Verify the origin for security
            if (event.source !== window) return
            if (event.data === '@execute_deferreds') return

            try {
                const { type, data } = event.data
                if (!this.mediaOverride) return

                switch (type) {
                    case 'FROM_NEW_RELEASES':
                        window.navigateTo(data)
                        break
                    case 'FROM_PLAYBACK_LISTENER':
                        this.mediaOverride.updateSoundTouch({
                            pitch: Number(data?.pitch) || 1,
                            semitone: Number(data?.semitone) || 0
                        })
                        this.mediaOverride.updatePlaybackSettings(data.rate as Rate)
                        break

                    case 'FROM_EFFECTS_LISTENER':
                        this.mediaOverride.updateAudioEffect({
                            clear: Boolean(data?.clear),
                            reverb: data?.reverb ? String(data.reverb) : undefined,
                            equalizer: data?.equalizer ? String(data.equalizer) : undefined
                        })
                        break

                    case 'FROM_VOLUME_LISTENER':
                        this.mediaOverride.updateVolume({
                            value: Number(data?.value) || 0,
                            muted: Boolean(data?.muted),
                            type: String(data?.type) as 'linear' | 'logarithmic'
                        })
                        break

                    case 'FROM_CURRENT_TIME_LISTENER':
                        this.mediaOverride.updateCurrentTime(Number(data) || 0)
                        break
                }
            } catch (error) {
                console.warn('Error handling message:', error)
            }
        })
    }

    get audioManager(): AudioManager | null {
        return this._audioManager
    }

    get reverb(): Reverb | null {
        return this._reverb
    }

    get equalizer(): Equalizer | null {
        return this._equalizer
    }

    get element(): HTMLMediaElement {
        return this.source
    }
}
