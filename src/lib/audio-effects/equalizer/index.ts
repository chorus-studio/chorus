import AudioManager from '../audio-manager'
import { EQ_PRESETS, EQ_FILTERS } from './presets'

export default class Equalizer {
    _filters: BiquadFilterNode[]
    _audioManager: AudioManager
    _audioContext: AudioContext | null
    _audioNode: AudioNode | null

    constructor(audioManager: AudioManager) {
        this._filters = []
        this._audioManager = audioManager
        this._audioContext = null
        this._audioNode = null
    }

    #setup() {
        this._audioContext = this._audioManager.audioContext as AudioContext
    }

    setEQEffect(effect: string) {
        this.#setup()
        if (effect == 'none') return this.disconnect()

        try {
            this.#applyEQFilters(effect)
        } catch (error) {
            console.error({ error })
        }
    }

    #createBiquadFilter({
        setting,
        effect,
        index
    }: {
        setting: { freq: number; gain: number; type: string }
        effect: string
        index: number
    }) {
        const effectGain = EQ_PRESETS[effect][index]
        const filter = this._audioContext.createBiquadFilter()

        filter.type = setting.type as BiquadFilterType
        filter.frequency.value = setting.freq || 0
        filter.gain.value = effectGain || 0
        filter.Q.value = 1

        return filter
    }

    #applyEQFilters(effect: string) {
        this.disconnect()
        EQ_FILTERS.forEach((setting, index) => {
            const filter = this.#createBiquadFilter({ setting, index, effect })
            this._filters.push(filter)
        })

        // connect filters
        this._audioNode = this._audioManager.source as AudioNode
        this._filters.forEach((filter) => {
            this._audioNode.connect(filter)
            this._audioNode = filter
        })

        this._audioManager.connectEqualizer(this._audioNode)
    }

    disconnect() {
        this._filters.forEach((filter) => {
            filter.disconnect()
        })

        this._filters = []
        this._audioManager.disconnect()
    }
}
