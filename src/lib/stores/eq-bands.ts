import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'

const EQ_BANDS_STORE_KEY = 'local:chorus_eq_bands'

// EQ presets are authored as 10 gain values (the first 10 EQ_FILTERS bands), so the
// editable band set is 10. Gains are in dB.
export const EQ_BAND_COUNT = 10
export type EQBands = number[]
export const defaultEQBands: EQBands = Array(EQ_BAND_COUNT).fill(0)

function normalize(bands: unknown): EQBands {
    if (!Array.isArray(bands) || bands.length !== EQ_BAND_COUNT) return [...defaultEQBands]
    return bands.map((v) => (typeof v === 'number' ? v : 0))
}

function createEQBandsStore() {
    const store = writable<EQBands>([...defaultEQBands])
    const { subscribe, set, update } = store
    let isUpdatingStorage = false

    function dispatchBands() {
        if (typeof window !== 'undefined') {
            window.postMessage({ type: 'FROM_EQ_PARAMS_LISTENER', data: get(store) }, '*')
        }
    }

    async function persist() {
        isUpdatingStorage = true
        try {
            await storage.setItem<EQBands>(EQ_BANDS_STORE_KEY, get(store))
        } catch (error) {
            console.error('Error saving EQ bands:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    async function updateBand({ index, value }: { index: number; value: number }) {
        update((bands) => {
            const next = [...bands]
            next[index] = value
            return next
        })
        await persist()
        dispatchBands()
    }

    async function setFromPreset(bands: EQBands) {
        set(normalize(bands))
        await persist()
        dispatchBands()
    }

    async function reset() {
        set([...defaultEQBands])
        await persist()
        dispatchBands()
    }

    storage.getItem<EQBands>(EQ_BANDS_STORE_KEY, { fallback: [...defaultEQBands] }).then((value) => {
        set(normalize(value))
    })

    storage.watch<EQBands>(EQ_BANDS_STORE_KEY, (value) => {
        if (!value || isUpdatingStorage) return
        set(normalize(value))
    })

    return { set, reset, subscribe, updateBand, setFromPreset, dispatchBands }
}

export const eqBandsStore = createEQBandsStore()
