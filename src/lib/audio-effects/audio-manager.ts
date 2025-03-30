import { AudioContext } from 'standardized-audio-context'

export default class AudioManager {
    private _gainNode?: GainNode
    private _audioContext?: AudioContext
    private _destination?: AudioDestinationNode
    private _element: HTMLMediaElement | MediaStream
    private _source?: MediaStreamAudioSourceNode | MediaElementAudioSourceNode
    private _setupPromise?: Promise<void>
    private _isInitialized: boolean = false
    private _sourceMap: Map<HTMLMediaElement, MediaElementAudioSourceNode> = new Map()

    private _currentVolume: number = 1
    private _volumeType: 'linear' | 'logarithmic' = 'linear'

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
            // Create new context if we don't have one or if it's closed
            if (!this._audioContext || this._audioContext.state === 'closed') {
                this._audioContext = new AudioContext({ latencyHint: 'playback' })
            }

            // Ensure context is running
            if (this._audioContext.state === 'suspended') {
                await this._audioContext.resume()
            }

            // Cleanup any existing connections first
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
            }

            // Create gain node if it doesn't exist
            if (!this._gainNode) {
                this._gainNode = this._audioContext.createGain()
            }

            this._destination = this._audioContext.destination

            // Set up default audio chain with gain node
            if (this._source && this._gainNode && this._destination) {
                this._source.connect(this._gainNode)
                this._gainNode.connect(this._destination)
                // Initialize with default volume
                this.setGain(1)
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

        if (!this._source || !this._gainNode || !this._destination) {
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

    connectReverb({ gain, reverb }: { gain: AudioNode; reverb: AudioNode }) {
        if (!this.source || !this.destination) return

        // Disconnect existing chain
        this.disconnect()

        // Connect new chain with effects
        this.source.connect(this._gainNode!) // First connect to gain node for volume control
        this._gainNode!.connect(gain) // Then connect gain to reverb chain
        gain.connect(reverb)
        reverb.connect(this.destination)
    }

    connectEqualizer(node: AudioNode) {
        if (!this.source || !this._destination) return

        // Disconnect existing chain
        this.disconnect()

        // Connect new chain with equalizer
        this.source.connect(this._gainNode!) // First connect to gain node for volume control
        this._gainNode!.connect(node) // Then connect gain to equalizer
        node.connect(this._destination)
    }

    disconnect() {
        if (!this.source || !this._destination || !this._gainNode) return

        // Store current gain value before disconnecting
        const currentGain = this._gainNode.gain.value

        // Disconnect all nodes
        this.source.disconnect()
        this._gainNode.disconnect()
        this.destination?.disconnect()

        // Reconnect basic chain with gain
        if (!(this.source && this._gainNode && this.destination)) return

        this.source.connect(this._gainNode)
        this._gainNode.connect(this.destination)

        // Immediately set the gain value to maintain volume state
        this._gainNode.gain.value = currentGain
    }

    cleanup() {
        if (this.source) {
            this.source.disconnect()
            this._source = undefined
        }
        if (this._gainNode) {
            this._gainNode.disconnect()
            this._gainNode = undefined
        }
        if (this.destination) {
            this.destination.disconnect()
            this._destination = undefined
        }
        // Clear the source map when cleaning up
        this._sourceMap.clear()
    }

    dispose() {
        this.cleanup()
        if (this.audioContext?.state !== 'closed') {
            this.audioContext?.close()
        }
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
