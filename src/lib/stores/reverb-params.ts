import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import { syncWithType } from '$lib/utils/store-utils'

const REVERB_PARAMS_STORE_KEY = 'local:chorus_reverb_params'
const REVERB_PARAMS_VERSION_KEY = 'local:chorus_reverb_params_version'

/**
 * Until 2026-10-27 the digital reverb ran mono-in beside a gain-1.0 stereo
 * bypass, so a saved config's dry/wet meant "1 + dry" of the track against
 * "wet" of reverb. The worklet is now the whole path: dry per channel at
 * `dry`, reverb at `wet`. This keeps a saved config's balance.
 */
export const REVERB_MIX_VERSION = 2
export function migrateReverbMix(params: ReverbParams): ReverbParams {
    return { ...params, dry: 1, wet: Number((params.wet / (1 + params.dry)).toFixed(3)) }
}

// The reverb worklets' parameters: the Dattorro plate's twelve
// (src/public/processor.js) plus the FDN rooms' `size` and `early`
// (src/public/fdn-processor.js). Shared names mean the same thing on both;
// each worklet ignores the ones it has no use for. Ranges: preDelay is in
// samples (0..sampleRate); the rest are 0..1 except the excursion pair which
// is 0..2. Values mirror the plate's defaultValues.
export type ReverbParams = {
    preDelay: number
    bandwidth: number
    inputDiffusion1: number
    inputDiffusion2: number
    decay: number
    decayDiffusion1: number
    decayDiffusion2: number
    damping: number
    size: number
    early: number
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
    size: 0.5,
    early: 0.5,
    excursionRate: 0.5,
    excursionDepth: 0.7,
    dry: 1,
    wet: 0.2
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

    Promise.all([
        storage.getItem<ReverbParams>(REVERB_PARAMS_STORE_KEY),
        storage.getItem<number>(REVERB_PARAMS_VERSION_KEY)
    ]).then(async ([stored, version]) => {
        const outdated = (version ?? 1) < REVERB_MIX_VERSION
        if (outdated) await storage.setItem(REVERB_PARAMS_VERSION_KEY, REVERB_MIX_VERSION)
        if (!stored) return
        let syncedValue = syncWithType(stored, defaultReverbParams)
        if (outdated) syncedValue = migrateReverbMix(syncedValue)
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
