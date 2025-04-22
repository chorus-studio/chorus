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

            this.soundtouchNode = new AudioWorkletNode(this.audioContext, 'soundtouch-processor', {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                channelCount: 2,
                channelCountMode: 'clamped-max',
                channelInterpretation: 'speakers'
            })
        } catch (error) {
            console.error('Error loading SoundTouch module:', error)
            this.disconnect()
            throw error
        }
    }

    async applySettings({ pitch, semitone }: { pitch: number; semitone: number }) {
        if (!this.soundtouchNode) await this.loadModule()

        this.setPitchTranspose({ pitch, semitone })
    }

    setPitchTranspose({ pitch, semitone }: { pitch: number; semitone: number }) {
        if (!this.soundtouchNode || !this.audioContext) return

        // this.soundtouchNode.parameters.get('rate')!.value = rate
        // this.soundtouchNode.parameters.get('tempo')!.value = tempo
        this.soundtouchNode.parameters.get('pitch')!.value = pitch
        this.soundtouchNode.parameters.get('pitchSemitones')!.value = semitone
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
