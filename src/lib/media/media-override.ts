import Reverb from '$lib/audio-effects/reverb'
import Equalizer from '$lib/audio-effects/equalizer'
import MSProcessor from '$lib/audio-effects/ms-processor'
import AudioManager from '$lib/audio-effects/audio-manager'
import type { SoundTouchData, Rate } from '$lib/stores/playback'
import type { MSParams } from '$lib/stores/ms-params'
import type { ReverbParams } from '$lib/stores/reverb-params'
import type Lofi from '$lib/audio-effects/lofi-rack'
import type { EffectSettings } from '$lib/audio-effects/lofi/audio/effect-settings'

type MediaOverrideOptions = {
    lofi: Lofi
    reverb: Reverb
    equalizer: Equalizer
    msProcessor: MSProcessor
    source: HTMLMediaElement
    audioManager: AudioManager
}

export default class MediaOverride {
    private lofi: Lofi
    private reverb: Reverb
    private equalizer: Equalizer
    private msProcessor: MSProcessor
    private source: HTMLMediaElement
    private audioManager: AudioManager
    private _sources: any[] = []
    private _chorusRate: number = 1
    private _chorusPreservesPitch: boolean = true
    // Chain rebuilds run one at a time, in the order they were asked for.
    private _effectQueue: Promise<void> = Promise.resolve()
    // Master-off state. While disabled the audio graph must stay bypassed; this
    // guards against a late-resuming async effect update silently rebuilding it.
    private _disabled: boolean = false
    // Speed/pitch captured at disable time so it can be resumed on re-enable.
    private _savedRate: number = 1
    private _savedPreservesPitch: boolean = true

    constructor(options: MediaOverrideOptions) {
        this.source = options.source
        this.lofi = options.lofi
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
        if (!this.audioManager || !this.audioManager.isReady) return

        try {
            await this.audioManager.ensureAudioChainReady()
            await this.audioManager.applySoundTouch(data)
        } catch (error) {
            console.error('Error updating sound touch:', error)
        }
    }

    async updateAudioEffect(effect: {
        clear?: boolean
        reverb?: string
        equalizer?: string
        msProcessor?: string
    }) {
        if (
            !this.audioManager ||
            !this.audioManager.isReady ||
            !this.equalizer ||
            !this.reverb ||
            !this.msProcessor
        ) {
            return
        }

        // Extension is off — never (re)build the effect chain.
        if (this._disabled) return

        // One effect update at a time: rapid changes would otherwise interleave
        // their chain rebuilds and double-apply nodes.
        await this.runExclusive(async () => {
            try {
                await this.audioManager.ensureAudioChainReady()

                // A disable may have landed while we were awaiting; if so, re-assert
                // the bypass instead of rebuilding the chain the user just turned off.
                if (this._disabled) {
                    this.audioManager.bypass()
                    return
                }

                // Mute before chain rebuild to prevent clicks from signal discontinuity
                this.audioManager.muteForTransition()

                // Start from a bare chain. disconnect() drops the lofi rack with the
                // rest, so it goes straight back in while its effects are on.
                this.audioManager.disconnect()
                this.lofi.reconnect()

                // If clear is requested, that is all
                if (effect.clear) {
                    this.audioManager.unmuteAfterTransition()
                    return
                }

                // Apply effects in the order they'll be chained: lofi → equalizer → MS processor → reverb
                // Each effect can be applied independently
                if (effect?.equalizer && effect.equalizer !== 'none') {
                    this.equalizer.setEQEffect(effect.equalizer)
                }

                // Apply MS processor (can be combined with any other effect)
                if (effect?.msProcessor && effect.msProcessor !== 'none') {
                    await this.msProcessor.setMSEffect(effect.msProcessor)
                }

                // Apply reverb (can be combined with any other effect)
                if (effect?.reverb && effect.reverb !== 'none') {
                    await this.reverb.setReverbEffect(effect.reverb)
                }

                // Smooth fade-in after all effects are configured
                this.audioManager.unmuteAfterTransition()
            } catch (error) {
                console.error('Error updating audio effects:', error)
                this.audioManager.disconnect()
                this.lofi.reconnect()
                this.audioManager.unmuteAfterTransition()
            }
        })
    }

    /**
     * The lovelofi rack: every setting arrives at once, so this is one call on
     * the rack plus adding it to, or dropping it from, the chain as its effects
     * come and go. Queued with updateAudioEffect since both rebuild the chain.
     */
    async updateLofi(settings: EffectSettings): Promise<void> {
        if (!this.audioManager || !this.audioManager.isReady || !this.lofi) return
        if (this._disabled) return

        await this.runExclusive(async () => {
            try {
                await this.audioManager.ensureAudioChainReady()
                if (this._disabled) {
                    this.audioManager.bypass()
                    return
                }
                // Loading the rack is the slow part and touches no wiring, so
                // it happens unmuted; only the rewire is silenced.
                await this.lofi.prepare(settings)
                if (this._disabled) {
                    this.audioManager.bypass()
                    return
                }
                this.audioManager.muteForTransition()
                this.lofi.apply(settings)
                this.audioManager.unmuteAfterTransition()
            } catch (error) {
                console.error('Error updating lofi effects:', error)
                this.audioManager.unmuteAfterTransition()
            }
        })
    }

