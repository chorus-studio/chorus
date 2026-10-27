import { get, writable } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import { syncWithType } from '$lib/utils/store-utils'
import { RESUME_OFF, type ResumeRewind } from '$lib/utils/resume-rewind'

type Seek = {
    rewind: number
    forward: number
}

export type SeekScope = 'default' | 'long_form'

type SeekData = {
    default: Seek
    long_form: Seek
    /** Jump back on resume, for podcasts & audiobooks only. */
    resume: ResumeRewind
    /** What is playing, from the track's context: music or long-form. */
    media_type: SeekScope
}

const defaultSeekData: SeekData = {
    media_type: 'default',
    default: { rewind: 10, forward: 10 },
    long_form: { rewind: 30, forward: 30 },
    resume: { seconds: 5, after: 1 }
}

/** The jump back the media layer should make on the next resume, given what is playing. */
export const resumeFor = (data: SeekData): ResumeRewind =>
    data.media_type === 'long_form' ? data.resume : RESUME_OFF

const SEEK_STORE_KEY = 'local:chorus_seek'

function createSeekStore() {
    const store = writable<SeekData>(defaultSeekData)
    const { subscribe, set, update } = store
    let isUpdatingStorage = false

    // The media layer (MAIN world) keeps the resume rule itself: it is the one
    // that sees the element pause and play.
    if (typeof window !== 'undefined') {
        subscribe((data) => {
            window.postMessage({ type: 'FROM_SEEK_LISTENER', data: resumeFor(data) }, '*')
        })
    }

    async function updateMediaType(type: SeekScope) {
        update((prev: SeekData) => ({
            ...prev,
            media_type: type
        }))
        const newState = get(store)
        isUpdatingStorage = true
        try {
            await storage.setItem<SeekData>(SEEK_STORE_KEY, newState)
        } catch (error) {
            console.error('Error updating media type in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    async function updateSeek(state: Partial<SeekData>) {
        update((prev: SeekData) => ({
            ...prev,
            ...state
        }))
        const newState = get(store)
        isUpdatingStorage = true
        try {
            await storage.setItem<SeekData>(SEEK_STORE_KEY, newState)
        } catch (error) {
            console.error('Error updating seek in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    storage.getItem<SeekData>(SEEK_STORE_KEY, { fallback: defaultSeekData }).then((data) => {
        if (!data) return

        // Sync the stored seek data with the current type definition
        const syncedData = syncWithType(data, defaultSeekData)
        set(syncedData)

        // Update storage with synced data
        isUpdatingStorage = true
        storage
            .setItem<SeekData>(SEEK_STORE_KEY, syncedData)
            .then(() => {
                isUpdatingStorage = false
            })
            .catch((error) => {
                console.error('Error updating storage:', error)
                isUpdatingStorage = false
            })
    })

    storage.watch<SeekData>(SEEK_STORE_KEY, (data: SeekData | null) => {
        if (!data || isUpdatingStorage) return

        const syncedData = syncWithType(data, defaultSeekData)
        set(syncedData)
    })

    async function reset() {
        set(defaultSeekData)
        isUpdatingStorage = true
        try {
            await storage.setItem<SeekData>(SEEK_STORE_KEY, defaultSeekData)
        } catch (error) {
            console.error('Error resetting seek data in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    return {
        reset,
        subscribe,
        updateSeek,
        updateMediaType
    }
}

export const seekStore = createSeekStore()
