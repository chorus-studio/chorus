import { writable } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import type { CrossfadeSettings } from '$lib/audio-effects/crossfade/types'
import { DEFAULT_CROSSFADE_SETTINGS } from '$lib/audio-effects/crossfade/types'

const STORE_KEY = 'local:crossfade_settings'

// Create writable store
export const crossfadeSettings = writable<CrossfadeSettings>(DEFAULT_CROSSFADE_SETTINGS)

// Initialize from storage and sync
storage.getItem<CrossfadeSettings>(STORE_KEY).then((settings) => {
    if (settings) {
        crossfadeSettings.set(settings)
    }
})

// Watch for external changes
storage.watch<CrossfadeSettings>(STORE_KEY, (newSettings) => {
    if (newSettings) {
        crossfadeSettings.set(newSettings)
    }
})

// Save changes to storage
crossfadeSettings.subscribe((settings) => {
    storage.setItem(STORE_KEY, settings)
})