    /**
     * An intensity from a slider being dragged. Straight onto the rack when
     * only intensities changed; otherwise the ordinary queued, muted update.
     */
    tweakLofi(settings: EffectSettings): void {
        if (!this.audioManager || !this.audioManager.isReady || !this.lofi) return
        if (this._disabled) return
        if (!this.lofi.tweak(settings)) void this.updateLofi(settings)
    }

    /** Pause and play, for the rack's crackle loop. */
    setPlaying(playing: boolean): void {
        this.lofi?.setPlaying(playing)
    }

    private runExclusive(task: () => Promise<void>): Promise<void> {
        const run = this._effectQueue.then(task, task)
        this._effectQueue = run.catch(() => {})
        return run
    }

    async updateMSParams(params: MSParams): Promise<void> {
        if (!this.msProcessor || !this.audioManager.isReady) return

        try {
            await this.audioManager.ensureAudioChainReady()
            await this.msProcessor.applyManualParams(params)
        } catch (error) {
            console.error('Error updating MS params:', error)
        }
    }

    /**
     * The output limiter's A/B switch. Bypassed (extension off) or before the
     * chain exists, the flag just waits for the next build; on a live chain the
     * last hop is re-routed under a short mute, since the limiter's 5 ms of
     * lookahead joining or leaving the path would otherwise click.
     */
    async setLimiter(enabled: boolean): Promise<void> {
        if (!this.audioManager) return
        if (this._disabled || !this.audioManager.isReady) {
            this.audioManager.setLimiterEnabled(enabled)
            return
        }

        await this.runExclusive(async () => {
            try {
                await this.audioManager.ensureAudioChainReady()
                this.audioManager.muteForTransition()
                this.audioManager.setLimiterEnabled(enabled)
                await new Promise((resolve) => setTimeout(resolve, 30))
                this.audioManager.unmuteAfterTransition()
            } catch (error) {
                console.error('Error switching the output limiter:', error)
                this.audioManager.unmuteAfterTransition()
            }
        })
    }

    async updateReverbParams(params: ReverbParams): Promise<void> {
        if (!this.reverb || !this.audioManager.isReady) return

        try {
            await this.audioManager.ensureAudioChainReady()
            await this.reverb.applyManualParams(params)
        } catch (error) {
            console.error('Error updating reverb params:', error)
        }
    }

    async updateEqBands(gains: number[]): Promise<void> {
        if (!this.equalizer || !this.audioManager.isReady) return

        try {
            await this.audioManager.ensureAudioChainReady()
            this.equalizer.applyManualGains(gains)
        } catch (error) {
            console.error('Error updating EQ bands:', error)
        }
    }

    /**
     * Master OFF: hand the element back to vanilla Spotify behaviour. Removes the
     * per-element playbackRate/preservesPitch accessor overrides (reverting to the
     * native HTMLMediaElement.prototype) and bypasses the audio graph so no effects,
     * gain, or speed/pitch processing remain. The chain is kept alive for instant
     * re-enable.
     */
    teardown(): void {
        this._disabled = true
        // Remember the active speed/pitch so re-enable can resume it.
        this._savedRate = this._chorusRate
        this._savedPreservesPitch = this._chorusPreservesPitch

        this._chorusRate = 1
        this._chorusPreservesPitch = true
        try {
            delete (this.source as any).playbackRate
        } catch (e) {
            // ignore — property may not be configurable in some engines
        }
        try {
            delete (this.source as any).preservesPitch
        } catch (e) {
            // ignore
        }
        // The element retained the last Chorus tempo; reset it to vanilla 1x now
        // that the override is gone (uses the native setter).
        try {
            ;(this.source as any).playbackRate = 1
        } catch (e) {
            // ignore
        }
        this.audioManager.bypass()
    }

    /**
     * Master ON: re-install the property overrides, rebuild the Chorus audio chain,
     * and resume the speed/pitch that were active before disabling. Effects/preset
     * re-apply on top via the normal store dispatch once the UI re-mounts.
     */
    rearm(): void {
        this._disabled = false
        this.overrideMediaProperty('playbackRate', this.handlePlaybackRateSetting)
        this.overrideMediaProperty('preservesPitch', this.handlePreservesPitchSetting)
        this.audioManager.restoreChain()

        // Resume the pre-disable speed/pitch (the soundTouch worklet still holds its
        // pitch settings; this re-applies the element tempo the override drives).
        if (this._savedRate !== 1 || !this._savedPreservesPitch) {
            this.updatePlaybackSettings({
                value: this._savedRate,
                preserves_pitch: this._savedPreservesPitch
            } as Rate)
        }
    }
}
