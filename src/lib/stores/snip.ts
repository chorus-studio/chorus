import { writable } from 'svelte/store'

export type Snip = {
    is_shared: boolean
    start_time: number
    end_time: number
    last_updated: 'start' | 'end'
}

function createSnipStore() {
    const { subscribe, set, update } = writable<Snip | null>(null)

    function reset() {
        set(null)
    }

    return { subscribe, set, reset, update }
}

export const snipStore = createSnipStore()
