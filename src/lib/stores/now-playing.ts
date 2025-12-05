import { storage } from '@wxt-dev/storage'
import { get, writable } from 'svelte/store'
import { syncWithType } from '$lib/utils/store-utils'

import { dataStore } from '$lib/stores/data'
import { playback } from '$lib/utils/playback'
import { configStore } from '$lib/stores/config'
import { currentSongInfo } from '$lib/utils/song'
import { trackObserver } from '$lib/observers/track'
import type { SimpleTrack } from '$lib/stores/data/cache'

export const NOW_PLAYING_STORE_KEY = 'local:chorus_now_playing'

export type NowPlaying = SimpleTrack & {
    current: number
    duration: number
    id: string | null
    url: string | null
    cover: string | null
    title: string | null
    artist: string | null
    liked?: boolean | null
    album_id: string | null
    bg_colour: string | null
    text_colour: string | null
}

const defaultNowPlaying: NowPlaying = {
    song_id: '',
    track_id: '',
    // ---------
    id: null,
    url: null,
    liked: false,
    cover: null,
    title: null,
    artist: null,
    duration: 0,
    current: 0,
    album_id: null,
    text_colour: '#ffffff',
    bg_colour: '#000000',
    snip: null,
    playback: null,
    blocked: null
}

function createNowPlayingStore() {
    let observer: MutationObserver | null = null
    let currentSongId: string | null = null
    let isUpdatingStorage = false

    const store = writable<NowPlaying>(defaultNowPlaying)
    const { subscribe, set, update } = store

    function isAnchor(mutation: MutationRecord) {
        return (
            mutation.type === 'attributes' &&
            (mutation.target as HTMLElement)?.localName === 'div' &&
            mutation.attributeName === 'aria-label'
        )
    }

    function songChanged() {
        const songData = get(store)
        if (songData.id == null) return true

        const currentSongId = currentSongInfo().id
        return songData.id !== currentSongId
    }

    async function handleMutation(mutations: MutationRecord[]) {
        for (const mutation of mutations) {
            if (!isAnchor(mutation)) return
            if (!songChanged()) return

            const songInfo = currentSongInfo()
            if (!songInfo.id) return

            currentSongId = songInfo.id
            await updateNowPlaying(true)
            await trackObserver?.processSongTransition()
        }
    }

    function getSongInfo() {
        const songInfo = currentSongInfo()
        const { id = null, cover = null, url = null } = songInfo
        const [title, artist] = id?.split(' by ') ?? []
        const { duration = 0, position: current = 0, loop = false } = playback.data()

        const trackInfo = songInfo?.track_id
            ? dataStore.collectionObject[songInfo.track_id]
            : (dataStore.collection.find((x) => x.song_id == id) ?? ({} as SimpleTrack))

        if (
            trackInfo?.blocked ||
            configStore.checkIfTrackShouldBeSkipped({
                title: title ?? '',
                artist: artist ?? ''
            })
        ) {
            trackObserver?.skipTrack()
        }

        // Filter out null/undefined playback to prevent overwriting current settings
        const { playback: trackPlayback, ...restTrackInfo } = trackInfo || {}
        const filteredTrackInfo = trackPlayback
            ? { ...restTrackInfo, playback: trackPlayback }
            : restTrackInfo

        return {
            id,
            cover,
            title,
            artist,
            duration,
            current,
            loop,
            url,
            ...filteredTrackInfo
        }
    }

    async function updateNowPlaying(songChanged = false) {
        const songInfo = getSongInfo()
        const currentData = get(store)
        if (songChanged) {
            // When song changes, ensure we start fresh without old snip/blocked data
            // This prevents race conditions where old track data persists
            delete currentData?.blocked
            delete currentData?.snip

            // Only restore snip/blocked if the new song explicitly has them
            // This ensures we don't carry over old track's snip to new track

            // Only update playback if the new song explicitly has different playback settings
            // Otherwise preserve current playback settings (user-set rates)
            const newPlayback = 'playback' in songInfo ? songInfo.playback : undefined
            if (newPlayback && newPlayback !== currentData?.playback) {
                // New song has specific playback settings, use those
                currentData.playback = newPlayback
            }
            // If new song has no playback settings, keep current settings
        }

        const newState = { ...currentData, ...songInfo }

        let dataState: SimpleTrack | null = null
        if (newState.track_id && !dataStore.collectionObject[newState.track_id]) {
            await dataStore.generateSimpleTrack(newState)
            dataState = dataStore.collectionObject[newState.track_id] ?? {}
        }

        const updatedState = { ...newState, ...dataState }
        update(() => updatedState)

        isUpdatingStorage = true
        try {
            await storage.setItem<NowPlaying>(NOW_PLAYING_STORE_KEY, updatedState)
        } catch (error) {
            console.error('Error updating now playing storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    function setCurrentTime(time: number) {
        window.postMessage({ type: 'FROM_CURRENT_TIME_LISTENER', data: time }, '*')
    }

    async function setLiked(liked: boolean) {
        update((state) => ({ ...state, liked }))
        const newState = get(store)
        isUpdatingStorage = true
        try {
            await storage.setItem<NowPlaying>(NOW_PLAYING_STORE_KEY, newState)
        } catch (error) {
            console.error('Error updating liked state in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    async function observe() {
        const target = document.querySelector('[data-testid="now-playing-widget"]')
        if (!target) return

        observer = new MutationObserver(handleMutation)
        observer.observe(target, { attributes: true })
        await updateNowPlaying()
        await trackObserver?.initialize()
    }

    async function updateState(state: Partial<NowPlaying>) {
        update((prevState) => ({ ...prevState, ...state }))
        const newState = get(store)
        isUpdatingStorage = true
        try {
            await storage.setItem<NowPlaying>(NOW_PLAYING_STORE_KEY, newState)
        } catch (error) {
            console.error('Error updating now playing state in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    function disconnect() {
        observer?.disconnect()
        observer = null
        currentSongId = null
    }

    storage
        .getItem<NowPlaying>(NOW_PLAYING_STORE_KEY, { fallback: defaultNowPlaying })
        .then((savedState) => {
            if (!savedState) return

            // Sync the stored state with the current type definition
            const syncedState = syncWithType(savedState, defaultNowPlaying)
            set(syncedState)

            // Update storage with synced state
            isUpdatingStorage = true
            storage
                .setItem<NowPlaying>(NOW_PLAYING_STORE_KEY, syncedState)
                .then(() => {
                    isUpdatingStorage = false
                })
                .catch((error) => {
                    console.error('Error updating storage:', error)
                    isUpdatingStorage = false
                })
        })

    storage.watch<NowPlaying>(NOW_PLAYING_STORE_KEY, (newValues) => {
        if (!newValues || isUpdatingStorage) return

        const syncedState = syncWithType(newValues, defaultNowPlaying)
        set(syncedState)
    })

    return {
        update,
        updateState,
        subscribe,
        set,
        setLiked,
        setCurrentTime,
        observe,
        updateNowPlaying,
        disconnect
    }
}

export const nowPlaying = createNowPlayingStore()
