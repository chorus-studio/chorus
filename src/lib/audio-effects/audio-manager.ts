import SoundTouch from './soundtouch'
import { createLimiter } from './limiter'
import { disposeWorklet } from './worklet'
import { SoundTouchData } from '$lib/stores/playback'

export default class AudioManager {
    private _gainNode?: GainNode
    private _soundTouchNode?: AudioNode
    // Output limiter (see ./limiter.ts): every processed chain ends
    // soundTouch → gain → limiter → destination. The volume gain sits after
    // the effects, not before them, so a boost past 100% does not drive the
    // saturating effects harder; the limiter then holds the boosted sum under
    // full scale. The bypass (extension off) goes straight to the destination.
    private _limiterNode?: AudioWorkletNode
    private _limiterEnabled = true
    // The node feeding the output hop right now, so the limiter can be switched
    // in or out of a live chain without rebuilding it.
    private _outputSource?: AudioNode
    private _audioContext?: AudioContext
    private _soundTouchManager?: SoundTouch | null
    private _destination?: AudioDestinationNode

    private _setupPromise?: Promise<void>
    private _isInitialized: boolean = false

    private _element: HTMLMediaElement | MediaStream
    private _source?: MediaStreamAudioSourceNode | MediaElementAudioSourceNode
    private _sourceMap: Map<HTMLMediaElement, MediaElementAudioSourceNode> = new Map()

    private _currentVolume: number = 1
    private _volumeType: 'linear' | 'logarithmic' = 'linear'
    private _preTransitionGain: number | null = null

    // Track active effect nodes for multi-effect chaining
    // Some effects (like equalizer and the lofi rack) have separate input/output nodes
    private _activeEffects: {
        lofi?: { input: AudioNode; output: AudioNode }
        equalizer?: { input: AudioNode; output: AudioNode } | AudioNode
        msProcessor?: AudioWorkletNode
        reverb?: AudioNode
    } = {}

    // Track the impulse reverb's dry/wet split for proper cleanup
    private _reverbGainNodes: { dry?: GainNode; wet?: GainNode } = {}

    constructor(element: HTMLVideoElement | HTMLAudioElement) {
        this._element = element
        this._setupPromise = this.initialize()
    }

    private async initialize(): Promise<void> {
        // For non-HTMLMediaElement sources, just use direct playback
        if (!(this._element instanceof HTMLMediaElement)) return

        // Set crossOrigin to anonymous to handle CORS
        this._element.crossOrigin = 'anonymous'

        // Handle CORS errors
        this._element.addEventListener('error', (e) => {
            // Don't block playback on CORS errors
            if (this._element instanceof HTMLMediaElement) {
                this.applyElementVolume()
            }
        })

        // Check if the source is cross-origin
        try {
            const currentSrc = this._element.currentSrc
            if (currentSrc) {
                const sourceUrl = new URL(currentSrc)
                const isCrossOrigin = sourceUrl.origin !== window.location.origin

                if (isCrossOrigin) {
                    // For cross-origin sources, use direct playback with stored volume
                    this.applyElementVolume()
                    return
                }
            }
        } catch (error) {
            console.warn('Error checking source origin:', error)
            // If we can't determine the origin, use direct playback to be safe
            if (this._element instanceof HTMLMediaElement) {
                this.applyElementVolume()
            }
            return
        }

        // Only proceed with Web Audio API setup for same-origin sources
        try {
            // Create AudioContext if needed
            if (!this._audioContext || this._audioContext.state === 'closed') {
                this._audioContext = new AudioContext({ latencyHint: 'playback' })
            }

            // Ensure context is running
            if (this._audioContext.state === 'suspended') {
                await this._audioContext.resume()
            }

            // Cleanup existing audio chain before re-initialization
            this.cleanup()

            // Wait for the media to be loaded before creating the audio chain
            if (this._element instanceof HTMLMediaElement) {
                if (this._element.readyState >= 2) {
                    await this.setupAudioChain()
                } else {
                    await new Promise<void>((resolve) => {
                        this._element.addEventListener('loadedmetadata', async () => {
                            await this.setupAudioChain()
                            resolve()
                        })
                    })
                }
            }

            this._isInitialized = true
        } catch (error) {
            console.error('Failed to set up Web Audio API:', error)
            // If Web Audio API setup fails, fall back to direct playback with stored volume
            if (this._element instanceof HTMLMediaElement) {
                this.applyElementVolume()
            }
            throw error
        }
    }

