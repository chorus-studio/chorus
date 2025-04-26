import AudioManager from '../audio-manager'
import { roomPresets, convolverPresets, getParamsListForEffect } from './presets'

export default class Reverb {
    _internal: boolean
    _audioManager: AudioManager
    _audioContext?: AudioContext
    _reverbGainNode?: GainNode
    _reverbWorkletNode?: AudioWorkletNode
    _convolverNode?: ConvolverNode

    constructor(audioManager: AudioManager, internal = false) {
        this._audioManager = audioManager
        this._internal = internal
    }

    isDigital(effect: string) {
        return roomPresets.includes(effect)
    }

    isAPreset(effect: string) {
        return [...roomPresets, ...convolverPresets].includes(effect)
    }

    async setReverbEffect(effect: string) {
        if (!this._audioManager.audioContext) {
            throw new Error('AudioContext not initialized')
        }

        this._audioContext = this._audioManager.audioContext
        if (effect === 'none') return this._audioManager.disconnect()

        try {
            const isDigital = this.isDigital(effect)
            await (isDigital ? this.createDigitalReverb() : this.createImpulseReverb(effect))
            if (!isDigital) return

            this.connect()
            this.applyReverbEffect(effect)
        } catch (error) {
            console.error('Error setting reverb effect:', error)
            this._audioManager.disconnect()
            throw error
        }
    }

    connect() {
        if (!this._reverbGainNode || !this._reverbWorkletNode) {
            throw new Error('Audio nodes not properly initialized')
        }

        this._audioManager.connectReverb({
            reverbGainNode: this._reverbGainNode,
            reverbWorkletNode: this._reverbWorkletNode
        })
    }

    async createDigitalReverb() {
        if (!this._audioContext) {
            throw new Error('AudioContext not initialized')
        }

        const modulePath = sessionStorage.getItem('chorus:reverb_path')
        if (!modulePath) {
            throw new Error('Reverb module path not found in session storage')
        }

        await this._audioContext.audioWorklet.addModule(modulePath)

        // Create gain node if it doesn't exist
        this._reverbGainNode = this._reverbGainNode ?? this._audioContext.createGain()

        // Create reverb node if it doesn't exist
        this._reverbWorkletNode =
            this._reverbWorkletNode ??
            new AudioWorkletNode(this._audioContext, 'DattorroReverb', {
                channelCountMode: 'explicit',
                channelCount: 1,
                outputChannelCount: [2]
            })
    }

    async createImpulseReverb(effect: string) {
        if (!this._audioContext) {
            throw new Error('AudioContext not initialized')
        }

        // Create gain node if it doesn't exist
        this._reverbGainNode = this._reverbGainNode ?? this._audioContext.createGain()

        // Create convolver node if it doesn't exist
        this._convolverNode = this._convolverNode ?? this._audioContext.createConvolver()

        const soundsDir = sessionStorage.getItem('chorus:sounds_dir')
        if (!soundsDir) {
            throw new Error('Sounds directory path not found in session storage')
        }

        const response = await fetch(`${soundsDir}${effect}.wav`)
        if (!response.ok) {
            throw new Error(`Failed to load impulse response: ${effect}`)
        }

        const arraybuffer = await response.arrayBuffer()
        this._convolverNode.buffer = await this._audioContext.decodeAudioData(arraybuffer)

        if (!this._audioManager.source || !this._convolverNode || !this._reverbGainNode) {
            throw new Error('Audio nodes not properly initialized')
        }

        // Use AudioManager's connectReverb instead of direct connections
        this._audioManager.connectReverb({
            reverbGainNode: this._reverbGainNode,
            reverbWorkletNode: this._convolverNode
        })
    }

    async applyReverbEffect(effect: string) {
        if (effect === 'none') return this._audioManager.disconnect()

        try {
            this.applyReverbEffectParams(effect)
        } catch (error) {
            console.error('Error applying reverb effect:', error)
            throw error
        }
    }

    applyReverbEffectParams(effect: string) {
        if (!this._reverbWorkletNode || !this._audioContext) {
            throw new Error('Reverb node or AudioContext not initialized')
        }

        const paramsList = getParamsListForEffect(effect)
        paramsList.forEach(({ name, value }: { name: string; value: number }) => {
            const param = this._reverbWorkletNode?.parameters.get(name)
            if (param && this._audioContext) {
                param.linearRampToValueAtTime(value, this._audioContext.currentTime + 0.195)
            }
        })
    }
}
