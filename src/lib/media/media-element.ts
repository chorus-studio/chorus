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
    private static hasGlobalListener = false

    constructor(source: HTMLMediaElement) {
        this.source = source
        this.source.crossOrigin = 'anonymous'

        // Store reference on source so global listener can find it
        ;(this.source as any)._chorusMediaElement = this

        this.setupEventListeners()
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
            if (this.mediaOverride) return

            this.loadMediaOverride()
            document.dispatchEvent(new CustomEvent('FROM_MEDIA_PLAY_INIT'))
        })

        // Register global listener only once for entire session
        if (!MediaElement.hasGlobalListener) {
            MediaElement.setupGlobalMessageListener()
            MediaElement.hasGlobalListener = true
        }
    }

    private static setupGlobalMessageListener(): void {
        window.addEventListener('message', (event) => {
            // Verify the origin for security
            if (event.source !== window) return
            if (event.data === '@execute_deferreds') return

            try {
                const { type, data } = event.data

                // Get current media source (always the active MediaElement)
                const currentSource = (window as any).mediaSource
                if (!currentSource) return

                // Get MediaElement instance attached to current source
                const mediaElement = (currentSource as any)._chorusMediaElement as MediaElement
                if (!mediaElement?.mediaOverride) return

                // Process message for current MediaElement
                switch (type) {
                    case 'FROM_NEW_RELEASES':
                        ;(window as any).navigateTo(data)
                        break
                    case 'FROM_PLAYBACK_LISTENER':
                        mediaElement.mediaOverride.updateSoundTouch({
                            pitch: Number(data?.pitch) || 1,
                            semitone: Number(data?.semitone) || 0
                        })
                        mediaElement.mediaOverride.updatePlaybackSettings(data.rate as Rate)
                        break

                    case 'FROM_EFFECTS_LISTENER':
                        mediaElement.mediaOverride.updateAudioEffect({
                            clear: Boolean(data?.clear),
                            reverb: data?.reverb ? String(data.reverb) : undefined,
                            equalizer: data?.equalizer ? String(data.equalizer) : undefined
                        })
                        break

                    case 'FROM_VOLUME_LISTENER':
                        mediaElement.mediaOverride.updateVolume({
                            value: Number(data?.value) || 0,
                            muted: Boolean(data?.muted),
                            type: String(data?.type) as 'linear' | 'logarithmic'
                        })
                        break

                    case 'FROM_CURRENT_TIME_LISTENER':
                        mediaElement.mediaOverride.updateCurrentTime(Number(data) || 0)
                        break
                }
            } catch (error) {
                console.warn('Error handling message:', error)
            }
        })
    }

    dispose(): void {
        // Clean up audio manager
        if (this._audioManager) {
            this._audioManager.dispose()
            this._audioManager = null
        }

        // Clean up reverb
        if (this._reverb) {
            (this._reverb as any).cleanup?.()
            this._reverb = null
        }

        // Clean up equalizer
        if (this._equalizer) {
            this._equalizer.disconnect()
            this._equalizer = null
        }

        // Clear media override
        this.mediaOverride = undefined

        // Remove reference from source
        delete (this.source as any)._chorusMediaElement
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
