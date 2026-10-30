import MediaOverride from './media-override'
import Reverb from '$lib/audio-effects/reverb'
import type { Rate } from '$lib/stores/playback'
import Equalizer from '$lib/audio-effects/equalizer'
import MSProcessor from '$lib/audio-effects/ms-processor'
import AudioManager from '$lib/audio-effects/audio-manager'
import Lofi from '$lib/audio-effects/lofi-rack'

export default class MediaElement {
    private source: HTMLMediaElement
    private _lofi: Lofi | null = null
    private _reverb: Reverb | null = null
    public mediaOverride?: MediaOverride
    private _equalizer: Equalizer | null = null
    private _msProcessor: MSProcessor | null = null
    private _audioManager: AudioManager | null = null
    private _disabled: boolean = false
    public pendingVolume: { value: number; muted: boolean; type: 'linear' | 'logarithmic' } | null =
        null

    constructor(source: HTMLMediaElement) {
        this.source = source
        this.source.crossOrigin = 'anonymous'
        this.setupEventListeners()
    }

    private loadMediaOverride(): void {
        if (this.mediaOverride) return

        // Initialize audio effects
        this._audioManager = new AudioManager(this.source)
        this._reverb = new Reverb(this._audioManager)
        this._equalizer = new Equalizer(this._audioManager)
        this._msProcessor = new MSProcessor(this._audioManager)
        this._lofi = new Lofi(this._audioManager)

        this.mediaOverride = new MediaOverride({
            source: this.source,
            lofi: this._lofi!,
            reverb: this._reverb!,
            equalizer: this._equalizer!,
            msProcessor: this._msProcessor!,
            audioManager: this._audioManager!
        })
    }

    private setupEventListeners(): void {
        this.source.addEventListener('timeupdate', () => {
            document.dispatchEvent(
                new CustomEvent('FROM_MEDIA_TIMEUPDATE', {
                    detail: { currentTime: this.source.currentTime }
                })
            )
        })

        // The lofi rack's crackle is a looping sample: it follows play / pause so
        // a paused Spotify stays silent.
        this.source.addEventListener('pause', () => this.mediaOverride?.setPlaying(false))

        this.source.addEventListener('play', () => {
            if (this.mediaOverride) {
                this.mediaOverride.setPlaying(true)
                return
            }
            // Don't build the Chorus audio chain while the extension is disabled
            if (this._disabled) return

            this.loadMediaOverride()

            // Apply any volume setting that arrived before mediaOverride was ready
            const override = this.mediaOverride as MediaOverride | undefined
            if (this.pendingVolume && override) {
                override.updateVolume(this.pendingVolume)
                this.pendingVolume = null
            }

            document.dispatchEvent(new CustomEvent('FROM_MEDIA_PLAY_INIT'))
        })

        window.addEventListener('message', (event) => {
            if (event.source !== window) return
            if (event.data === '@execute_deferreds') return

            try {
                const { type, data } = event.data

                // Master on/off: handled even before the audio chain exists so the
                // disabled flag can gate chain-building on the next play.
                if (type === 'FROM_ENABLED_LISTENER') {
                    this._disabled = data?.enabled === false
                    if (this.mediaOverride) {
                        if (this._disabled) this.mediaOverride.teardown()
                        else this.mediaOverride.rearm()
                    }
                    return
                }

                // While disabled, ignore every audio update (effects/playback/volume/
                // ms/seek) so nothing rebuilds the bypassed graph or buffers a stale
                // override for the next play.
                if (this._disabled) return

                if (!this.mediaOverride) {
                    if (type === 'FROM_VOLUME_LISTENER') {
                        this.pendingVolume = {
                            value: Number(data?.value) || 0,
                            muted: Boolean(data?.muted),
                            type: String(data?.type) as 'linear' | 'logarithmic'
                        }
                    }
                    return
                }

                switch (type) {
                    case 'FROM_NEW_RELEASES':
                        ;(window as any).navigateTo(data)
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
                            equalizer: data?.equalizer ? String(data.equalizer) : undefined,
                            msProcessor: data?.msProcessor ? String(data.msProcessor) : undefined
                        })
                        break

                    case 'FROM_LOFI_LISTENER':
                        this.mediaOverride.updateLofi(data)
                        break

                    case 'FROM_LOFI_TWEAK_LISTENER':
                        this.mediaOverride.tweakLofi(data)
                        break

                    case 'FROM_MS_PARAMS_LISTENER':
                        this.mediaOverride.updateMSParams(data)
                        break

                    case 'FROM_REVERB_PARAMS_LISTENER':
                        this.mediaOverride.updateReverbParams(data)
                        break

                    case 'FROM_EQ_PARAMS_LISTENER':
                        this.mediaOverride.updateEqBands(data)
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

                    case 'FROM_SLEEP_LISTENER':
                        if (data?.action === 'fade') {
                            this.mediaOverride.sleepFade(Number(data.seconds) || 0)
                        } else if (data?.action === 'restore') {
                            this.mediaOverride.sleepRestore()
                        }
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
