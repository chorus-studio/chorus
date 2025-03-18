import AudioManager from '../audio-manager'
import { EQ_PRESETS, EQ_FILTERS } from './presets'

export default class Equalizer {
    _filters: BiquadFilterNode[]
    _audioManager: AudioManager
    _audioContext?: AudioContext
    _audioNode?: AudioNode

    constructor(audioManager: AudioManager) {
        this._filters = []
        this._audioManager = audioManager
    }

    setEQEffect(effect: string) {
        if (!this._audioManager.audioContext) {
            throw new Error('AudioContext not initialized')
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
        if (!this._audioManager.source) {
            throw new Error('Audio source not initialized')
        }

        // Disconnect existing filters
        this.disconnect()

        // Create and connect new filters
        EQ_FILTERS.forEach((setting, index) => {
            const filter = this.createBiquadFilter({ setting, index, effect })
            this._filters.push(filter)
        })

        // Connect filters in series
        this._audioNode = this._audioManager.source
        this._filters.forEach((filter) => {
            this._audioNode?.connect(filter)
            this._audioNode = filter
        })

        // Connect the last filter to the destination
        if (this._audioNode) {
            this._audioManager.connectEqualizer(this._audioNode)
        }
    }

    disconnect() {
        this._filters.forEach((filter) => {
            filter.disconnect()
        })

        this._filters = []
        this._audioManager.disconnect()
    }
}
