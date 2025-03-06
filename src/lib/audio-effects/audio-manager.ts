export default class AudioManager {
    private _gainNode?: GainNode
    private _audioContext?: AudioContext
    private _destination?: AudioDestinationNode
    private _element: HTMLMediaElement | MediaStream
    private _source?: MediaStreamAudioSourceNode | MediaElementAudioSourceNode

    private _currentVolume: number = 1
    private _volumeType: 'linear' | 'logarithmic' = 'linear'

    constructor(element: HTMLVideoElement | HTMLAudioElement) {
        this._element = element

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
            } else {
                // Listen for both loadedmetadata and playing events to catch when the source is ready
                const handleSourceReady = () => {
                    const src = this._element.currentSrc || this._element.src
                    if (src) {
                        try {
                            const sourceUrl = new URL(src)
                            const isCrossOrigin = sourceUrl.origin !== window.location.origin
                            if (isCrossOrigin) {
                                this._element.volume = 1
                                this._element.muted = false
                            }
                        } catch (error) {
                            this._element.volume = 1
                            this._element.muted = false
                        }
                    } else {
                        this._element.volume = 1
                        this._element.muted = false
                    }
                }

                this._element.addEventListener('loadedmetadata', handleSourceReady)
                this._element.addEventListener('playing', handleSourceReady)
                return // Don't set up Web Audio API until we know the source
            }
        } catch (error) {
            console.warn('Error checking source origin:', error)
            // If we can't determine the origin, use direct playback to be safe
            this._element.volume = 1
            this._element.muted = false
            return
        }

        // Only proceed with Web Audio API setup for same-origin sources
        try {
            // Only create new context if we don't have one or if it's closed
            if (!this.audioContext || this.audioContext.state === 'closed') {
                this._audioContext = new AudioContext({ latencyHint: 'playback' })
            }

            // Ensure context is running
            if (this._audioContext?.state === 'suspended') {
                this._audioContext.resume()
            }

            // Cleanup any existing connections first
            this.cleanup()

            // Wait for the media to be loaded before creating the audio chain
            if (this._element.readyState >= 2) {
                this.setupAudioChain()
            } else {
                this._element.addEventListener('loadedmetadata', () => {
                    this.setupAudioChain()
                })
            }
        } catch (error) {
            console.error('Failed to set up Web Audio API:', error)
            // If Web Audio API setup fails, fall back to direct playback
            this._element.volume = 1
            this._element.muted = false
        }
    }

    private setupAudioChain() {
        try {
            this._source = this.audioContext?.createMediaElementSource(
                this._element as unknown as HTMLMediaElement
            )

            this._gainNode = this.audioContext?.createGain()

            this._destination = this.audioContext?.destination

            // Set up default audio chain with gain node
            if (this._source && this._gainNode && this._destination) {
                this._source.connect(this._gainNode)
                this._gainNode.connect(this._destination)
                // Initialize with default volume
                this.setGain(1)
            }
        } catch (error) {
            console.error('Failed to create audio chain:', error)
            // If we can't create the audio chain due to CORS, fall back to direct playback
            if (this._element instanceof HTMLMediaElement) {
                this._element.volume = 1
                this._element.muted = false
            }
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
                this._element.muted = false
            }
            return
        }

        this._currentVolume = value
        this._volumeType = type

        const gainValue = type === 'logarithmic' ? this.linearToLogarithmic(value) : value
        this._gainNode.gain.value = gainValue
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
        this.source.connect(gain)
        gain.connect(reverb)
        reverb.connect(this.destination)
    }

    connectEqualizer(node: AudioNode) {
        if (!this.source || !this._destination) return

        // Disconnect existing chain
        this.disconnect()

        // Connect new chain with equalizer
        this.source.connect(node)
        node.connect(this._destination)
    }

    disconnect() {
        if (!this.source || !this._destination || !this._gainNode) return

        // Disconnect all nodes
        this.source.disconnect()
        this._gainNode.disconnect()
        this.destination?.disconnect()

        // Reconnect basic chain with gain
        if (!(this.source && this._gainNode && this.destination)) return

        this.source.connect(this._gainNode)
        this._gainNode.connect(this.destination)
        // Restore the current volume
        this.setGain(this._currentVolume, this._volumeType)
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
