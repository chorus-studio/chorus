import { get, writable } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import { recordPlay, type DiscographyState, type Play } from '$lib/utils/discography'

/** Progress through artists' discographies, by artist id. */
export const DISCOGRAPHY_STORE_KEY = 'local:chorus_discography'

function createDiscographyStore() {
    const store = writable<DiscographyState>({})
    let isUpdatingStorage = false

    async function persist(state: DiscographyState) {
        store.set(state)
        isUpdatingStorage = true
        try {
            await storage.setItem<DiscographyState>(DISCOGRAPHY_STORE_KEY, state)
        } catch (error) {
            console.error('Error saving discography progress:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    const record = (play: Play) => persist(recordPlay(get(store), play))

    async function forget(artist_id: string) {
        const next = { ...get(store) }
        delete next[artist_id]
        await persist(next)
    }

    storage.getItem<DiscographyState>(DISCOGRAPHY_STORE_KEY).then((saved) => {
        if (saved) store.set(saved)
    })

    storage.watch<DiscographyState>(DISCOGRAPHY_STORE_KEY, (saved) => {
        if (isUpdatingStorage) return
        store.set(saved ?? {})
    })

    return { subscribe: store.subscribe, record, forget, get: () => get(store) }
}

export const discographyStore = createDiscographyStore()
