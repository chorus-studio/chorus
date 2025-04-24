import type { SoundTouchData } from '$lib/stores/playback'

export default class SoundTouch {
    audioContext: AudioContext
    soundtouchNode?: AudioWorkletNode

    constructor(audioContext: AudioContext) {
        this.audioContext = audioContext
    }

    async loadModule() {
        try {
            const modulePath = sessionStorage.getItem('chorus:soundtouch_path')
            if (!modulePath) {
                console.error('SoundTouch: Module path not found in session storage')
                throw new Error('SoundTouch module path not found in session storage')
            }

            await this.audioContext.audioWorklet.addModule(modulePath)

            this.soundtouchNode = new AudioWorkletNode(this.audioContext, 'soundtouch-processor')
        } catch (error) {
            console.error('Error loading SoundTouch module:', error)
            this.disconnect()
            throw error
        }
    }

    async applySettings(settings: SoundTouchData) {
        if (!this.soundtouchNode) await this.loadModule()
        this.setPitchTranspose(settings)
    }

    setPitchTranspose(settings: SoundTouchData) {
        if (!this.soundtouchNode || !this.audioContext) return

        this.soundtouchNode.parameters.get('pitch')!.value = settings.pitch
        this.soundtouchNode.parameters.get('pitchSemitones')!.value = settings.semitone
    }

    disconnect() {
        if (this.soundtouchNode) {
            this.soundtouchNode.disconnect()
            this.soundtouchNode = undefined
        }
    }

    reset() {
        if (!this.soundtouchNode) return
        this.soundtouchNode.parameters.get('pitch')!.value = 0
        this.soundtouchNode.parameters.get('semitone')!.value = 0
    }
}
