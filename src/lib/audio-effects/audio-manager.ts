import SoundTouch from './soundtouch'
import { SoundTouchData } from '$lib/stores/playback'

export default class AudioManager {
    private _gainNode?: GainNode
    private _soundTouchNode?: AudioNode
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

    // Track active effect nodes for multi-effect chaining
    // Some effects (like equalizer) have separate input/output nodes
    private _activeEffects: {
        equalizer?: { input: AudioNode; output: AudioNode } | AudioNode
        msProcessor?: AudioWorkletNode
        reverb?: AudioNode
    } = {}

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
                this._element.volume = 1
                this._element.muted = false
            }
        })

        // Check if the source is cross-origin
        try {
            const currentSrc = this._element.currentSrc
            if (currentSrc) {
                const sourceUrl = new URL(currentSrc)
                const isCrossOrigin = sourceUrl.origin !== window.location.origin

                if (isCrossOrigin) {
                    // For cross-origin sources, just use direct playback
                    this._element.volume = 1
                    this._element.muted = false
                    return
                }
            }
        } catch (error) {
            console.warn('Error checking source origin:', error)
            // If we can't determine the origin, use direct playback to be safe
            if (this._element instanceof HTMLMediaElement) {
                this._element.volume = 1
                this._element.muted = false
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
            // If Web Audio API setup fails, fall back to direct playback
            if (this._element instanceof HTMLMediaElement) {
                this._element.volume = 1
                this._element.muted = false
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

            this._destination = this._audioContext.destination

            // Set up default audio chain with gain node
            if (this.isConnectable) {
                this.source!.connect(this._gainNode!)
                this._gainNode!.connect(this._soundTouchNode!)
                this._soundTouchNode!.connect(this.destination!)
                this.setGain(this._currentVolume, this._volumeType)
            } else {
                throw new Error('Failed to create audio chain nodes')
            }
        } catch (error) {
            console.error('Failed to create audio chain:', error)
            throw error
        }
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

        this._currentVolume = value
        this._volumeType = type

        // Special handling for muting (value = 0)
        if (value === 0) {
            this._gainNode.gain.value = 0
            return
        }

        const gainValue = type === 'logarithmic' ? this.linearToLogarithmic(value) : value
        // Ensure gain is never negative
        this._gainNode.gain.value = Math.max(0, gainValue)
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

    getGainPairing(effect: string) {
        const pairings = {
            kick_ir: { dry: 0.95, wet: 0.05 },
            muffler_ir: { dry: 0.9, wet: 0.1 },
            diffusor_ir: { dry: 0.9, wet: 0.1 },
            telephone_ir: { dry: 0.65, wet: 0.35 }
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

        // For impulse reverb, we need to handle wet/dry mixing
        // This is complex, so for now keep the old behavior
        // TODO: Refactor to support multi-effect with impulse reverb wet/dry
        this.cleanupEffectChain()

        const dryGainNode = this._audioContext.createGain()
        const wetGainNode = this._audioContext.createGain()

        const { dry, wet } = this.getGainPairing(effect)

        dryGainNode.gain.value = dry
        wetGainNode.gain.value = wet

        this._gainNode!.connect(dryGainNode)
        this._gainNode!.connect(convolverNode)

        convolverNode.connect(wetGainNode)
        dryGainNode.connect(this._soundTouchNode!)
        wetGainNode.connect(this._soundTouchNode!)

        this._soundTouchNode!.connect(this.destination!)

        // Mark that reverb is active (but using old routing)
        this._activeEffects.reverb = convolverNode
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

            // Disconnect active effects
            // NOTE: For equalizer with separate input/output nodes, we need to disconnect
            // both the input and output nodes from the external chain, but NOT the internal
            // connections between filters (the equalizer class handles those).
            if (this._activeEffects.equalizer) {
                if (
                    typeof this._activeEffects.equalizer === 'object' &&
                    'input' in this._activeEffects.equalizer
                ) {
                    // Disconnect input and output from the external chain
                    // This prevents duplicate connections when rebuilding
                    try {
                        this._activeEffects.equalizer.input.disconnect()
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

            // CRITICAL: Reconnect source to gain node
            this.source.connect(this._gainNode)

            // Build dynamic chain: gain → [effects] → soundTouch → destination
            let currentNode: AudioNode = this._gainNode

            // Chain effects in order: equalizer → MS processor → reverb
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

            if (this._activeEffects.reverb) {
                currentNode.connect(this._activeEffects.reverb)
                currentNode = this._activeEffects.reverb
            }

            // Connect final node to soundTouch
            currentNode.connect(this._soundTouchNode)
            this._soundTouchNode.connect(this.destination)
        } catch (error) {
            console.error('Error rebuilding effect chain:', error)
            throw error
        }
    }

    disconnect() {
        if (!this.isConnectable) return

        // Clear all active effects
        this._activeEffects = {}

        // Rebuild with no effects (just gain → soundTouch → destination)
        this.rebuildEffectChain()
    }

    removeEffect(effectType: 'equalizer' | 'msProcessor' | 'reverb') {
        // Remove specific effect and rebuild chain
        delete this._activeEffects[effectType]
        this.rebuildEffectChain()
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
