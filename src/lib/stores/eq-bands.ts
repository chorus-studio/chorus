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
    // The values the config editor started from (the "from:" preset) — what a
    // config-view reset returns to. Null = no starting preset (engine defaults).
    let seedBands: EQBands | null = null

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
        seedBands = normalize(bands)
        await persist()
        dispatchBands()
    }

    // Seed the editor's starting point without persisting/dispatching (the values
    // are already applied — this just records where a config reset returns to).
    function seed(bands: EQBands) {
        set(normalize(bands))
        seedBands = normalize(bands)
    }

    // Mark the current values as the new starting point (e.g. after saving them
    // as a user preset) without touching the applied audio.
    function markSeed(bands: EQBands) {
        seedBands = normalize(bands)
    }

    // Config-view reset: back to the "from:" starting point, keeping the EQ on.
    // With no starting preset, fall back to flat (silently — nothing to re-apply).
    async function resetToSeed() {
        if (!seedBands) return resetSilent()
        set([...seedBands])
        await persist()
        dispatchBands()
    }

    async function reset() {
        await resetSilent()
        dispatchBands()
    }

    // Reset values + storage WITHOUT dispatching to the audio side. Used by the
    // eq tab's reset button: dispatching would rebuild the filter chain on demand
    // (applyManualGains) right after the reset just tore it down.
    async function resetSilent() {
        set([...defaultEQBands])
        seedBands = null
        await persist()
    }

    storage.getItem<EQBands>(EQ_BANDS_STORE_KEY, { fallback: [...defaultEQBands] }).then((value) => {
        set(normalize(value))
    })

    storage.watch<EQBands>(EQ_BANDS_STORE_KEY, (value) => {
        if (!value || isUpdatingStorage) return
        set(normalize(value))
    })

    return {
        set,
        seed,
        markSeed,
        reset,
        resetSilent,
        resetToSeed,
        subscribe,
        updateBand,
        setFromPreset,
        dispatchBands
    }
}

export const eqBandsStore = createEQBandsStore()
