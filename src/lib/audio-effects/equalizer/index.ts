import AudioManager from '../audio-manager'
import { EQ_PRESETS, EQ_FILTERS } from './presets'

export default class Equalizer {
    _filters: BiquadFilterNode[]
    _audioManager: AudioManager
    _audioContext?: AudioContext

    constructor(audioManager: AudioManager) {
        this._filters = []
        this._audioManager = audioManager
    }

    setEQEffect(effect: string) {
        if (!this._audioManager.audioContext) {
            console.warn('Equalizer: AudioContext not initialized yet, skipping')
            return
        }

        this._audioContext = this._audioManager.audioContext
        if (effect === 'none') {
            return this.disconnect()
        }

        try {
            this.#applyEQFilters(effect)
        } catch (error) {
            console.error('Error setting EQ effect:', error)
            this.disconnect()
            throw error
        }
    }

    createBiquadFilter({
        setting,
        effect,
        index
    }: {
        setting: { freq: number; gain: number; type: string }
        effect: string
        index: number
    }) {
        if (!this._audioContext) {
            throw new Error('AudioContext not initialized')
        }

        const effectGain = EQ_PRESETS[effect][index]
        const filter = this._audioContext.createBiquadFilter()

        filter.type = setting.type as BiquadFilterType
        filter.frequency.value = setting.freq || 0
        filter.gain.value = effectGain || 0
        filter.Q.value = 1

        return filter
    }

    #applyEQFilters(effect: string) {
        if (!this._audioManager.audioContext) {
            throw new Error('AudioContext not initialized')
        }

        this._audioContext = this._audioManager.audioContext

        // Disconnect existing filters (but don't trigger chain rebuild)
        this._filters.forEach((filter) => {
            try {
                filter.disconnect()
            } catch (e) {
                // Ignore disconnect errors during cleanup
            }
        })
        this._filters = []

        // Create filters
        EQ_FILTERS.forEach((setting, index) => {
            const filter = this.createBiquadFilter({ setting, index, effect })
            this._filters.push(filter)
        })

        // Connect filters in series internally
        if (this._filters.length > 0) {
            for (let i = 0; i < this._filters.length - 1; i++) {
                this._filters[i].connect(this._filters[i + 1])
            }

            // Register the filter chain with separate input/output nodes
            // AudioManager will connect: previousNode → filters[0] (input)
            // Then use filters[last] (output) as currentNode for next effect
            this._audioManager.connectEqualizer({
                input: this._filters[0],
                output: this._filters[this._filters.length - 1]
            })
        }
    }

    disconnect() {
        this._filters.forEach((filter) => {
            try {
                filter.disconnect()
            } catch (e) {
                // Ignore disconnect errors during cleanup
            }
        })

        this._filters = []

        // Only remove effect if audio manager is still valid
        if (this._audioManager?.audioContext) {
            this._audioManager.removeEffect('equalizer')
        }
    }
}
