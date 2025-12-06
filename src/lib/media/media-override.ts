import Reverb from '$lib/audio-effects/reverb'
import Equalizer from '$lib/audio-effects/equalizer'
import MSProcessor from '$lib/audio-effects/ms-processor'
import AudioManager from '$lib/audio-effects/audio-manager'
import type { SoundTouchData, Rate } from '$lib/stores/playback'

type MediaOverrideOptions = {
    reverb: Reverb
    equalizer: Equalizer
    msProcessor: MSProcessor
    source: HTMLMediaElement
    audioManager: AudioManager
}

export default class MediaOverride {
    private reverb: Reverb
    private equalizer: Equalizer
    private msProcessor: MSProcessor
    private source: HTMLMediaElement
    private audioManager: AudioManager
    private _sources: any[] = []
    private _chorusRate: number = 1
    private _chorusPreservesPitch: boolean = true

    constructor(options: MediaOverrideOptions) {
        this.source = options.source
        this.reverb = options.reverb
        this.equalizer = options.equalizer
        this.msProcessor = options.msProcessor
        this.audioManager = options.audioManager

        // Store reference to this MediaOverride instance on the media element
        ;(this.source as any).__chorusMediaOverride = this

        // Override playbackRate and preservesPitch properties
        this.overrideMediaProperty('playbackRate', this.handlePlaybackRateSetting)
        this.overrideMediaProperty('preservesPitch', this.handlePreservesPitchSetting)
    }

    // Function to override media element properties
    private overrideMediaProperty(
        propertyName: string,
        handler: (this: HTMLMediaElement, value: any) => any
    ) {
        const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, propertyName)

        if (!descriptor || (descriptor as any)._isOverridden) return

        Object.defineProperty(this.source, propertyName, {
            set: (value) => {
                const newValue = handler.call(this.source, value)
                if (descriptor.set) {
                    descriptor.set.call(this.source, newValue ?? value)
                }
            },
            get: descriptor.get,
            enumerable: descriptor.enumerable,
            configurable: descriptor.configurable
        })

        Object.defineProperty(descriptor, '_isOverridden', {
            value: true,
            writable: false,
            enumerable: false,
            configurable: false
        })
    }

    private handlePlaybackRateSetting(this: HTMLMediaElement, value: any) {
        // Check if the value is coming from chorus
        if (value?.source === 'chorus') return value.value

        // When Spotify tries to set playback rate, preserve the chorus rate if we have one
        const mediaOverride = (this as any).__chorusMediaOverride as MediaOverride | undefined
        if (mediaOverride && mediaOverride._chorusRate !== 1) {
            return mediaOverride._chorusRate
        }

        // from spotify - only allow if no chorus rate is set
        return value
    }

    private handlePreservesPitchSetting(this: HTMLMediaElement, value: any) {
        // Check if the value is coming from chorus
        if (value?.source === 'chorus') return value.value

        // When Spotify tries to set preservesPitch, preserve the chorus setting if we have one
        const mediaOverride = (this as any).__chorusMediaOverride as MediaOverride | undefined
        if (mediaOverride) {
            return mediaOverride._chorusPreservesPitch
        }

        // from spotify
        return value
    }

    addSource(source: HTMLMediaElement): void {
        if ((source as any).isPlaybackRateChanged) return
        ;(source as any).isPlaybackRateChanged = true
        this._sources.push(source)
    }

    updatePlaybackSettings(rate: Rate): void {
        // Store the chorus values for later use when Spotify tries to override
        this._chorusRate = rate.value
        this._chorusPreservesPitch = rate.preserves_pitch

        // Use our property override mechanism with a special format
        const playbackRateValue = { source: 'chorus', value: rate.value }
        const preservesPitchValue = { source: 'chorus', value: rate.preserves_pitch }

        // Use type assertion to bypass TypeScript's type checking
        ;(this.source as any).playbackRate = playbackRateValue
        ;(this.source as any).preservesPitch = preservesPitchValue
    }

    updateVolume(data: { value: number; muted: boolean; type: 'linear' | 'logarithmic' }): void {
        // Scale volume: 0-300 -> 0-3 for gain node, 0-1 for regular source
        const scaledValue = data.value / 100

        if (this.audioManager) {
            this.audioManager.setGain(data.muted ? 0 : scaledValue, data.type)
        } else {
            this.source.volume = data.muted ? 0 : Math.min(1, scaledValue)
        }
    }

    updateCurrentTime(data: number): void {
        this.source.currentTime = data
    }

    async updateSoundTouch(data: SoundTouchData) {
        if (!this.audioManager) return

        try {
            await this.audioManager.ensureAudioChainReady()
            await this.audioManager.applySoundTouch(data)
        } catch (error) {
            console.error('Error updating sound touch:', error)
        }
    }

    async updateAudioEffect(effect: { clear?: boolean; reverb?: string; equalizer?: string; msProcessor?: string }) {
        console.log('MediaOverride.updateAudioEffect called with:', effect)
        if (!this.audioManager || !this.equalizer || !this.reverb || !this.msProcessor) {
            console.warn('Missing dependencies:', {
                audioManager: !!this.audioManager,
                equalizer: !!this.equalizer,
                reverb: !!this.reverb,
                msProcessor: !!this.msProcessor
            })
            return
        }

        try {
            await this.audioManager.ensureAudioChainReady()

            // If clear is requested, disconnect all effects
            if (effect.clear) {
                console.log('Clearing all effects')
                this.audioManager.disconnect()
                return
            }

            // Disconnect all effects first
            this.audioManager.disconnect()

            // Apply frequency-domain effect (mutually exclusive: reverb OR equalizer)
            // Priority: reverb > equalizer
            if (effect?.reverb && effect.reverb !== 'none') {
                console.log('Applying reverb effect:', effect.reverb)
                await this.reverb.setReverbEffect(effect.reverb)
            } else if (effect?.equalizer && effect.equalizer !== 'none') {
                console.log('Applying equalizer effect:', effect.equalizer)
                this.equalizer.setEQEffect(effect.equalizer)
            }

            // Apply MS processor (can be combined with any frequency-domain effect)
            // This is a stereo transformation that's independent of frequency/time processing
            if (effect?.msProcessor && effect.msProcessor !== 'none') {
                console.log('Applying MS processor effect:', effect.msProcessor)
                await this.msProcessor.setMSEffect(effect.msProcessor)
            }

            console.log('Effect applied successfully')
        } catch (error) {
            console.error('Error updating audio effects:', error)
            this.audioManager.disconnect()
        }
    }
}