    private async setupAudioChain() {
        try {
            if (!this._audioContext) {
                throw new Error('AudioContext not initialized')
            }

            // Check if we already have a source node for this element
            if (this._element instanceof HTMLMediaElement) {
                const existingSource = this._sourceMap.get(this._element)
                if (existingSource) {
                    this._source = existingSource
                } else {
                    // Create new source node
                    this._source = this._audioContext.createMediaElementSource(this._element)
                    this._sourceMap.set(this._element, this._source)
                }

                // CRITICAL: When using Web Audio API, we must set the element volume to 1
                // and NOT mute it, as the routing is now controlled by the audio graph
                // The element's volume doesn't affect the Web Audio output
                this._element.volume = 1
                this._element.muted = false
            }

            // Create gain node if it doesn't exist
            if (!this._gainNode) {
                this._gainNode = this._audioContext.createGain()
                this._gainNode.channelCount = 2
                this._gainNode.channelCountMode = 'clamped-max'
            }

            if (!this._soundTouchNode) await this.loadSoundTouch()

            if (!this._limiterNode) {
                const modulePath = sessionStorage.getItem('chorus:limiter_path')
                if (modulePath) {
                    this._limiterNode = await createLimiter(this._audioContext, modulePath)
                } else {
                    console.warn(
                        'Limiter module path not found in session storage; running without'
                    )
                }
            }

            this._destination = this._audioContext.destination

            // Set up the default chain: source → soundTouch → gain → limiter → destination
            if (this.isConnectable) {
                this.source!.connect(this._soundTouchNode!)
                this._soundTouchNode!.connect(this._gainNode!)
                this.connectToOutput(this._gainNode!)
                this.setGain(this._currentVolume, this._volumeType)
            } else {
                throw new Error('Failed to create audio chain nodes')
            }
        } catch (error) {
            console.error('Failed to create audio chain:', error)
            throw error
        }
    }

    get isReady(): boolean {
        return this._isInitialized
    }

    async ensureAudioChainReady() {
        if (!this._setupPromise) {
            throw new Error('AudioManager not properly initialized')
        }

        await this._setupPromise

        if (!this._isInitialized) {
            throw new Error('AudioManager initialization failed')
        }

        if (!this._audioContext || this._audioContext.state === 'closed') {
            throw new Error('AudioContext is not available')
        }

        if (this._audioContext.state === 'suspended') {
            await this._audioContext.resume()
        }

        if (!this._source || !this._destination) {
            throw new Error('Audio chain nodes are not properly initialized')
        }
    }

    private applyElementVolume(): void {
        if (!(this._element instanceof HTMLMediaElement)) return
        const value = this._currentVolume
        const scaledValue =
            this._volumeType === 'logarithmic' ? this.linearToLogarithmic(value) : value
        this._element.volume = Math.min(1, Math.max(0, scaledValue))
        this._element.muted = value === 0
    }

    private linearToLogarithmic(value: number): number {
        // Prevent negative values
        value = Math.max(value, 0)

        if (value === 0) return 0

        // Convert to decibels (-60dB to 20dB range)
        const minDb = -60
        const maxDb = 20

        // Map 0-3 range to decibel range
        const dbScale = minDb + (maxDb - minDb) * (value / 3)

        // Convert decibels to gain
        return 10 ** (dbScale / 20)
    }

