import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'

export type Media = {
    play: boolean
    repeat: 'none' | 'default' | 'one'
    shuffle: boolean
    loop: boolean
    rewind: number
    forward: number
    saved: boolean
}

function createMediaStore() {
    const store = writable<Media>({
        play: false,
        repeat: 'none',
        shuffle: false,
        loop: false,
        rewind: 10,
        forward: 10,
        saved: false
    })

    const { subscribe, set } = store

    storage.getItem<Media>('local:media').then((value) => {
        if (value) set(value)
    })

    storage.watch<Media>('local:media', (value) => {
        if (value) set(value)
    })

    async function updateMedia(data: { key: string; data: string; type?: string }[]) {
        const currentState = get(store)

        data.filter(({ data }) => data).forEach(({ key, data, type }) => {
            switch (key) {
                case 'loop':
                    currentState.loop = data.includes('remove')
                    break
                case 'repeat': {
                    if (type == 'state') {
                        currentState.repeat = data?.includes('disable')
                            ? 'none'
                            : data?.includes('one')
                              ? 'one'
                              : 'default'
                    } else {
                        currentState.repeat = data?.includes('one')
                            ? 'default'
                            : data?.includes('disable')
                              ? 'one'
                              : 'none'
                    }
                    break
                }
                case 'shuffle':
                    currentState.shuffle =
                        type == 'state' ? data?.includes('disable') : data?.includes('enable')
                    break
                case 'save/unsave':
                    currentState.saved = data?.includes('remove')
                    break
                case 'seek-rewind':
                    currentState.rewind = Number(data?.split(' ')?.at(-1) ?? 10)
                    break
                case 'seek-forward':
                    currentState.forward = Number(data?.split(' ')?.at(-1) ?? 10)
                    break
                case 'play/pause':
                    currentState.play = type == 'state' ? data == 'pause' : data?.includes('pause')
                    break
            }
        })

        set(currentState)
        await storage.setItem('local:media', currentState)
    }

    async function updateKey(data: { key: string; data: any; type?: string }[]) {
        await updateMedia(data)
    }

    return {
        subscribe,
        set,
        updateMedia,
        updateKey
    }
}

export const mediaStore = createMediaStore()
