import { writable } from 'svelte/store'
import { mellowtel } from '$lib/utils/mellowtel'

function createSupporterStore() {
    const { subscribe, set } = writable({ isSupporter: false })

    async function sync() {
        const isSupporter = await mellowtel.getOptInStatus()
        set({ isSupporter })
    }

    return {
        sync,
        subscribe
    }
}

export const supporterStore = createSupporterStore()
