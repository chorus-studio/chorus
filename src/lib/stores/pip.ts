import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'

type PIP = {
    open: boolean
}

const defaultPIP: PIP = {
    open: false
}
function createPipStore() {
    const store = writable<PIP>(defaultPIP)
    const { subscribe, set } = store

    async function update(open: boolean) {
        set({ open })
        await storage.setItem<PIP>('local:chorus_pip', { open })
    }

    storage.getItem<PIP>('local:chorus_pip', { fallback: defaultPIP }).then((savedState) => {
        if (savedState) store.set(savedState)
    })

    storage.watch<PIP>('local:chorus_pip', (newState) => {
        if (newState) store.set(newState)
    })

    return {
        update,
        subscribe
    }
}
export const pipStore = createPipStore()
