import { storage } from '@wxt-dev/storage'
import { writable, get } from 'svelte/store'
import { syncWithType } from '$lib/utils/store-utils'

const MEDIA_STORE_KEY = 'local:chorus_media'

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
    let isUpdatingStorage = false

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
        isUpdatingStorage = true
        try {
            await storage.setItem(MEDIA_STORE_KEY, get(store))
        } catch (error) {
            console.error('Error updating media state in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    async function setActive(active: boolean) {
        update((state) => ({ ...state, active }))
        isUpdatingStorage = true
        try {
            await storage.setItem(MEDIA_STORE_KEY, get(store))
        } catch (error) {
            console.error('Error setting active state in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    storage.getItem<Media>(MEDIA_STORE_KEY, { fallback: defaultMedia }).then((value) => {
        if (!value) return

        // Sync the stored media with the current type definition
        const syncedValue = syncWithType(value, defaultMedia)
        set(syncedValue)

        // Update storage with synced value
        isUpdatingStorage = true
        storage
            .setItem<Media>(MEDIA_STORE_KEY, syncedValue)
            .then(() => {
                isUpdatingStorage = false
            })
            .catch(() => {
                isUpdatingStorage = false
            })
    })

    storage.watch<Media>(MEDIA_STORE_KEY, (value) => {
        if (!value || isUpdatingStorage) return

        const syncedValue = syncWithType(value, defaultMedia)
        set(syncedValue)
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
