import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import { syncWithType } from '$lib/utils/store-utils'

type PIP = {
    active: boolean
    key: null | string
}

const defaultPIP: PIP = {
    key: null,
    active: false
}

const PIP_STORE_KEY = 'local:chorus_pip'

function createPipStore() {
    const store = writable<PIP>(defaultPIP)
    const { subscribe, set, update } = store
    let isUpdatingStorage = false

    async function reset() {
        set(defaultPIP)
        isUpdatingStorage = true
        try {
            await storage.setItem<PIP>(PIP_STORE_KEY, defaultPIP)
        } catch (error) {
            console.error('Error resetting PIP in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    async function updatePip(pip: Partial<PIP>) {
        update((prev) => ({ ...prev, ...pip }))
        const newState = get(store)
        isUpdatingStorage = true
        try {
            await storage.setItem<PIP>(PIP_STORE_KEY, newState)
        } catch (error) {
            console.error('Error updating PIP in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    storage.getItem<PIP>(PIP_STORE_KEY, { fallback: defaultPIP }).then((savedState) => {
        if (!savedState) return

        // Sync the stored PIP with the current type definition
        const syncedState = syncWithType(savedState, defaultPIP)
        set(syncedState)

        // Update storage with synced state
        isUpdatingStorage = true
        storage
            .setItem<PIP>(PIP_STORE_KEY, syncedState)
            .then(() => {
                isUpdatingStorage = false
            })
            .catch((error) => {
                console.error('Error updating storage:', error)
                isUpdatingStorage = false
            })
    })

    storage.watch<PIP>(PIP_STORE_KEY, (newState) => {
        if (!newState || isUpdatingStorage) return

        const syncedState = syncWithType(newState, defaultPIP)
        set(syncedState)
    })

    return {
        reset,
        updatePip,
        subscribe
    }
}

export const pipStore = createPipStore()
