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

    async function updateEffect({ key, value }: { key: keyof AudioEffect; value: string }) {
        update((state) => ({ ...state, [key]: value }))
        const newState = get(store)
        await storage.setItem<AudioEffect>('local:chorus_audio_effects', newState)
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
        subscribe,
        updateEffect
    }
}

export const effectsStore = createAudioEffectsStore()
