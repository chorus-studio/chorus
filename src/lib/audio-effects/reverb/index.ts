import AudioManager from '../audio-manager'
import {
    customPresets,
    engineFor,
    getParamsListForEffect,
    impulsePresets,
    resolveReverbPreset,
    STRUCTURAL_PARAMS,
    type ReverbEngine
} from './presets'

// Which worklet module and processor each digital engine lives in. Rooms run
// on the FDN, custom characters on the Dattorro plate.
const ENGINES: Record<ReverbEngine, { pathKey: string; processor: string }> = {
    fdn: { pathKey: 'chorus:fdn_path', processor: 'FDNReverb' },
    plate: { pathKey: 'chorus:reverb_path', processor: 'DattorroReverb' }
}

export default class Reverb {
    _internal: boolean
    _audioManager: AudioManager
    _audioContext?: AudioContext
    _reverbGainNode?: GainNode
    _convolverNode?: ConvolverNode
    _reverbWorkletNode?: AudioWorkletNode
    // The engine the live worklet node runs (what a config edit from cold builds).
    _engine: ReverbEngine = 'plate'

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
            return
        }

        // Saved names of removed near-duplicate presets resolve to their kept twin
        // (must happen before the isImpulse/isCustom categorization below).
        effect = resolveReverbPreset(effect)

        this._audioContext = this._audioManager.audioContext

        // Always clean up old reverb nodes first to prevent stale parameters
        // from bleeding through when switching between presets
        this.cleanup()

        if (effect === 'none') {
            this._engine = 'plate'
            if (this._audioManager.audioContext) {
                this._audioManager.removeEffect('reverb')
            }
            return
        }

        try {
            const isImpulse = this.isImpulse(effect)
            if (isImpulse) {
                await this.createImpulseReverb(effect)
            } else {
                await this.createDigitalReverb(engineFor(effect))
                this.connectDigitalReverb()
                this.applyReverbEffect(effect)
            }
        } catch (error) {
            console.error('Error setting reverb effect:', error)
            this.cleanup()
            if (this._audioManager.audioContext) {
                this._audioManager.disconnect()
            }
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
            try {
                this._reverbWorkletNode.disconnect()
            } catch (e) {
                // Ignore disconnect errors during cleanup
            }
            this._reverbWorkletNode = undefined
        }
        if (this._reverbGainNode) {
            try {
                this._reverbGainNode.disconnect()
            } catch (e) {
                // Ignore disconnect errors during cleanup
            }
            this._reverbGainNode = undefined
        }
        if (this._convolverNode) {
            try {
                this._convolverNode.disconnect()
            } catch (e) {
                // Ignore disconnect errors during cleanup
            }
            this._convolverNode = undefined
        }
    }

    connectDigitalReverb() {
        if (!this._reverbWorkletNode) {
            throw new Error('Audio nodes not properly initialized')
        }

        this._audioManager.connectDigitalReverb(this._reverbWorkletNode!)
    }

    async createDigitalReverb(engine: ReverbEngine) {
        if (!this._audioContext) {
            throw new Error('AudioContext not initialized')
        }

        const { pathKey, processor } = ENGINES[engine]
        const modulePath = sessionStorage.getItem(pathKey)
        if (!modulePath) {
            throw new Error(`Reverb module path (${pathKey}) not found in session storage`)
        }

        await this._audioContext.audioWorklet.addModule(modulePath)

        // Create gain node if it doesn't exist
        this._reverbGainNode = this._reverbGainNode ?? this._audioContext.createGain()

        // Create the reverb node if it doesn't exist. Stereo in: both processors
        // keep the dry signal per channel (at `dry`, unity in every preset) and
        // take both channels into the tank, so the node is the whole reverb
        // path — no bypass beside it. Mono in made the dry path a mono copy.
        if (this._reverbWorkletNode && this._engine !== engine) this.cleanup()
        this._engine = engine
        this._reverbWorkletNode =
            this._reverbWorkletNode ??
            new AudioWorkletNode(this._audioContext, processor, {
                channelCountMode: 'explicit',
                channelCount: 2,
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

    // Live editor path: ramp raw param values onto the existing worklet WITHOUT
    // calling setReverbEffect (which tears down + rebuilds the node every call).
    // Creates + connects the digital reverb on demand so editing works from cold
    // (on the engine of the active preset; the plate when none is). A param the
    // running engine does not have is skipped.
    async applyManualParams(params: Record<string, number>) {
        if (!this._audioManager.audioContext) return
        this._audioContext = this._audioManager.audioContext

        try {
            if (!this._reverbWorkletNode) {
                await this.createDigitalReverb(this._engine)
                this.connectDigitalReverb()
            }

            const currentTime = this._audioContext.currentTime
            Object.entries(params).forEach(([name, value]) => {
                const param = this._reverbWorkletNode?.parameters.get(name)
                if (param) param.linearRampToValueAtTime(value, currentTime + 0.05)
            })
        } catch (error) {
            console.error('Error applying manual reverb params:', error)
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
            if (!param || !this._audioContext) return
            // The room's shape is set at once (the node is fresh and silent);
            // everything else ramps in.
            if (STRUCTURAL_PARAMS.includes(name)) {
                param.setValueAtTime(value, this._audioContext.currentTime)
            } else {
                param.linearRampToValueAtTime(value, this._audioContext.currentTime + 0.195)
            }
        })
    }
}
