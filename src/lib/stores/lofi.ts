// The lovelofi effect rack's settings: every effect's on/off and intensity,
// written whole by a quick preset and sent to the media layer as one message.
// There is no per-knob editor yet, so the store is deliberately small.
import { get, writable } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import {
    DEFAULT_EFFECT_SETTINGS,
    normalizeEffectSettings,
    type EffectSettings
} from '$lib/audio-effects/lofi/audio/effect-settings'

export const LOFI_STORE_KEY = 'local:chorus_lofi'
export const LOFI_EVENT = 'FROM_LOFI_LISTENER'

/** Every effect off. */
export const defaultLofi: EffectSettings = DEFAULT_EFFECT_SETTINGS

function createLofiStore() {
    const store = writable<EffectSettings>(defaultLofi)
    const { subscribe, set } = store
    let isUpdatingStorage = false

    function dispatch() {
        if (typeof window !== 'undefined') {
            window.postMessage({ type: LOFI_EVENT, data: get(store) }, '*')
        }
    }

    async function persist() {
        isUpdatingStorage = true
        try {
            await storage.setItem<EffectSettings>(LOFI_STORE_KEY, get(store))
        } catch (error) {
            console.error('Error saving lofi settings:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    /** Swap every setting at once: one write, one dispatch. */
    async function replace(settings: EffectSettings) {
        set(normalizeEffectSettings(settings))
        await persist()
        dispatch()
    }

    const reset = () => replace(defaultLofi)

    storage.getItem<EffectSettings>(LOFI_STORE_KEY, { fallback: defaultLofi }).then((value) => {
        set(normalizeEffectSettings(value))
    })

    storage.watch<EffectSettings>(LOFI_STORE_KEY, (value) => {
        if (!value || isUpdatingStorage) return
        set(normalizeEffectSettings(value))
    })

    return { subscribe, replace, reset, dispatch }
}

export const lofiStore = createLofiStore()
