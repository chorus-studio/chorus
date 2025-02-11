export default class AudioManager {
    private _element: HTMLMediaElement | MediaStream
    private _audioContext?: AudioContext
    private _source?: MediaStreamAudioSourceNode | MediaElementAudioSourceNode
    private _destination?: AudioDestinationNode
    private isTabStream = false

    constructor(element: HTMLVideoElement | HTMLAudioElement) {
        this._element = element
        this.isTabStream = element instanceof MediaStream

        // Only create new context if we don't have one or if it's closed
        if (!this.audioContext || this.audioContext.state === 'closed') {
            this._audioContext = new AudioContext({ latencyHint: 'playback' })
        }

        // Cleanup any existing connections first
        this.cleanup()

        this._source = this.isTabStream
            ? this.audioContext?.createMediaStreamSource(this._element as unknown as MediaStream)
            : this.audioContext?.createMediaElementSource(
                  this._element as unknown as HTMLMediaElement
              )
        this._destination = this.audioContext?.destination
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
        if (!this.source || !this._destination) return

        // Disconnect all nodes
        this.source.disconnect()
        this.destination?.disconnect()

        // Reconnect basic chain
        if (this.source && this.destination) {
            this.source.connect(this.destination)
        }
    }

    cleanup() {
        if (this.source) {
            this.source.disconnect()
            this._source = undefined
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
