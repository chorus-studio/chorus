import { get, writable } from 'svelte/store'
import { storage } from '@wxt-dev/storage'

type Seek = {
    rewind: number
    forward: number
}

type SeekData = {
    default: Seek
    long_form: Seek
    is_long_form: boolean
    long_form_min: number
}

const defaultSeekData: SeekData = {
    is_long_form: false,
    long_form_min: 30,
    default: { rewind: 10, forward: 10 },
    long_form: { rewind: 30, forward: 30 }
}

function createSeekStore() {
    const store = writable<SeekData>(defaultSeekData)
    const { subscribe, set, update } = store

    async function updateSeek({
        type = 'default',
        seek
    }: {
        type: 'default' | 'long_form'
        seek: { key: 'rewind' | 'forward'; value: number }
    }) {
        update((prev: SeekData) => ({
            ...prev,
            [type]: { ...prev[type], [seek.key]: seek.value }
        }))
        const newState = get(store)
        await storage.setItem('local:chorus_seek', newState)
    }

    storage.getItem<SeekData>('local:chorus_seek', { fallback: defaultSeekData }).then((data) => {
        if (data) set(data)
    })

    storage.watch<SeekData>('local:chorus_seek', (data: SeekData | null) => {
        if (data) set(data)
    })

    async function toggleLongForm() {
        update((prev: SeekData) => ({
            ...prev,
            is_long_form: !prev.is_long_form
        }))
        const newState = get(store)
        await storage.setItem('local:chorus_seek', newState)
    }

    async function reset() {
        set(defaultSeekData)
        await storage.setItem<SeekData>('local:chorus_seek', defaultSeekData)
    }

    return {
        reset,
        subscribe,
        updateSeek,
        toggleLongForm
    }
}

export const seekStore = createSeekStore()
