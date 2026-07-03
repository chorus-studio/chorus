import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import { syncWithType } from '$lib/utils/store-utils'

const REVERB_PARAMS_STORE_KEY = 'local:chorus_reverb_params'

// The 12 Dattorro reverb worklet parameters (src/public/processor.js). Ranges:
// preDelay is in samples (0..sampleRate); the rest are 0..1 except the excursion
// pair which is 0..2. Values mirror the worklet's defaultValues.
export type ReverbParams = {
    preDelay: number
    bandwidth: number
    inputDiffusion1: number
    inputDiffusion2: number
    decay: number
    decayDiffusion1: number
    decayDiffusion2: number
    damping: number
    excursionRate: number
    excursionDepth: number
    dry: number
    wet: number
}

export const defaultReverbParams: ReverbParams = {
    preDelay: 0,
    bandwidth: 0.9999,
    inputDiffusion1: 0.75,
    inputDiffusion2: 0.625,
    decay: 0.5,
    decayDiffusion1: 0.7,
    decayDiffusion2: 0.5,
    damping: 0.005,
    excursionRate: 0.5,
    excursionDepth: 0.7,
    dry: 0.6,
    wet: 0.3
}

function createReverbParamsStore() {
    const store = writable<ReverbParams>(defaultReverbParams)
    const { subscribe, set, update } = store
    let isUpdatingStorage = false
    // The values the config editor started from (the "from:" preset) — what a
    // config-view reset returns to. Null = no starting preset (engine defaults).
    let seedParams: ReverbParams | null = null

    function dispatchParams() {
        const params = get(store)
        if (typeof window !== 'undefined') {
            window.postMessage({ type: 'FROM_REVERB_PARAMS_LISTENER', data: params }, '*')
        }
    }

    async function updateParam({ key, value }: { key: keyof ReverbParams; value: number }) {
        update((state) => ({ ...state, [key]: value }))
        const newState = get(store)
        isUpdatingStorage = true
        try {
            await storage.setItem<ReverbParams>(REVERB_PARAMS_STORE_KEY, newState)
        } catch (error) {
            console.error('Error updating reverb param in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
        dispatchParams()
    }

    async function setFromPreset(params: ReverbParams) {
        set(params)
        seedParams = { ...params }
        isUpdatingStorage = true
        try {
            await storage.setItem<ReverbParams>(REVERB_PARAMS_STORE_KEY, params)
        } catch (error) {
            console.error('Error setting reverb params from preset:', error)
        } finally {
            isUpdatingStorage = false
        }
        dispatchParams()
    }

    // Seed the editor's starting point without persisting/dispatching (the values
    // are already applied — this just records where a config reset returns to).
    function seed(params: ReverbParams) {
        set(params)
        seedParams = { ...params }
    }

    // Mark the current values as the new starting point (e.g. after saving them
    // as a user preset) without touching the applied audio.
    function markSeed(params: ReverbParams) {
        seedParams = { ...params }
    }

    // Config-view reset: back to the "from:" starting point, keeping the reverb
    // on. With no starting preset, fall back to defaults (silently — dispatching
    // would arm the reverb node just to play defaults).
    async function resetToSeed() {
        if (!seedParams) return resetSilent()
        set({ ...seedParams })
        isUpdatingStorage = true
        try {
            await storage.setItem<ReverbParams>(REVERB_PARAMS_STORE_KEY, seedParams)
        } catch (error) {
            console.error('Error resetting reverb params to seed:', error)
        } finally {
            isUpdatingStorage = false
        }
        dispatchParams()
    }

    async function reset() {
        await resetSilent()
        dispatchParams()
    }

    // Reset values + storage WITHOUT dispatching to the audio side. Used by the
    // fx tab's reset button: dispatching would rebuild the reverb node on demand
    // (applyManualParams) right after the reset just tore it down.
    async function resetSilent() {
        set(defaultReverbParams)
        seedParams = null
        isUpdatingStorage = true
        try {
            await storage.setItem<ReverbParams>(REVERB_PARAMS_STORE_KEY, defaultReverbParams)
        } catch (error) {
            console.error('Error resetting reverb params:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    storage
        .getItem<ReverbParams>(REVERB_PARAMS_STORE_KEY, { fallback: defaultReverbParams })
        .then((value) => {
            if (!value) return
            const syncedValue = syncWithType(value, defaultReverbParams)
            set(syncedValue)
            storage.setItem<ReverbParams>(REVERB_PARAMS_STORE_KEY, syncedValue).catch(() => {
                isUpdatingStorage = false
            })
        })

    storage.watch<ReverbParams>(REVERB_PARAMS_STORE_KEY, (value) => {
        if (!value || isUpdatingStorage) return
        const syncedValue = syncWithType(value, defaultReverbParams)
        set(syncedValue)
    })

    return {
        set,
        seed,
        markSeed,
        reset,
        resetSilent,
        resetToSeed,
        subscribe,
        updateParam,
        dispatchParams,
        setFromPreset
    }
}

export const reverbParamsStore = createReverbParamsStore()