    setGain(value: number, type: 'linear' | 'logarithmic' = 'linear') {
        // Always store the requested volume so initialize() can apply it after setup
        this._currentVolume = value
        this._volumeType = type

        // For non-HTMLMediaElement sources or if Web Audio API is not available, use direct volume control
        if (!(this._element instanceof HTMLMediaElement) || !this._gainNode) {
            if (this._element instanceof HTMLMediaElement) {
                const scaledValue = type === 'logarithmic' ? this.linearToLogarithmic(value) : value
                const finalValue = Math.min(1, scaledValue)
                this._element.volume = finalValue
                this._element.muted = value === 0
            }
            return
        }

        // Special handling for muting (value = 0)
        if (value === 0) {
            this._gainNode.gain.value = 0
            return
        }

        const gainValue = type === 'logarithmic' ? this.linearToLogarithmic(value) : value
        // Ensure gain is never negative
        this._gainNode.gain.value = Math.max(0, gainValue)
    }

    /** The gain the volume settings ask for, the number setGain writes. */
    private targetGain(): number {
        if (this._currentVolume === 0) return 0
        const gain =
            this._volumeType === 'logarithmic'
                ? this.linearToLogarithmic(this._currentVolume)
                : this._currentVolume
        return Math.max(0, gain)
    }

    /**
     * Silence the chain while it is rewired. The level to come back to is the
     * one the volume asks for, not whatever the param reads right now: two
     * updates back to back (the Chorus slots, then the rack, on every page
     * load) would otherwise have the second read 0 mid-fade and "restore" it.
     * A mute inside a mute keeps the first one's bookkeeping.
     */
    muteForTransition(): void {
        if (!this._gainNode || !this._audioContext) return
        if (this._preTransitionGain === null) this._preTransitionGain = this.targetGain()
        this._gainNode.gain.cancelScheduledValues(this._audioContext.currentTime)
        this._gainNode.gain.setValueAtTime(0, this._audioContext.currentTime)
    }

    unmuteAfterTransition(fadeDuration: number = 0.005): void {
        if (!this._gainNode || !this._audioContext || this._preTransitionGain === null) return
        const now = this._audioContext.currentTime
        this._gainNode.gain.cancelScheduledValues(now)
        this._gainNode.gain.setValueAtTime(0, now)
        this._gainNode.gain.linearRampToValueAtTime(this._preTransitionGain, now + fadeDuration)
        this._preTransitionGain = null
    }

    getCurrentVolume(): number {
        return this._currentVolume
    }

    getVolumeType(): 'linear' | 'logarithmic' {
        return this._volumeType
    }

    get isConnectable() {
        return Boolean(this.source && this.destination && this._gainNode && this._soundTouchNode)
    }

    // The last hop of every processed chain: through the limiter to the
    // destination. (Each connect is idempotent, so calling this on every
    // rebuild is fine.)
    private connectToOutput(node: AudioNode) {
        if (!this.destination) return
        this._outputSource = node
        if (!this._limiterEnabled || !this._limiterNode) {
            node.connect(this.destination)
            return
        }
        node.connect(this._limiterNode)
        this._limiterNode.connect(this.destination)
    }

    get limiterEnabled() {
        return this._limiterEnabled
    }

    // The limiter's A/B switch: re-routes the last hop of a live chain in place
    // (the limiter's 5 ms of lookahead joins or leaves the path, so the caller
    // mutes around this). With no chain built, the flag waits for the build.
    setLimiterEnabled(enabled: boolean) {
        this._limiterEnabled = enabled
        const node = this._outputSource
        if (!node || !this.destination) return
        for (const target of [this._limiterNode, this.destination]) {
            try {
                if (target) node.disconnect(target)
            } catch (e) {
                // Not connected to that one; fine.
            }
        }
        this.connectToOutput(node)
    }

    getGainPairing(effect: string) {
        const pairings = {
            kick_ir: { dry: 0.75, wet: 0.25 },
            muffler_ir: { dry: 0.65, wet: 0.35 },
            diffusor_ir: { dry: 0.65, wet: 0.35 },
            telephone_ir: { dry: 0.5, wet: 0.5 }
        }
        return pairings[effect as keyof typeof pairings]
    }

