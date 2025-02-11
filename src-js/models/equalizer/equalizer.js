import { EQ_PRESETS, EQ_FILTERS } from '../../lib/equalizer/presets'

export default class Equalizer {
    _filters

    constructor(audioManager) {
        this._filters = []
        this._audioManager = audioManager
    }

    #setup() {
        this._audioManager.init()
        this._audioContext = this._audioManager.audioContext
    }

    async setEQEffect(effect) {
        this.#setup()
        if (effect == 'none') return this.disconnect()

        try {
            this.#applyEQFilters(effect)
        } catch (error) {
            console.error({ error })
        }
    }

    #createBiquadFilter({ setting, effect, index }) {
        const effectGain = EQ_PRESETS[effect][index]
        const filter = this._audioContext.createBiquadFilter()

        filter.type = setting.type
        filter.frequency.value = setting.freq || 0
        filter.gain.value = effectGain || 0
        filter.Q.value = 1

        return filter
    }

    #applyEQFilters(effect) {
        this.disconnect()
        EQ_FILTERS.forEach((setting, index) => {
            const filter = this.#createBiquadFilter({ setting, index, effect })
            this._filters.push(filter)
        })

        // connect filters
        this._audioNode = this._audioManager.source
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
