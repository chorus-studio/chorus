import Reverb from '$lib/audio-effects/reverb'
import Equalizer from '$lib/audio-effects/equalizer'
import AudioManager from '$lib/audio-effects/audio-manager'
import type { SoundTouchData, Rate } from '$lib/stores/playback'

type MediaOverrideOptions = {
    reverb: Reverb
    equalizer: Equalizer
    source: HTMLMediaElement
    audioManager: AudioManager
}

export default class MediaOverride {
    private reverb: Reverb
    private equalizer: Equalizer
    private source: HTMLMediaElement
    private audioManager: AudioManager
    private _sources: any[] = []

    constructor(options: MediaOverrideOptions) {
        this.source = options.source
        this.reverb = options.reverb
        this.equalizer = options.equalizer
        this.audioManager = options.audioManager

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

        // from spotify
        return this.playbackRate
    }

    private handlePreservesPitchSetting(this: HTMLMediaElement, value: any) {
        // Check if the value is coming from chorus
        if (value?.source === 'chorus') return value.value

        // from spotify
        return this.preservesPitch
    }

    addSource(source: HTMLMediaElement): void {
        if ((source as any).isPlaybackRateChanged) return
        ;(source as any).isPlaybackRateChanged = true
        this._sources.push(source)
    }

    updatePlaybackSettings(rate: Rate): void {
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

    async updateAudioEffect(effect: { clear?: boolean; reverb?: string; equalizer?: string }) {
        if (!this.audioManager || !this.equalizer || !this.reverb) return

        try {
            await this.audioManager.ensureAudioChainReady()
            this.audioManager.disconnect()

            if (effect.clear) return

            if (effect?.equalizer) this.equalizer.setEQEffect(effect.equalizer)
            if (effect?.reverb) await this.reverb.setReverbEffect(effect.reverb)
        } catch (error) {
            console.error('Error updating audio effects:', error)
            this.audioManager.disconnect()
        }
    }
}
