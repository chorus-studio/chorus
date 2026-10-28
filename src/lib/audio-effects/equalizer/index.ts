import AudioManager from '../audio-manager'
import { EQ_PRESETS, EQ_FILTERS, resolveEQPreset } from './presets'

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
        // A removed preset's name resolves to its kept twin.
        effect = resolveEQPreset(effect)
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

        // Unknown name (a stale saved preset): flat instead of crashing the engine.
        const effectGain = EQ_PRESETS[effect]?.[index] ?? 0
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

        if (this._filters.length > 0) {
            // Register the filter chain with separate input/output nodes FIRST.
            // This triggers rebuildEffectChain → cleanupEffectChain, which calls
            // disconnect() on the input/output nodes. We must do this BEFORE
            // connecting the internal chain, otherwise cleanupEffectChain breaks
            // the internal filter[0] → filter[1] → ... → filter[n] connections.
            this._audioManager.connectEqualizer({
                input: this._filters[0],
                output: this._filters[this._filters.length - 1]
            })

            // Now connect filters in series internally (after cleanup has run)
            for (let i = 0; i < this._filters.length - 1; i++) {
                this._filters[i].connect(this._filters[i + 1])
            }
        }
    }

    // Live editor path: ramp raw per-band gains onto the filter chain, building +
    // connecting it on demand so editing works even from a 'none'/cold state. The
    // gains array maps to the first gains.length filters; the rest stay flat (0 dB).
    applyManualGains(gains: number[]) {
        if (!this._audioManager.audioContext) return
        this._audioContext = this._audioManager.audioContext

        if (this._filters.length === 0) {
            this._filters = EQ_FILTERS.map((setting) => {
                const filter = this._audioContext!.createBiquadFilter()
                filter.type = setting.type as BiquadFilterType
                filter.frequency.value = setting.freq || 0
                filter.gain.value = 0
                filter.Q.value = 1
                return filter
            })

            // Register input/output (triggers chain cleanup) BEFORE wiring the
            // internal series, same ordering constraint as #applyEQFilters.
            this._audioManager.connectEqualizer({
                input: this._filters[0],
                output: this._filters[this._filters.length - 1]
            })
            for (let i = 0; i < this._filters.length - 1; i++) {
                this._filters[i].connect(this._filters[i + 1])
            }
        }

        const t = this._audioContext.currentTime
        this._filters.forEach((filter, i) => {
            filter.gain.linearRampToValueAtTime(gains[i] ?? 0, t + 0.05)
        })
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
