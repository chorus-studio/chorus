// Applying a quick preset means writing the ordinary stores (the "All tracks"
// playback default and the three effect slots) and letting them dispatch, so the
// Speed, Reverb, EQ and Stereo tabs all show what is really playing and the
// active card is derived from the same values. There is no separate "active
// preset" state to drift out of step.
import { get, writable } from 'svelte/store'
import { playbackStore, effectivePlayback } from '$lib/stores/playback'
import { effectsStore } from '$lib/stores/effects'
import {
    NORMAL_VALUES,
    QUICK_PRESET_EVENT,
    sameValues,
    type PresetValues,
    type QuickPresetMessage
} from '$lib/audio-effects/quick-presets'

/** The preset most recently applied on this page, so a tweaked state can say what it began as. */
export const lastApplied = writable<string | null>(null)

export function currentValues(): PresetValues {
    return { playback: effectivePlayback(get(playbackStore)), effect: get(effectsStore) }
}

export async function applyPresetValues(values: PresetValues, name: string | null = null) {
    // The preset becomes the all-tracks speed. A track with its own saved speed
    // keeps it on its next play, exactly as the Speed tab's "This track" scope
    // already works; right now the preset is what plays.
    await playbackStore.updatePlayback({ default: values.playback, is_default: true })
    await effectsStore.replace(values.effect)
    lastApplied.set(name)
}

export const applyNormal = () => applyPresetValues(NORMAL_VALUES, null)

/** Apply the preset, or go back to Normal when it is already what's playing. */
export async function togglePreset(preset: PresetValues & { name: string }) {
    if (sameValues(currentValues(), preset)) return applyNormal()
    return applyPresetValues(preset, preset.name)
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
        void applyPresetValues(message.values, message.name ?? null)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
}
