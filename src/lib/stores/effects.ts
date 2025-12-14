import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import { syncWithType } from '$lib/utils/store-utils'

const AUDIO_EFFECTS_STORE_KEY = 'local:chorus_audio_effects'

export type AudioEffect = {
    equalizer: string
    reverb: string
    msProcessor: string
}

export const defaultAudioEffect: AudioEffect = {
    equalizer: 'none',
    reverb: 'none',
    msProcessor: 'none'
}

function createAudioEffectsStore() {
    const store = writable<AudioEffect>(defaultAudioEffect)
    const { subscribe, set, update } = store
    let isUpdatingStorage = false

    function dispatchEffect() {
        const effectData = get(effectsStore)
        console.log('effectsStore.dispatchEffect:', effectData)
        window.postMessage({ type: 'FROM_EFFECTS_LISTENER', data: effectData }, '*')
    }

    async function updateEffect({ key, value }: { key: keyof AudioEffect; value: string }) {
        update((state) => ({ ...state, [key]: value }))
        const newState = get(store)
        isUpdatingStorage = true
        try {
            await storage.setItem<AudioEffect>(AUDIO_EFFECTS_STORE_KEY, newState)
        } catch (error) {
            console.error('Error updating effect in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
        dispatchEffect()
    }

    function isDefault() {
        return get(store) === defaultAudioEffect
    }

    async function reset() {
        set(defaultAudioEffect)
        isUpdatingStorage = true
        try {
            await storage.setItem<AudioEffect>(AUDIO_EFFECTS_STORE_KEY, defaultAudioEffect)
        } catch (error) {
            console.error('Error resetting effects in storage:', error)
        } finally {
            isUpdatingStorage = false
        }
        dispatchEffect()
    }

    storage
        .getItem<AudioEffect>(AUDIO_EFFECTS_STORE_KEY, {
            fallback: defaultAudioEffect
        })
        .then((value) => {
            if (!value) return

            // Sync the stored effects with the current type definition
            const syncedValue = syncWithType(value, defaultAudioEffect)
            set(syncedValue)

            // Update storage with synced value
            storage.setItem<AudioEffect>(AUDIO_EFFECTS_STORE_KEY, syncedValue).catch((error) => {
                console.error('Error updating storage:', error)
                isUpdatingStorage = false
            })
        })

    storage.watch<AudioEffect>(AUDIO_EFFECTS_STORE_KEY, (value) => {
        if (!value) return

        const syncedValue = syncWithType(value, defaultAudioEffect)
        set(syncedValue)
    })

    // Listen for requests to reapply effects (e.g., after media element recreation)
    window.addEventListener('message', (event) => {
        if (event.source !== window) return
        if (event.data?.type === 'REQUEST_EFFECT_REAPPLY') {
            console.log('Reapplying stored effects after media recreation')
            dispatchEffect()
        }
    })

    return {
        set,
        reset,
        isDefault,
        subscribe,
        updateEffect,
        dispatchEffect
    }
}

export const effectsStore = createAudioEffectsStore()
