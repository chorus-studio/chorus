import { get, writable } from 'svelte/store'
import { getLyricsService } from '$lib/api/services/lyrics'
import type { Lyrics } from '$lib/utils/lyrics'

/**
 * Lyrics by track id for the session: undefined until asked for, null when
 * the track has none. The lyrics picker reads this; the preview gallery
 * seeds it.
 */
export type LyricsState = Record<string, Lyrics | null | undefined>

function createLyricsStore() {
    const store = writable<LyricsState>({})
    const inFlight = new Map<string, Promise<Lyrics | null>>()

    function seed(track_id: string, lyrics: Lyrics | null) {
        store.update((state) => ({ ...state, [track_id]: lyrics }))
    }

    /** Fetch once per track; later calls get the cached answer. */
    async function load(track_id: string): Promise<Lyrics | null> {
        if (!track_id) return null
        const known = get(store)[track_id]
        if (known !== undefined) return known
        const pending = inFlight.get(track_id)
        if (pending) return pending
        const request = (async () => {
            let lyrics: Lyrics | null = null
            try {
                lyrics = await getLyricsService().getLyrics(track_id)
            } catch (error) {
                console.warn('Lyrics unavailable:', error)
            }
            seed(track_id, lyrics)
            inFlight.delete(track_id)
            return lyrics
        })()
        inFlight.set(track_id, request)
        return request
    }

    return { subscribe: store.subscribe, load, seed }
}

export const lyricsStore = createLyricsStore()
