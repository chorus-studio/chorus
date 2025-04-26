import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'

type PIP = {
    active: boolean
    key: null | string
}

const defaultPIP: PIP = {
    key: null,
    active: false
}

function createPipStore() {
    const store = writable<PIP>(defaultPIP)
    const { subscribe, set, update } = store

    async function reset() {
        set(defaultPIP)
        await storage.setItem<PIP>('local:chorus_pip', defaultPIP)
    }

    async function updatePip(pip: Partial<PIP>) {
        update((prev) => ({ ...prev, ...pip }))
        const state = get(store)
        await storage.setItem<PIP>('local:chorus_pip', state)
    }

    storage.getItem<PIP>('local:chorus_pip', { fallback: defaultPIP }).then((savedState) => {
        if (savedState) store.set(savedState)
    })

    storage.watch<PIP>('local:chorus_pip', (newState) => {
        if (newState) store.set(newState)
    })

    return {
        reset,
        updatePip,
        subscribe
    }
}
export const pipStore = createPipStore()
