// The lovelofi effect rack's settings: every effect's on/off and intensity,
// written whole by a quick preset and knob by knob from the Texture tab. The
// media layer gets the whole settings object every time, so the two paths are
// one message apart: `replace`/`update` persist and send it, `tweak` only sends
// it (throttled, for a slider mid-drag) and `commit` persists on release.
import { get, writable } from 'svelte/store'
import { featureOn } from '$lib/utils/features'
import { storage } from '@wxt-dev/storage'
import {
    DEFAULT_EFFECT_SETTINGS,
    normalizeEffectSettings,
    type EffectSettings,
    type EqualizerSettings
} from '$lib/audio-effects/lofi/audio/effect-settings'
import type { ReverbProfile } from '$lib/audio-effects/lofi/audio/effects/reverb'

export const LOFI_STORE_KEY = 'local:chorus_lofi'
export const LOFI_EVENT = 'FROM_LOFI_LISTENER'
/** A changed intensity while a slider is dragged: applied to the live rack, never persisted. */
export const LOFI_TWEAK_EVENT = 'FROM_LOFI_TWEAK_LISTENER'

/** The effects with a switch and an intensity; the five-band EQ is handled on its own. */
export type LofiEffectKey = Exclude<keyof EffectSettings, 'equalizer'>
type EffectPatch = { enabled?: boolean; intensity?: number; profile?: ReverbProfile }

/** Every effect off. */
export const defaultLofi: EffectSettings = DEFAULT_EFFECT_SETTINGS

function createLofiStore() {
    const store = writable<EffectSettings>(defaultLofi)
    const { subscribe, set, update: updateStore } = store
    let isUpdatingStorage = false
    let tweakTimer: ReturnType<typeof setTimeout> | null = null

    function post(type: string) {
        if (typeof window !== 'undefined') {
            // While sound effects are paused the rack hears every effect off.
            const data = featureOn('effects') ? get(store) : defaultLofi
            window.postMessage({ type, data }, '*')
        }
    }

    const dispatch = () => post(LOFI_EVENT)

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

    function patch(key: LofiEffectKey, values: EffectPatch) {
        updateStore((settings) =>
            normalizeEffectSettings({ ...settings, [key]: { ...settings[key], ...values } })
        )
    }

    /** One effect's switch, intensity or (for reverb) profile: persisted and applied. */
    async function update(key: LofiEffectKey, values: EffectPatch) {
        patch(key, values)
        await persist()
        dispatch()
    }

    /** The rack's own five-band EQ, on or off, or with new bands. */
    async function setEqualizer(values: Partial<EqualizerSettings>) {
        updateStore((settings) =>
            normalizeEffectSettings({
                ...settings,
                equalizer: { ...(settings.equalizer ?? defaultLofi.equalizer!), ...values }
            })
        )
        await persist()
        dispatch()
    }

    /**
     * An intensity mid-drag. The rack hears it within a frame or two; storage
     * waits for `commit`, so a drag is one write rather than hundreds.
     */
    function tweak(key: LofiEffectKey, intensity: number) {
        patch(key, { intensity })
        if (tweakTimer) return
        tweakTimer = setTimeout(() => {
            tweakTimer = null
            post(LOFI_TWEAK_EVENT)
        }, 30)
    }

    /** The drag ended: send the final value if one is pending, then persist. */
    async function commit() {
        if (tweakTimer) {
            clearTimeout(tweakTimer)
            tweakTimer = null
            post(LOFI_TWEAK_EVENT)
        }
        await persist()
    }

    storage.getItem<EffectSettings>(LOFI_STORE_KEY, { fallback: defaultLofi }).then((value) => {
        set(normalizeEffectSettings(value))
    })

    storage.watch<EffectSettings>(LOFI_STORE_KEY, (value) => {
        if (!value || isUpdatingStorage) return
        set(normalizeEffectSettings(value))
    })

    return { subscribe, replace, reset, dispatch, update, setEqualizer, tweak, commit }
}

export const lofiStore = createLofiStore()
