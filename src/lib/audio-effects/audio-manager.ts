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
        if (!this._gainNode) {
            console.warn('No gain node available')
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
