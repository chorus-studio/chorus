import { get, writable } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import {
    defaultPrefs,
    migratePrefs,
    recordPlay,
    trackAlbum as trackAlbumIn,
    trackArtist as trackArtistIn,
    untrackAlbum as untrackAlbumIn,
    untrackArtist as untrackArtistIn,
    type AlbumTrack,
    type DiscographyPrefs,
    type DiscographyState,
    type Filters,
    type Listed,
    type Play
} from '$lib/utils/discography'

/** Progress through artists' discographies, by artist id. */
export const DISCOGRAPHY_STORE_KEY = 'local:chorus_discography'
/** What counts towards progress, and whether every artist played is noted. */
export const DISCOGRAPHY_PREFS_KEY = 'local:chorus_discography_prefs'

type AlbumToTrack = Omit<Listed, 'kind' | 'total'> &
    Partial<Pick<Listed, 'kind' | 'total'>> & { tracks?: AlbumTrack[] }

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

    const record = (play: Play, now?: number) => persist(recordPlay(get(store), play, now))

    const trackArtist = (artist: { id: string; name: string }, listed: Listed[], now?: number) =>
        persist(trackArtistIn(get(store), artist, listed, now))

    const untrackArtist = (artist_id: string) => persist(untrackArtistIn(get(store), artist_id))

    const trackAlbum = (artist: { id: string; name: string }, album: AlbumToTrack, now?: number) =>
        persist(trackAlbumIn(get(store), artist, album, now))

    const untrackAlbum = (artist_id: string, album_id: string) =>
        persist(untrackAlbumIn(get(store), artist_id, album_id))

    storage.getItem<DiscographyState>(DISCOGRAPHY_STORE_KEY).then((saved) => {
        if (saved) store.set(saved)
    })

    storage.watch<DiscographyState>(DISCOGRAPHY_STORE_KEY, (saved) => {
        if (isUpdatingStorage) return
        store.set(saved ?? {})
    })

    return {
        subscribe: store.subscribe,
        record,
        /** Stop tracking an artist; its progress goes with it. */
        forget: untrackArtist,
        trackArtist,
        untrackArtist,
        trackAlbum,
        untrackAlbum,
        get: () => get(store)
    }
}

export const discographyStore = createDiscographyStore()

function createPrefsStore() {
    const store = writable<DiscographyPrefs>(defaultPrefs)
    let isUpdatingStorage = false

    async function persist(prefs: DiscographyPrefs) {
        store.set(prefs)
        isUpdatingStorage = true
        try {
            await storage.setItem<DiscographyPrefs>(DISCOGRAPHY_PREFS_KEY, prefs)
        } catch (error) {
            console.error('Error saving discography preferences:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    const setFilters = (patch: Partial<Filters>) => {
        const prefs = get(store)
        return persist({ ...prefs, filters: { ...prefs.filters, ...patch } })
    }

    const setAutoTrack = (auto_track: boolean) => persist({ ...get(store), auto_track })

    storage.getItem<unknown>(DISCOGRAPHY_PREFS_KEY).then((saved) => {
        if (saved) store.set(migratePrefs(saved))
    })

    storage.watch<unknown>(DISCOGRAPHY_PREFS_KEY, (saved) => {
        if (isUpdatingStorage) return
        store.set(migratePrefs(saved))
    })

    return { subscribe: store.subscribe, setFilters, setAutoTrack, get: () => get(store) }
}

export const discographyPrefs = createPrefsStore()
