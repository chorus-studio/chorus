import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'

type PIP = {
    open: boolean
    active: boolean
}

const defaultPIP: PIP = {
    open: false,
    active: false
}

function createPipStore() {
    const store = writable<PIP>(defaultPIP)
    const { subscribe, set, update } = store

    async function reset() {
        set(defaultPIP)
        await storage.setItem<PIP>('local:chorus_pip', defaultPIP)
    }

    async function setOpen(open: boolean) {
        update((prev) => ({ ...prev, open }))
        const state = get(store)
        await storage.setItem<PIP>('local:chorus_pip', state)
    }

    async function setActive(active: boolean) {
        update((prev) => ({ ...prev, active }))
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
        setOpen,
        setActive,
        subscribe
    }
}
export const pipStore = createPipStore()
