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

function createMSParamsStore() {
    const store = writable<MSParams>(defaultMSParams)
    const { subscribe, set, update } = store
    let isUpdatingStorage = false

    function dispatchParams() {
        const params = get(msParamsStore)
        console.log('msParamsStore.dispatchParams:', params)
        if (typeof window !== 'undefined') {
            window.postMessage({ type: 'FROM_MS_PARAMS_LISTENER', data: params }, '*')
        }
    }

    async function updateParam({ key, value }: { key: keyof MSParams; value: number }) {
        update((state) => ({ ...state, [key]: value }))
        const newState = get(store)
        isUpdatingStorage = true
        try {
            await storage.setItem<MSParams>(MS_PARAMS_STORE_KEY, newState)
        } catch (error) {
            console.error('Error updating MS param in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
        dispatchParams()
    }

    async function setFromPreset(params: MSParams) {
        set(params)
        isUpdatingStorage = true
        try {
            await storage.setItem<MSParams>(MS_PARAMS_STORE_KEY, params)
        } catch (error) {
            console.error('Error setting MS params from preset:', error)
        } finally {
            isUpdatingStorage = false
        }
        dispatchParams()
    }

    async function reset() {
        set(defaultMSParams)
        isUpdatingStorage = true
        try {
            await storage.setItem<MSParams>(MS_PARAMS_STORE_KEY, defaultMSParams)
        } catch (error) {
            console.error('Error resetting MS params:', error)
        } finally {
            isUpdatingStorage = false
        }
        dispatchParams()
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
        reset,
        subscribe,
        updateParam,
        dispatchParams,
        setFromPreset
    }
}

export const msParamsStore = createMSParamsStore()
