import { get, writable } from 'svelte/store'
import { storage } from '@wxt-dev/storage'

import { dataStore } from '$lib/stores/data'
import { playback } from '$lib/utils/playback'
import { currentSongInfo } from '$lib/utils/song'
import { trackObserver } from '$lib/observers/track'
import type { SimpleTrack } from '$lib/stores/data/cache'

export type NowPlaying = SimpleTrack & {
    liked: boolean
    blocked: boolean
    current: number
    duration: number
    loop: boolean
    id: string | null
    type: string | null
    url: string | null
    cover: string | null
    title: string | null
    artist: string | null
    track_id: string | null
    textColour: string | null
    backgroundColour: string | null
}

const defaultNowPlaying: NowPlaying = {
    id: null,
    type: null,
    url: null,
    liked: false,
    blocked: false,
    cover: null,
    title: null,
    artist: null,
    duration: 0,
    current: 0,
    loop: false,
    track_id: null,
    textColour: '#ffffff',
    backgroundColour: '#000000'
}

function createNowPlayingStore() {
    let observer: MutationObserver | null = null
    let currentSongId: string | null = null

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

    function skipTrack() {
        const nextButton = document.querySelector(
            '[data-testid="control-button-skip-forward"]'
        ) as HTMLButtonElement
        nextButton?.click()
    }

    async function handleMutation(mutations: MutationRecord[]) {
        for (const mutation of mutations) {
            if (!isAnchor(mutation)) return
            if (!songChanged()) return

            const songInfo = getSongInfo()
            if (!songInfo.id) return

            currentSongId = songInfo.id
            await updateNowPlaying()
            await trackObserver?.processSongTransition()
        }
    }

    function getSongInfo() {
        const songInfo = currentSongInfo()
        const { id = null, cover = null, url = null } = songInfo
        const [title, artist] = id?.split(' by ') ?? []
        const { duration = 0, position: current = 0, loop = false } = playback.data()

        const trackInfo = dataStore.collection.find((x) => x.song_id == id) ?? ({} as SimpleTrack)

        return {
            id,
            cover,
            title,
            artist,
            duration,
            current,
            loop,
            url,
            type: trackInfo?.track_id ? 'track' : songInfo.type,
            ...trackInfo
        }
    }

    async function updateNowPlaying() {
        const songInfo = getSongInfo()
        update((state) => ({ ...state, ...songInfo }))
        const currentState = get(store)

        if (
            currentState.type == 'track' &&
            currentState.track_id &&
            !dataStore.collectionObject[currentState.track_id]
        ) {
            dataStore.generateSimpleTrack(currentState)
        }

        await storage.setItem<NowPlaying>('local:chorus_now_playing', {
            ...currentState,
            ...songInfo
        })
    }

    async function setCurrentTime(time: number) {
        document.dispatchEvent(
            new CustomEvent('FROM_CHORUS_EXTENSION', {
                detail: { type: 'current_time', data: { value: time } }
            })
        )
    }

    async function setLiked(liked: boolean) {
        update((state) => ({ ...state, liked }))
        const newState = get(store)

        await storage.setItem<NowPlaying>('local:chorus_now_playing', newState)
    }

    async function observe() {
        const target = document.querySelector('[data-testid="now-playing-widget"]')
        if (!target) return

        observer = new MutationObserver(handleMutation)
        observer.observe(target, { attributes: true })
        await trackObserver?.initialize()
    }

    function disconnect() {
        observer?.disconnect()
        observer = null
        currentSongId = null
    }

    storage
        .getItem<NowPlaying>('local:chorus_now_playing', { fallback: defaultNowPlaying })
        .then((savedState) => {
            if (savedState) store.set(savedState)
        })

    storage.watch('local:chorus_now_playing', (newValues) => {
        if (newValues) store.set(newValues as NowPlaying)
    })

    return {
        update,
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
