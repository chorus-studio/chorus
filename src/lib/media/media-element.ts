import MediaOverride from './media-override'
import Reverb from '$lib/audio-effects/reverb'
import Equalizer from '$lib/audio-effects/equalizer'
import AudioManager from '$lib/audio-effects/audio-manager'

interface MediaElementOptions {
    source: HTMLMediaElement
    equalizer: Equalizer
    reverb: Reverb
    audioManager: AudioManager
}

export default class MediaElement {
    private source: HTMLMediaElement
    private _reverb: Reverb | null = null
    private _equalizer: Equalizer | null = null
    private _audioManager: AudioManager | null = null
    public mediaOverride: MediaOverride

    constructor(options: MediaElementOptions) {
        this.source = options.source
        this.source.crossOrigin = 'anonymous'

        // Initialize audio effects
        this._audioManager = options.audioManager
        this._equalizer = options.equalizer
        this._reverb = options.reverb

        // Create MediaOverride with the correct parameters
        this.mediaOverride = new MediaOverride({
            source: this.source,
            equalizer: this._equalizer!,
            reverb: this._reverb!,
            audioManager: this._audioManager!
        })

        // Set up event listeners
        this.setupEventListeners()
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

        // Set up window message listener
        window.addEventListener('message', (event) => {
            // Verify the origin for security
            if (event.source !== window) return
            if (event.data === '@execute_deferreds') return

            try {
                const { type, data } = event.data

                switch (type) {
                    case 'FROM_PLAYBACK_LISTENER':
                        this.mediaOverride.updatePlaybackSettings({
                            playback_rate: Number(data?.playback_rate) || 1,
                            preserves_pitch: Boolean(data?.preserves_pitch)
                        })
                        break

                    case 'FROM_SEEK_LISTENER':
                        this.mediaOverride.updateSeek({
                            type: String(data?.type) as 'skip_back' | 'skip_forward',
                            value: Number(data?.value) || 0
                        })
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

    async updateAudioEffect(effect: {
        clear?: boolean
        reverb?: string
        equalizer?: string
    }): Promise<void> {
        if (!this._audioManager || !this._equalizer || !this._reverb) return

        try {
            // Ensure audio chain is ready
            await this._audioManager.ensureAudioChainReady()

            // Disconnect everything first
            this._audioManager.disconnect()

            if (effect.clear) return

            // Apply effects if specified
            if (effect.equalizer && effect.equalizer !== 'none') {
                this._equalizer.setEQEffect(effect.equalizer)
            }

            if (effect.reverb && effect.reverb !== 'none') {
                await this._reverb.setReverbEffect(effect.reverb)
            }
        } catch (error) {
            console.error('Error updating audio effects:', error)
            // On error, ensure audio still works by connecting directly
            this._audioManager.disconnect()
        }
    }
}