    connectDigitalReverb(digitalReverbNode: AudioWorkletNode) {
        if (!this.isConnectable || !this._audioContext) return

        // Register effect and rebuild chain
        this._activeEffects.reverb = digitalReverbNode
        this.rebuildEffectChain()
    }

    connectImpulseReverb({
        convolverNode,
        effect
    }: {
        convolverNode: ConvolverNode
        effect: string
    }) {
        if (!this.isConnectable || !this._audioContext) return

        this.cleanupEffectChain()

        // Chain through active effects (lofi rack, EQ, MS processor) before the dry/wet split
        let currentNode: AudioNode = this.source!

        if (this._activeEffects.lofi) {
            currentNode.connect(this._activeEffects.lofi.input)
            currentNode = this._activeEffects.lofi.output
        }

        if (this._activeEffects.equalizer) {
            if (
                typeof this._activeEffects.equalizer === 'object' &&
                'input' in this._activeEffects.equalizer
            ) {
                currentNode.connect(this._activeEffects.equalizer.input)
                currentNode = this._activeEffects.equalizer.output
            } else {
                currentNode.connect(this._activeEffects.equalizer)
                currentNode = this._activeEffects.equalizer
            }
        }

        if (this._activeEffects.msProcessor) {
            currentNode.connect(this._activeEffects.msProcessor)
            currentNode = this._activeEffects.msProcessor
        }

        // Apply dry/wet split after all other effects
        const dryGainNode = this._audioContext.createGain()
        const wetGainNode = this._audioContext.createGain()

        const { dry, wet } = this.getGainPairing(effect)

        dryGainNode.gain.value = dry
        wetGainNode.gain.value = wet

        currentNode.connect(dryGainNode)
        currentNode.connect(convolverNode)

        convolverNode.connect(wetGainNode)
        dryGainNode.connect(this._soundTouchNode!)
        wetGainNode.connect(this._soundTouchNode!)

        this._soundTouchNode!.connect(this._gainNode!)
        this.connectToOutput(this._gainNode!)

        // Mark that reverb is active (using impulse routing)
        this._activeEffects.reverb = convolverNode

        // Track dry/wet gain nodes for proper cleanup
        this._reverbGainNodes = { dry: dryGainNode, wet: wetGainNode }
    }

    connectEqualizer(equalizerNode: AudioNode | { input: AudioNode; output: AudioNode }) {
        if (!this.isConnectable) return

        // Register effect and rebuild chain
        this._activeEffects.equalizer = equalizerNode
        this.rebuildEffectChain()
    }

    connectMSProcessor(msProcessorNode: AudioWorkletNode) {
        if (!this.isConnectable) return

        // Register effect and rebuild chain
        this._activeEffects.msProcessor = msProcessorNode
        this.rebuildEffectChain()
    }

    /** The lovelofi rack sits first in the chain, straight after the gain node. */
    connectLofi(rack: { input: AudioNode; output: AudioNode }) {
        if (!this.isConnectable) return

        this._activeEffects.lofi = rack
        this.rebuildEffectChain()
    }

