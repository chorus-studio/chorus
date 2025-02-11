import AudioManager from '../audio-manager.js'
import { roomPresets, convolverPresets, getParamsListForEffect } from './presets.js'

export default class Reverb {
    _internal: boolean
    _audioManager: AudioManager
    _audioContext?: AudioContext
    _gain?: GainNode
    _reverb?: AudioWorkletNode
    _convolverNode?: ConvolverNode

    constructor(audioManager: AudioManager, internal = false) {
        this._audioManager = audioManager
        this._internal = internal
    }

    #isDigital(effect: string) {
        return roomPresets.includes(effect)
    }

    isAPreset(effect: string) {
        return [...roomPresets, ...convolverPresets].includes(effect)
    }

    async setReverbEffect(effect: string) {
        this.#setup()
        if (effect == 'none') return this.disconnect()

        const isDigital = this.#isDigital(effect)
        await (isDigital ? this.#createDigitalReverb() : this.#createImpulseReverb(effect))
        if (!isDigital) return

        this.#connect()
        this.#applyReverbEffect(effect)
    }

    #setup() {
        this._audioContext = this._audioManager.audioContext as AudioContext
        this._gain = this._gain ?? this._audioContext.createGain()
    }

    #connect() {
        this._audioManager.connectReverb({
            gain: this._gain as AudioNode,
            reverb: this._reverb as AudioNode
        })
    }

    async #createDigitalReverb() {
        const modulePath = this._internal
            ? chrome.runtime.getURL('/src/lib/audio-effects/reverb/processor.js')
            : sessionStorage.getItem('reverbPath')
        if (!modulePath || !this._audioContext) return
        await this._audioContext.audioWorklet.addModule(modulePath)
        this._reverb =
            this._reverb ??
            new AudioWorkletNode(this._audioContext, 'DattorroReverb', {
                channelCountMode: 'explicit',
                channelCount: 1,
                outputChannelCount: [2]
            })
    }

    async #createImpulseReverb(effect: string) {
        this._convolverNode = this._convolverNode ?? this._audioContext?.createConvolver()
        if (!this._convolverNode || !this._audioContext) return
        const soundsDir = this._internal
            ? chrome.runtime.getURL('/src/lib/audio-effects/sounds/')
            : sessionStorage.getItem('soundsDir')

        const response = await fetch(`${soundsDir}${effect}.wav`)
        const arraybuffer = await response.arrayBuffer()
        this._convolverNode.buffer = await this._audioContext.decodeAudioData(arraybuffer)

        this._audioManager.source?.connect(this._convolverNode)
        this._convolverNode.connect(this._gain as AudioNode)
        this._gain?.connect(this._audioContext.destination as AudioNode)
    }

    disconnect() {
        this._audioManager.disconnect()
    }

    async #applyReverbEffect(effect) {
        if (effect == 'none') return this.disconnect()

        try {
            this.#applyReverbEffectParams(effect)
        } catch (error) {
            console.error({ error })
        }
    }

    #applyReverbEffectParams(effect) {
        const paramsList = getParamsListForEffect(effect)
        paramsList.forEach(({ name, value }: { name: string; value: number }) => {
            this._reverb?.parameters
                .get(name)
                ?.linearRampToValueAtTime(value, this._audioContext?.currentTime + 0.195)
        })
    }
}
