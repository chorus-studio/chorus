import AudioManager from '../audio-manager'
import { MS_PRESETS } from './presets'

export default class MSProcessor {
    private _audioManager: AudioManager
    private _audioContext?: AudioContext
    private _msWorkletNode?: AudioWorkletNode
    private _moduleLoaded: boolean = false

    constructor(audioManager: AudioManager) {
        this._audioManager = audioManager
    }

    async setMSEffect(effect: string) {
        console.log('MSProcessor.setMSEffect called with:', effect)
        if (!this._audioManager.audioContext) {
            console.warn('MSProcessor: AudioContext not initialized yet, skipping')
            return
        }

        this._audioContext = this._audioManager.audioContext

        if (effect === 'none') {
            console.log('MSProcessor: disconnecting')
            this.cleanup()
            if (this._audioManager.audioContext) {
                this._audioManager.removeEffect('msProcessor')
            }
            return
        }

        try {
            await this.createMSProcessor()
            this.connectMSProcessor()
            this.applyMSEffect(effect)
            console.log('MSProcessor: effect applied successfully')
        } catch (error) {
            console.error('Error setting MS effect:', error)
            this.cleanup()
            if (this._audioManager.audioContext) {
                this._audioManager.disconnect()
            }
            throw error
        }
    }

    private async createMSProcessor() {
        if (!this._audioContext) {
            throw new Error('AudioContext not initialized')
        }

        // Get module path from sessionStorage
        const modulePath = sessionStorage.getItem('chorus:ms_processor_path')
        if (!modulePath) {
            throw new Error('MS processor module path not found in sessionStorage')
        }

        try {
            // Add the AudioWorklet module only once
            if (!this._moduleLoaded) {
                await this._audioContext.audioWorklet.addModule(modulePath)
                this._moduleLoaded = true
            }

            // Create the AudioWorklet node
            this._msWorkletNode = new AudioWorkletNode(
                this._audioContext,
                'ms-processor',
                {
                    channelCountMode: 'explicit',
                    channelCount: 2,
                    outputChannelCount: [2]
                }
            )
        } catch (error) {
            console.error('Failed to create MS processor worklet:', error)
            throw error
        }
    }

    private connectMSProcessor() {
        if (!this._msWorkletNode) {
            throw new Error('MS processor node not initialized')
        }

        // Connect to audio manager's effect chain
        this._audioManager.connectMSProcessor(this._msWorkletNode)
    }

    private applyMSEffect(effect: string) {
        if (!this._msWorkletNode || !this._audioContext) {
            throw new Error('MS processor not initialized')
        }

        const presetConfig = MS_PRESETS[effect]
        if (!presetConfig) {
            console.warn(`Unknown MS preset: ${effect}`)
            return
        }

        // Apply each parameter with smooth ramping to avoid clicks
        const currentTime = this._audioContext.currentTime
        const rampTime = 0.05 // 50ms ramp

        Object.entries(presetConfig).forEach(([paramName, value]) => {
            const param = this._msWorkletNode?.parameters.get(paramName)
            if (param) {
                param.linearRampToValueAtTime(value, currentTime + rampTime)
            }
        })
    }

    cleanup() {
        if (this._msWorkletNode) {
            try {
                this._msWorkletNode.disconnect()
            } catch (e) {
                // Ignore disconnect errors during cleanup
            }
            this._msWorkletNode = undefined
        }
    }

    dispose() {
        this.cleanup()
        this._audioContext = undefined
    }
}
