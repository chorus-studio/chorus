import AudioManager from '../audio-manager'

export default class SoundTouch {
    _audioManager: AudioManager
    _audioContext?: AudioContext
    _soundtouch?: AudioWorkletNode
    _element: HTMLMediaElement

    constructor(audioManager: AudioManager, element: HTMLMediaElement) {
        this._audioManager = audioManager
        this._element = element
    }

    async initialize() {
        console.log('SoundTouch: Starting initialization')
        if (!this._audioManager.audioContext) {
            console.error('SoundTouch: AudioContext not initialized')
            throw new Error('AudioContext not initialized')
        }

        this._audioContext = this._audioManager.audioContext
        console.log('SoundTouch: AudioContext set')

        try {
            // Load the SoundTouch audio worklet module from the public folder
            console.log('SoundTouch: Checking for module path')
            const modulePath = sessionStorage.getItem('chorus:soundtouch_path')
            if (!modulePath) {
                console.error('SoundTouch: Module path not found in session storage')
                throw new Error('SoundTouch module path not found in session storage')
            }
            console.log('SoundTouch: Module path found:', modulePath)

            console.log('SoundTouch: Loading module')
            await this._audioContext.audioWorklet.addModule(modulePath)
            console.log('SoundTouch: Module loaded successfully')

            // Create SoundTouch node
            console.log('SoundTouch: Creating AudioWorkletNode')
            this._soundtouch = new AudioWorkletNode(this._audioContext, 'soundtouch-processor', {
                channelCountMode: 'explicit',
                channelCount: 2,
                outputChannelCount: [2]
            })
            console.log('SoundTouch: AudioWorkletNode created')

            console.log('SoundTouch: Connecting audio nodes')
            this.connect()
        } catch (error) {
            console.error('Error initializing SoundTouch:', error)
            this.disconnect()
            throw error
        }
    }

    connect() {
        console.log('SoundTouch connect() called')
        console.log('SoundTouch node exists:', !!this._soundtouch)
        console.log('AudioManager source exists:', !!this._audioManager.source)
        console.log('AudioManager destination exists:', !!this._audioManager.destination)

        if (!this._soundtouch || !this._audioManager.source || !this._audioManager.destination) {
            throw new Error('Audio nodes not properly initialized')
        }

        // Disconnect existing chain
        this._audioManager.disconnect()

        // Connect source to soundtouch and soundtouch to destination
        this._audioManager.source.connect(this._soundtouch)
        this._soundtouch.connect(this._audioManager.destination)

        // Log success message
        console.log('SoundTouch connected successfully')
    }

    disconnect() {
        if (this._soundtouch) {
            this._soundtouch.disconnect()
            this._soundtouch = undefined
        }
    }

    setPlaybackRate(rate: number, preservePitch: boolean = false) {
        if (!this._soundtouch) return
        this._element.preservesPitch = preservePitch
        this._element.playbackRate = rate
    }

    setPitch(pitch: number) {
        if (!this._soundtouch) return
        this._soundtouch.parameters
            .get('pitch')
            ?.setValueAtTime(pitch, this._audioContext?.currentTime ?? 0)
    }

    setPitchSemitones(semitones: number) {
        if (!this._soundtouch) return
        this._soundtouch.parameters
            .get('pitchSemitones')
            ?.setValueAtTime(semitones, this._audioContext?.currentTime ?? 0)
    }

    reset() {
        if (!this._soundtouch) return
        this._soundtouch.parameters
            .get('pitch')
            ?.setValueAtTime(1, this._audioContext?.currentTime ?? 0)
        this._soundtouch.parameters
            .get('pitchSemitones')
            ?.setValueAtTime(0, this._audioContext?.currentTime ?? 0)
        this._element.playbackRate = 1
    }
}
