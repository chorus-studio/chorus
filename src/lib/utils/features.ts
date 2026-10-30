import { get } from 'svelte/store'
import { settingsStore, type FeatureKey } from '$lib/stores/settings'

/**
 * The three things Chorus does to playback, each pausable on its own from the
 * Settings tab's footer, so a track can play whole without losing the EQ, or
 * a blocked album can be heard once without turning everything off. Settings
 * are kept while a feature is paused.
 */
export const FEATURES: Array<{ key: FeatureKey; label: string; on: string; off: string }> = [
    {
        key: 'snips',
        label: 'Snips',
        on: 'Snips play · click to pause them, so tracks play whole',
        off: 'Snips paused · tracks play whole · click to resume'
    },
    {
        key: 'blocks',
        label: 'Blocks',
        on: 'Blocked tracks, artists and the rules skip · click to pause them',
        off: 'Blocks paused · everything plays · click to resume'
    },
    {
        key: 'effects',
        label: 'Effects',
        on: 'Reverb, EQ, stereo and texture apply · click to pause them, settings kept',
        off: 'Sound effects paused · click to resume'
    }
]

/** Whether a feature is active; a settings record from before the switches reads as on. */
export function featureOn(key: FeatureKey): boolean {
    return get(settingsStore).features?.[key] ?? true
}

export async function setFeature(key: FeatureKey, on: boolean): Promise<void> {
    const { features } = get(settingsStore)
    await settingsStore.updateSettings({ features: { ...features, [key]: on } })
}
