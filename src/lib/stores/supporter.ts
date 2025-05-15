import { writable } from 'svelte/store'

function createSupporterStore() {
    const { subscribe, set } = writable({ isSupporter: false })

    async function sync() {
        // TODO: Use License Key to check if user is supporter
        const isSupporter = false
        set({ isSupporter })
    }

    return {
        sync,
        subscribe
    }
}

export const supporterStore = createSupporterStore()