    private cleanupEffectChain() {
        if (!this._gainNode || !this._soundTouchNode) return

        try {
            // CRITICAL: Disconnect the source from everything first
            // This prevents duplicate connections when we rebuild
            if (this.source) {
                try {
                    this.source.disconnect()
                } catch (e) {
                    // Source might not be connected yet, that's OK
                }
            }

            // Disconnect all existing connections
            this._gainNode.disconnect()
            this._soundTouchNode.disconnect()
            this._limiterNode?.disconnect()
            this._outputSource = undefined

            // Disconnect active effects
            // NOTE: For effects with separate input/output nodes (equalizer, lofi rack),
            // we only disconnect the OUTPUT node to break its downstream connection. We
            // must NOT disconnect the input node — AudioNode.disconnect() removes ALL
            // outputs, which would sever the internal chain (filter[0] → filter[1], or
            // the rack's input → its first effect). The input's incoming connection
            // (gain → input) is already broken by gainNode.disconnect().
            if (this._activeEffects.lofi) {
                try {
                    this._activeEffects.lofi.output.disconnect()
                } catch (e) {
                    // Ignore disconnect errors during cleanup
                }
            }
            if (this._activeEffects.equalizer) {
                if (
                    typeof this._activeEffects.equalizer === 'object' &&
                    'input' in this._activeEffects.equalizer
                ) {
                    try {
                        this._activeEffects.equalizer.output.disconnect()
                    } catch (e) {
                        // Ignore disconnect errors during cleanup
                    }
                } else {
                    this._activeEffects.equalizer.disconnect()
                }
            }
            if (this._activeEffects.msProcessor) this._activeEffects.msProcessor.disconnect()
            if (this._activeEffects.reverb) this._activeEffects.reverb.disconnect()

            // Clean up the impulse reverb's dry/wet split
            if (this._reverbGainNodes.dry) {
                try {
                    this._reverbGainNodes.dry.disconnect()
                } catch (e) {
                    // Ignore disconnect errors
                }
            }
            if (this._reverbGainNodes.wet) {
                try {
                    this._reverbGainNodes.wet.disconnect()
                } catch (e) {
                    // Ignore disconnect errors
                }
            }
            this._reverbGainNodes = {}
        } catch (error) {
            console.warn('Error during cleanup:', error)
        }
    }

    private rebuildEffectChain() {
        if (!this._gainNode || !this._soundTouchNode || !this.destination || !this.source) {
            return
        }

        try {
            this.cleanupEffectChain()

            // Build the chain: source → [effects] → soundTouch → gain → limiter → destination
            let currentNode: AudioNode = this.source

            // Chain effects in order: lofi rack → equalizer → MS processor → reverb
            if (this._activeEffects.lofi) {
                currentNode.connect(this._activeEffects.lofi.input)
                currentNode = this._activeEffects.lofi.output
            }

            if (this._activeEffects.equalizer) {
                // Handle effects with separate input/output nodes (like equalizer with filter chain)
                if (
                    typeof this._activeEffects.equalizer === 'object' &&
                    'input' in this._activeEffects.equalizer
                ) {
                    currentNode.connect(this._activeEffects.equalizer.input)
                    currentNode = this._activeEffects.equalizer.output
                } else {
                    currentNode.connect(this._activeEffects.equalizer)
                    currentNode = this._activeEffects.equalizer
                }
            }

            if (this._activeEffects.msProcessor) {
                currentNode.connect(this._activeEffects.msProcessor)
                currentNode = this._activeEffects.msProcessor
            }

            // Digital reverb: the worklet is stereo in and carries the dry signal
            // itself (unity in every preset), so it sits in series like the rest.
            // A gain-1.0 bypass used to run beside a mono-in worklet; that doubled
            // the dry signal and left the config's Dry slider nearly inert.
            if (this._activeEffects.reverb) {
                currentNode.connect(this._activeEffects.reverb)
                currentNode = this._activeEffects.reverb
            }

            // Connect final node to soundTouch, then the volume gain, then out
            // through the limiter
            currentNode.connect(this._soundTouchNode)
            this._soundTouchNode.connect(this._gainNode)
            this.connectToOutput(this._gainNode)
        } catch (error) {
            console.error('Error rebuilding effect chain:', error)
            throw error
        }
    }

    disconnect() {
        if (!this.isConnectable) return

        // CRITICAL: First cleanup the effect chain while we still have references to the effect nodes
        // This ensures all effect nodes are properly disconnected before we clear the references
        this.cleanupEffectChain()

        // Now clear all active effects
        this._activeEffects = {}

        // Reconnect the basic chain: source → soundTouch → gain → limiter → destination
        if (this.source && this._gainNode && this._soundTouchNode && this.destination) {
            this.source.connect(this._soundTouchNode)
            this._soundTouchNode.connect(this._gainNode)
            this.connectToOutput(this._gainNode)
        }
    }

