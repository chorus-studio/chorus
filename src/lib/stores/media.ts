import { storage } from '@wxt-dev/storage'
import { writable, get } from 'svelte/store'

export type Media = {
    active: boolean
    dj: boolean
    saved: boolean
    playing: boolean
    shuffle: boolean
    repeat: 'none' | 'default' | 'one'
}

const defaultMedia: Media = {
    active: false,
    dj: false,
    saved: false,
    playing: false,
    repeat: 'none',
    shuffle: false
}

function createMediaStore() {
    const store = writable<Media>(defaultMedia)
    const { subscribe, set, update } = store

    let observer: MutationObserver | null = null

    async function observe() {
        const target = document.querySelector('[data-testid="now-playing-bar"]')
        if (!target) return

        observer = new MutationObserver(handleMutations)
        observer.observe(target, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['aria-label']
        })
        await updateState()
    }

    async function handleMutations(mutations: MutationRecord[]) {
        for (const mutation of mutations) {
            const target = mutation.target as HTMLElement
            const isHeart = target.id === 'chorus-ui'
            const isSpotifyControls =
                mutation.type == 'attributes' &&
                target.localName === 'button' &&
                mutation.attributeName === 'aria-label'

            if (isHeart || isSpotifyControls) await updateState()
        }
    }

    function updateStateByKeys({ key, target }: { key: string; target: HTMLElement }) {
        const label = target.getAttribute('aria-label')
        if (!label) return
        else if (key === 'playing') {
            update((state) => ({ ...state, [key]: label == 'Pause' }))
        } else if (key === 'saved') {
            update((state) => ({ ...state, [key]: label.includes('Remove') }))
        } else if (key === 'repeat') {
            update((state) => ({
                ...state,
                [key]: label.includes('Disable')
                    ? 'one'
                    : label.includes('one')
                      ? 'default'
                      : 'none'
            }))
        } else if (key === 'shuffle') {
            update((state) => ({ ...state, [key]: label.includes('Disable') }))
        }
    }

    async function updateState() {
        const targetMap = {
            '#chorus-ui > button[role="heart"]': 'saved',
            '[data-testid="control-button-npv"]': 'dj',
            '[data-testid="control-button-playpause"]': 'playing',
            '[data-testid="control-button-repeat"]': 'repeat',
            '[data-testid="control-button-shuffle"]': 'shuffle'
        }

        for (const key in targetMap) {
            const target = document.querySelector(key) as HTMLElement
            if (!target) continue

            if (key == '[data-testid="control-button-npv"]') {
                const newTarget = target.previousElementSibling as HTMLElement
                update((state) => ({ ...state, dj: !!newTarget }))
            } else {
                updateStateByKeys({ key: targetMap[key as keyof typeof targetMap], target })
            }
        }
        await storage.setItem('local:chorus_media', get(store))
    }

    async function setActive(active: boolean) {
        update((state) => ({ ...state, active }))
        await storage.setItem('local:chorus_media', get(store))
    }

    storage.getItem<Media>('local:chorus_media', { fallback: defaultMedia }).then((value) => {
        if (value) set(value)
    })

    storage.watch<Media>('local:chorus_media', (value) => {
        if (value) set(value)
    })

    function disconnect() {
        observer?.disconnect()
        observer = null
    }

    return {
        subscribe,
        set,
        observe,
        updateState,
        disconnect,
        setActive
    }
}

export const mediaStore = createMediaStore()
