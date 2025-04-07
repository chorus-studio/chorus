import Reverb from '$lib/audio-effects/reverb'
import Equalizer from '$lib/audio-effects/equalizer'
import AudioManager from '$lib/audio-effects/audio-manager'

type MediaOverrideOptions = {
    source: HTMLMediaElement
    equalizer: Equalizer
    reverb: Reverb
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
        this.equalizer = options.equalizer
        this.reverb = options.reverb
        this.audioManager = options.audioManager
    }

    addSource(source: HTMLMediaElement): void {
        if ((source as any).isPlaybackRateChanged) return
        ;(source as any).isPlaybackRateChanged = true
        this._sources.push(source)
    }

    updatePlaybackSettings(value: { playback_rate: number; preserves_pitch: boolean }): void {
        this.source.defaultPlaybackRate = 1
        this.source.playbackRate = value.playback_rate
        this.source.preservesPitch = value.preserves_pitch
    }

    updateSeek(data: { type: 'skip_back' | 'skip_forward'; value: number }): void {
        if (data.type === 'skip_back') {
            this.source.currentTime = Math.max(this.source.currentTime - data.value, 0)
        } else if (data.type === 'skip_forward') {
            this.source.currentTime = Math.min(
                this.source.currentTime + data.value,
                this.source.duration
            )
        }
    }

    updateVolume(data: { value: number; muted: boolean; type: 'linear' | 'logarithmic' }): void {
        // Scale volume: 0-300 -> 0-3 for gain node, 0-1 for regular source
        const scaledValue = data.value / 100

        if (this.audioManager) {
            // Use the audio manager to set gain
            this.audioManager.setGain(data.muted ? 0 : scaledValue, data.type)
        } else {
            // Fallback to direct volume control
            this.source.volume = data.muted ? 0 : Math.min(1, scaledValue)
        }
    }

    updateCurrentTime(data: number): void {
        this.source.currentTime = data
    }

    async updateAudioEffect(effect: { clear?: boolean; reverb?: string; equalizer?: string }) {
        if (!this.audioManager || !this.equalizer || !this.reverb) return

        try {
            // Ensure audio chain is ready
            await this.audioManager.ensureAudioChainReady()

            // Disconnect everything first
            this.audioManager.disconnect()
            if (effect.clear) return

            // Apply effects if specified
            if (effect?.equalizer && effect.equalizer !== 'none') {
                this.equalizer.setEQEffect(effect.equalizer)
            }

            if (effect?.reverb && effect.reverb !== 'none') {
                await this.reverb.setReverbEffect(effect.reverb)
            }
        } catch (error) {
            console.error('Error updating audio effects:', error)
            // On error, ensure audio still works by connecting directly
            this.audioManager.disconnect()
        }
    }
}
