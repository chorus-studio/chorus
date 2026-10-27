import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import { syncWithType } from '$lib/utils/store-utils'

const MS_PARAMS_STORE_KEY = 'local:chorus_ms_params'

export type MSParams = {
    mode: number // 0-8: bypass, left, right, mid, side, width, swap, mono, reverse
    width: number // 0-200
    midGain: number // -12 to 12
    sideGain: number // -12 to 12
    balance: number // -100 to 100
}

export const defaultMSParams: MSParams = {
    mode: 0, // bypass
    width: 100,
    midGain: 0,
    sideGain: 0,
    balance: 0
}

// The worklet's channel modes (src/public/ms-processor.js). The Config half
// edits in WIDTH, the only mode where every slider does something.
export const MS_MODE = {
    bypass: 0,
    leftOnly: 1,
    rightOnly: 2,
    midOnly: 3,
    sideOnly: 4,
    width: 5,
    swap: 6,
    mono: 7,
    reversePhase: 8
} as const

/** Whether a slider is audible in the given mode (balance always is). */
export function paramAudible(key: keyof MSParams, mode: number): boolean {
    switch (key) {
        case 'width':
            return mode === MS_MODE.width
        case 'midGain':
            return mode === MS_MODE.width || mode === MS_MODE.midOnly
        case 'sideGain':
            return mode === MS_MODE.width || mode === MS_MODE.sideOnly
        default:
            return true
    }
}

function createMSParamsStore() {
    const store = writable<MSParams>(defaultMSParams)
    const { subscribe, set, update } = store
    let isUpdatingStorage = false
    // The values the config editor started from (the "from:" preset) — what a
    // config-view reset returns to. Null = no starting preset (engine defaults).
    let seedParams: MSParams | null = null

    function dispatchParams() {
        const params = get(store)
        if (typeof window !== 'undefined') {
            window.postMessage({ type: 'FROM_MS_PARAMS_LISTENER', data: params }, '*')
        }
    }

    async function persist(params: MSParams) {
        isUpdatingStorage = true
        try {
            await storage.setItem<MSParams>(MS_PARAMS_STORE_KEY, params)
        } catch (error) {
            console.error('Error saving MS params:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    async function updateParams(changes: Partial<MSParams>) {
        update((state) => ({ ...state, ...changes }))
        await persist(get(store))
        dispatchParams()
    }

    /**
     * One slider moved. A width, mid or side change in a mode where it would be
     * inaudible (mono, swap, a single channel…) switches the engine to WIDTH so
     * the drag is heard; balance is heard in every mode and leaves it alone.
     */
    async function updateParam({ key, value }: { key: keyof MSParams; value: number }) {
        const { mode } = get(store)
        const changes: Partial<MSParams> = { [key]: value }
        if (!paramAudible(key, mode)) changes.mode = MS_MODE.width
        await updateParams(changes)
    }

    async function setFromPreset(params: MSParams) {
        set(params)
        seedParams = { ...params }
        await persist(params)
        dispatchParams()
    }

    // Seed the editor's starting point without persisting/dispatching (the values
    // are already applied — this just records where a config reset returns to).
    function seed(params: MSParams) {
        set(params)
        seedParams = { ...params }
    }

    // Config-view reset: back to the "from:" starting point, keeping the effect
    // on. With no starting preset, fall back to defaults (silently — dispatching
    // would arm the node just to play a bypass).
    async function resetToSeed() {
        if (!seedParams) return resetSilent()
        set({ ...seedParams })
        await persist(seedParams)
        dispatchParams()
    }

    async function reset() {
        await resetSilent()
        dispatchParams()
    }

    // Reset values + storage WITHOUT dispatching to the audio side. Used by the
    // tab's "Turn off": dispatching would rebuild the node (applyManualParams)
    // right after the effect switch tore it down.
    async function resetSilent() {
        set(defaultMSParams)
        seedParams = null
        await persist(defaultMSParams)
    }

    // Load from storage
    storage
        .getItem<MSParams>(MS_PARAMS_STORE_KEY, {
            fallback: defaultMSParams
        })
        .then((value) => {
            if (!value) return

            const syncedValue = syncWithType(value, defaultMSParams)
            set(syncedValue)

            storage.setItem<MSParams>(MS_PARAMS_STORE_KEY, syncedValue).catch((error) => {
                console.error('Error updating MS params storage:', error)
                isUpdatingStorage = false
            })
        })

    // Watch for storage changes
    storage.watch<MSParams>(MS_PARAMS_STORE_KEY, (value) => {
        if (!value || isUpdatingStorage) return

        const syncedValue = syncWithType(value, defaultMSParams)
        set(syncedValue)
    })

    return {
        set,
        seed,
        reset,
        resetSilent,
        resetToSeed,
        subscribe,
        updateParam,
        updateParams,
        dispatchParams,
        setFromPreset
    }
}

export const msParamsStore = createMSParamsStore()
