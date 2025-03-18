import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'

export type AudioEffect = {
    equalizer: string
    reverb: string
}

const defaultAudioEffect: AudioEffect = {
    equalizer: 'none',
    reverb: 'none'
}

function createAudioEffectsStore() {
    const store = writable<AudioEffect>(defaultAudioEffect)
    const { subscribe, set, update } = store

    function dispatchEffect() {
        window.postMessage({ type: 'FROM_EFFECTS_LISTENER', data: get(effectsStore) }, '*')
    }

    async function updateEffect({ key, value }: { key: keyof AudioEffect; value: string }) {
        update((state) => ({ ...state, [key]: value }))
        const newState = get(store)
        await storage.setItem<AudioEffect>('local:chorus_audio_effects', newState)
        dispatchEffect()
    }

    async function reset(key: keyof AudioEffect) {
        await updateEffect({ key, value: 'none' })
    }

    storage
        .getItem<AudioEffect>('local:chorus_audio_effects', {
            fallback: defaultAudioEffect
        })
        .then((value) => {
            if (value) set(value)
        })

    storage.setItem<AudioEffect>('local:chorus_audio_effects', defaultAudioEffect)

    return {
        set,
        reset,
        subscribe,
        updateEffect,
        dispatchEffect
    }
}

export const effectsStore = createAudioEffectsStore()