    removeEffect(effectType: 'lofi' | 'equalizer' | 'msProcessor' | 'reverb') {
        // Remove specific effect and rebuild chain
        delete this._activeEffects[effectType]
        this.rebuildEffectChain()
    }

    /**
     * Route the captured element straight to the destination, removing ALL Chorus
     * processing (gain, soundTouch worklet, effects) from the signal path. Used by
     * the master on/off toggle to make audio audibly identical to vanilla Spotify.
     *
     * The AudioContext and MediaElementAudioSourceNode are deliberately KEPT alive:
     * an element can only ever be createMediaElementSource()'d once per page load,
     * so closing/disposing would make re-enabling impossible without a tab reload.
     * Once disconnected from the graph the soundTouch worklet is no longer pulled,
     * so it stops consuming CPU.
     */
    bypass() {
        if (!this.source || !this.destination || !this._gainNode) return

        try {
            this.cleanupEffectChain()
            this._activeEffects = {}
            // Passthrough WITH the gain node retained (source → gain → destination):
            // keeps the current volume so toggling off causes no loudness jump, while
            // the soundTouch worklet and all effects are dropped from the path (the
            // worklet stops being pulled, so it stops consuming CPU).
            this.source.connect(this._gainNode)
            this._gainNode.connect(this.destination)
        } catch (error) {
            console.warn('Error bypassing audio chain:', error)
        }
    }

    /**
     * Rebuild the basic chain (source → soundTouch → gain → limiter → destination) after a
     * bypass(), restoring the last known volume. Effects/presets re-apply on top
     * via the normal store dispatch once the UI re-mounts.
     */
    restoreChain() {
        if (!this.isConnectable || !this.source || !this.destination) return

        try {
            // Clear the bypass wiring (source → gain → destination) before rebuilding,
            // otherwise the gain node would feed both destination and soundTouch.
            this.cleanupEffectChain()
            this._activeEffects = {}
            this.source.connect(this._soundTouchNode!)
            this._soundTouchNode!.connect(this._gainNode!)
            this.connectToOutput(this._gainNode!)
            this.setGain(this._currentVolume, this._volumeType)
        } catch (error) {
            console.warn('Error restoring audio chain:', error)
        }
    }

    private async loadSoundTouch() {
        this._soundTouchManager = new SoundTouch(this.audioContext!)
        await this._soundTouchManager.loadModule()
        this._soundTouchNode = this._soundTouchManager.soundtouchNode
    }

    async applySoundTouch(settings: SoundTouchData) {
        if (!this._soundTouchManager) return
        this._soundTouchManager?.applySettings(settings)
    }

    cleanup() {
        try {
            if (this._source) {
                this._source.disconnect()
            }
            if (this._gainNode) {
                this._gainNode.disconnect()
                this._gainNode = undefined
            }
            if (this._soundTouchNode) {
                this._soundTouchNode.disconnect()
                this._soundTouchNode = undefined
            }
            if (this._limiterNode) {
                disposeWorklet(this._limiterNode)
                this._limiterNode = undefined
            }
            if (this.destination) {
                this._destination = undefined
            }

            // Clear source map
            this._sourceMap.clear()

            // Clean up SoundTouch manager
            if (this._soundTouchManager) {
                ;(this._soundTouchManager as any).dispose?.()
                this._soundTouchManager = null
            }
        } catch (error) {
            console.warn('Error during cleanup:', error)
        }
    }

    dispose() {
        this.cleanup()

        // Close AudioContext
        if (this._audioContext && this._audioContext.state !== 'closed') {
            this._audioContext.close()
        }
        this._audioContext = undefined

        this._isInitialized = false
        this._setupPromise = undefined
    }

    set source(source) {
        this._source = source
    }

    get source() {
        return this._source
    }

    get audioContext() {
        return this._audioContext
    }

    get destination() {
        return this._destination
    }
}
