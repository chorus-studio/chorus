// Applying a quick preset means writing the ordinary stores (the "All tracks"
// playback default, the three Chorus effect slots and the lofi rack) and
// letting them dispatch, so the Speed, Reverb, EQ and Stereo tabs all show what
// is really playing and the active card is derived from the same values. There
// is no separate "active preset" state to drift out of step.
import { derived, get, writable } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import { playbackStore, effectivePlayback } from '$lib/stores/playback'
import { effectsStore } from '$lib/stores/effects'
import { lofiStore } from '$lib/stores/lofi'
import {
    configStore,
    createAudioPreset,
    MAX_AUDIO_PRESETS,
    type AudioPreset
} from '$lib/stores/config'
import {
    NORMAL_VALUES,
    QUICK_PRESETS,
    QUICK_PRESET_EVENT,
    isNormal,
    matchPreset,
    quickPresetById,
    sameValues,
    type PresetValues,
    type QuickPreset,
    type QuickPresetMessage
} from '$lib/audio-effects/quick-presets'

const ORIGIN_KEY = 'local:chorus_preset_origin'

/**
 * The id of the preset most recently applied (a built-in's slug or a Mine
 * slot's uuid), so a tweaked state can say what it began as and offer the way
 * back. Kept in storage so a reload does not turn "tweaked from X" into
 * "Custom"; null once Normal is applied.
 */
export const lastApplied = writable<string | null>(null)
let appliedThisSession = false
void storage.getItem<string>(ORIGIN_KEY).then((id) => {
    if (!appliedThisSession && id) lastApplied.set(id)
})

export function currentValues(): PresetValues {
    return {
        playback: effectivePlayback(get(playbackStore)),
        effect: get(effectsStore),
        lofi: get(lofiStore)
    }
}

export async function applyPresetValues(values: PresetValues, origin: string | null = null) {
    appliedThisSession = true
    // The preset becomes the all-tracks speed. A track with its own saved speed
    // keeps it on its next play, exactly as the Speed tab's "This track" scope
    // already works; right now the preset is what plays.
    await playbackStore.updatePlayback({ default: values.playback, is_default: true })
    await effectsStore.replace(values.effect)
    await lofiStore.replace(values.lofi ?? NORMAL_VALUES.lofi)
    lastApplied.set(origin)
    await (origin ? storage.setItem(ORIGIN_KEY, origin) : storage.removeItem(ORIGIN_KEY))
}

export const applyNormal = () => applyPresetValues(NORMAL_VALUES, null)

/** Apply the preset, or go back to Normal when it is already what's playing. */
export async function togglePreset(preset: PresetValues & { id: string }) {
    if (sameValues(currentValues(), preset)) return applyNormal()
    return applyPresetValues(preset, preset.id)
}

/** The preset an id names: a built-in or one of the user's own, or null. */
export function presetById(id: string, mine: AudioPreset[]): QuickPreset | AudioPreset | null {
    return mine.find((p) => p.id === id) ?? quickPresetById(id) ?? null
}

export type TweakOrigin = { preset: QuickPreset | AudioPreset; mine: boolean }

/**
 * What the current sound was tweaked from: the preset last applied, while what
 * is playing no longer matches it (or any other preset) and is not Normal.
 * Null otherwise, and null once that Mine slot has been removed.
 */
export const tweakOrigin = derived(
    [lastApplied, playbackStore, effectsStore, lofiStore, configStore],
    ([id, playback, effect, lofi, config]): TweakOrigin | null => {
        if (!id) return null
        const values: PresetValues = { playback: effectivePlayback(playback), effect, lofi }
        const mine = config.audio_presets
        if (isNormal(values) || matchPreset(values, [...QUICK_PRESETS, ...mine])) return null
        const preset = presetById(id, mine)
        return preset ? { preset, mine: mine.some((p) => p.id === id) } : null
    }
)

/** Save values as the next Mine slot and return its number, or null when all five are used. */
export async function addPresetSlot(values: PresetValues, name: string): Promise<number | null> {
    const mine = get(configStore).audio_presets
    if (mine.length >= MAX_AUDIO_PRESETS) return null
    await configStore.updateConfig({ audio_presets: [...mine, createAudioPreset(values, name)] })
    return mine.length + 1
}

/** Overwrite a Mine slot's values in place; its name, position and shortcut stay. */
export async function updatePresetSlot(id: string, values: PresetValues) {
    const mine = get(configStore).audio_presets
    await configStore.updateConfig({
        audio_presets: mine.map((p) =>
            p.id === id ? { ...createAudioPreset(values, p.name), id } : p
        )
    })
}

/** Remove the first Mine slot that sounds like these values; returns it, or null. */
export async function removeMatchingSlot(values: PresetValues): Promise<AudioPreset | null> {
    const mine = get(configStore).audio_presets
    const slot = mine.find((p) => sameValues(p, values))
    if (!slot) return null
    await configStore.updateConfig({ audio_presets: mine.filter((p) => p.id !== slot.id) })
    return slot
}

/**
 * Keyboard commands are handled in the background, which can only reach this
 * page through a window message; apply whatever it sends. Returns the cleanup.
 */
export function listenForQuickPresetCommands(): () => void {
    const handler = (event: MessageEvent) => {
        if (event.source !== window || event.data?.type !== QUICK_PRESET_EVENT) return
        const message = event.data.data as Partial<QuickPresetMessage> | undefined
        if (!message?.values?.playback || !message.values.effect) return
        void applyPresetValues(message.values, message.id ?? null)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
}
