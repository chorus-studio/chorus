import { get, writable } from 'svelte/store'
import { currentSongInfo } from '$lib/utils/song'
import { playback } from '$lib/utils/playback'
import { setState } from '$lib/utils/state'
import { storage } from '@wxt-dev/storage'

type NowPlaying = {
    current: number
    duration: number
    loop: boolean
    id: string | null
    cover: string | null
    title: string | null
    artist: string | null
    textColour: string | null
    backgroundColour: string | null
}

function createNowPlayingStore() {
    let observer: MutationObserver | null = null
    let currentSongId: string | null = null

    const store = writable<NowPlaying>({
        id: null,
        cover: null,
        title: null,
        artist: null,
        duration: 0,
        current: 0,
        loop: false,
        textColour: '#ffffff',
        backgroundColour: '#000000'
    })

    const { subscribe, set } = store

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

    function handleMutation(mutations: MutationRecord[]) {
        for (const mutation of mutations) {
            if (!isAnchor(mutation)) return
            if (!songChanged()) return

            const songInfo = currentSongInfo()
            const { id } = songInfo
            if (!id) return

            if (id) {
                currentSongId = id
                updateNowPlaying()
            }
        }
    }

    async function getSongInfo() {
        const songInfo = currentSongInfo()
        const { id = null, cover = null } = songInfo
        const [title, artist] = id?.split(' by ') ?? []
        const { duration = 0, position: current = 0, loop = false } = playback.data()

        return { id, cover, title, artist, duration, current, loop }
    }

    async function updateNowPlaying() {
        const songInfo = await getSongInfo()

        await setState({ key: 'now-playing', values: songInfo })
    }

    function observe() {
        const target = document.querySelector('[data-testid="now-playing-widget"]')
        if (!target) return

        observer = new MutationObserver(handleMutation)
        observer.observe(target, { attributes: true })
    }

    function disconnect() {
        observer?.disconnect()
        observer = null
        currentSongId = null
    }

    storage.getItem<NowPlaying>('local:now-playing').then((savedState) => {
        if (savedState) {
            store.set(savedState)
        }
    })

    storage.watch('local:now-playing', async (newValues) => {
        if (!newValues) return
        store.set(newValues as NowPlaying)
    })

    return {
        subscribe,
        set,
        observe: () => {
            updateNowPlaying()
            observe()
        },
        disconnect
    }
}

export const nowPlaying = createNowPlayingStore()
