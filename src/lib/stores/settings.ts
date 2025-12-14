import { storage } from '@wxt-dev/storage'
import { writable, get } from 'svelte/store'
import type { ThemeName } from '$lib/utils/theming'
import { syncWithType } from '$lib/utils/store-utils'

export const SETTINGS_STORE_KEY = 'local:chorus_settings'

export type SettingsKey = 'ui' | 'views' | 'notifications' | 'theme'
export type ThemeVibrancy =
    | 'Vibrant'
    | 'DarkVibrant'
    | 'LightVibrant'
    | 'DarkMuted'
    | 'LightMuted'
    | 'Muted'
    | 'Auto'

export type SettingsState = {
    ui: {
        pip: boolean
        theme: boolean
        playlist: boolean
        popup: boolean
        volume: boolean
        progress: boolean
    }
    views: {
        snip: boolean
        seek: boolean
        speed: boolean
        'fx|eq': boolean
        ms: boolean
    }
    notifications: {
        granted: boolean
        enabled: boolean
        on_track_change: boolean
    }
    theme: {
        name: ThemeName
        vibrancy: ThemeVibrancy
    }
}

const defaultSettingsState: SettingsState = {
    ui: {
        pip: false,
        theme: false,
        popup: false,
        volume: false,
        progress: true,
        playlist: false
    },
    views: {
        speed: true,
        snip: true,
        seek: true,
        'fx|eq': true,
        ms: true
    },
    notifications: {
        granted: false,
        enabled: false,
        on_track_change: false
    },
    theme: {
        name: 'spotify' as ThemeName,
        vibrancy: 'LightVibrant' as ThemeVibrancy
    }
}

function createSettingsStore() {
    const store = writable<SettingsState>(defaultSettingsState)
    const { subscribe, update, set } = store

    // Flag to prevent infinite loops when updating storage
    let isUpdatingStorage = false

    async function updateSettings(settings: Partial<SettingsState>) {
        update((prev) => ({ ...prev, ...settings }))

        const currentState = get(store)
        isUpdatingStorage = true
        try {
            await storage.setItem<SettingsState>(SETTINGS_STORE_KEY, currentState)
        } catch (error) {
            console.error('Error updating settings storage:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    async function rescindSupport() {
        await updateSettings({
            ui: defaultSettingsState.ui,
            theme: defaultSettingsState.theme,
            views: defaultSettingsState.views
        })
    }

    storage.getItem<SettingsState>(SETTINGS_STORE_KEY).then((settings) => {
        if (!settings) return

        // Sync the stored settings with the current type definition
        const syncedSettings = syncWithType(settings, defaultSettingsState)
        set(syncedSettings)

        // Update storage with synced settings
        isUpdatingStorage = true
        storage
            .setItem<SettingsState>(SETTINGS_STORE_KEY, syncedSettings)
            .then(() => {
                isUpdatingStorage = false
            })
            .catch((error) => {
                console.error('Error updating storage:', error)
                isUpdatingStorage = false
            })
    })

    storage.watch<SettingsState>(SETTINGS_STORE_KEY, (settings) => {
        if (!settings || isUpdatingStorage) return

        const syncedSettings = syncWithType(settings, defaultSettingsState)
        set(syncedSettings)
    })

    return {
        subscribe,
        state: get(store),
        updateSettings,
        rescindSupport
    }
}

export const settingsStore = createSettingsStore()
