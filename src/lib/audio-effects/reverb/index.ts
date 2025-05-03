import AudioManager from '../audio-manager'
import { customPresets, getParamsListForEffect, impulsePresets } from './presets'

export default class Reverb {
    _internal: boolean
    _audioManager: AudioManager
    _audioContext?: AudioContext
    _reverbGainNode?: GainNode
    _convolverNode?: ConvolverNode
    _reverbWorkletNode?: AudioWorkletNode

    constructor(audioManager: AudioManager, internal = false) {
        this._audioManager = audioManager
        this._internal = internal
    }

    isCustom(effect: string) {
        return customPresets.includes(effect)
    }

    isImpulse(effect: string) {
        return impulsePresets.includes(effect)
    }

    async setReverbEffect(effect: string) {
        if (!this._audioManager.audioContext) {
            throw new Error('AudioContext not initialized')
        }

        this._audioContext = this._audioManager.audioContext
        if (effect === 'none') {
            this.cleanup()
            return this._audioManager.disconnect()
        }

        try {
            const isImpulse = this.isImpulse(effect)
            if (isImpulse) {
                await this.createImpulseReverb(effect)
            } else {
                await this.createDigitalReverb()
                this.connectDigitalReverb()
                this.applyReverbEffect(effect)
            }
        } catch (error) {
            console.error('Error setting reverb effect:', error)
            this.cleanup()
            this._audioManager.disconnect()
            throw error
        }
    }

    async createImpulseReverb(effect: string) {
        if (!this._audioContext) throw new Error('AudioContext not initialized')

        // Create convolver node if it doesn't exist
        this._convolverNode = this._convolverNode ?? this._audioContext.createConvolver()

        const soundsDir = sessionStorage.getItem('chorus:sounds_path')
        if (!soundsDir) throw new Error('Sounds directory path not found in session storage')

        const filename = effect.replace('_ir', '')
        const response = await fetch(`${soundsDir}${filename}.wav`)
        if (!response.ok) throw new Error(`Failed to load impulse response: ${effect}`)

        const arraybuffer = await response.arrayBuffer()
        this._convolverNode.buffer = await this._audioContext.decodeAudioData(arraybuffer)

        if (!this._audioManager.source || !this._convolverNode) {
            throw new Error('Audio nodes not properly initialized')
        }

        // Use AudioManager's connectReverb instead of direct connections
        this._audioManager.connectImpulseReverb({
            convolverNode: this._convolverNode,
            effect
        })
    }

    private cleanup() {
        if (this._reverbWorkletNode) {
            this._reverbWorkletNode.disconnect()
            this._reverbWorkletNode = undefined
        }
        if (this._reverbGainNode) {
            this._reverbGainNode.disconnect()
            this._reverbGainNode = undefined
        }
    }

    connectDigitalReverb() {
        if (!this._reverbWorkletNode) {
            throw new Error('Audio nodes not properly initialized')
        }

        this._audioManager.connectDigitalReverb(this._reverbWorkletNode!)
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

    async applyReverbEffect(effect: string) {
        if (effect === 'none') {
            this.cleanup()
            return this._audioManager.disconnect()
        }

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

        const preset = this.isCustom(effect) ? 'custom' : 'rooms'

        const paramsList = getParamsListForEffect({ effect, preset })
        paramsList.forEach(({ name, value }: { name: string; value: number }) => {
            const param = this._reverbWorkletNode?.parameters.get(name)
            if (param && this._audioContext) {
                param.linearRampToValueAtTime(value, this._audioContext.currentTime + 0.195)
            }
        })
    }
}
