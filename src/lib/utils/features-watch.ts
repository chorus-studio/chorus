import { settingsStore } from '$lib/stores/settings'
import { effectsStore } from '$lib/stores/effects'
import { lofiStore } from '$lib/stores/lofi'

/**
 * Snips and blocks read their switch at decision time; the sound effects are
 * pushed to the page's audio chain, so a flip of that switch sends them again
 * (as "none" while paused, see effects.ts and lofi.ts). Returns the unsubscribe.
 */
export function watchFeatures(): () => void {
    let last: boolean | null = null
    return settingsStore.subscribe((settings) => {
        const on = settings.features?.effects ?? true
        if (last === null) {
            last = on
            return
        }
        if (on === last) return
        last = on
        effectsStore.dispatchEffect()
        lofiStore.dispatch()
    })
}
