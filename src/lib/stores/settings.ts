import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'

export type ThemeName = 'none' | 'dynamic' | 'static'
export type ThemeMode = 'light' | 'dark'
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
        playlist: boolean
        volume: boolean
        progress: boolean
    }
    views: {
        fx: boolean
        eq: boolean
        snip: boolean
        seek: boolean
        speed: boolean
    }
    notifications: {
        granted: boolean
        enabled: boolean
        on_track_change: boolean
    }
    theme: {
        name: ThemeName
        mode: ThemeMode
        vibrancy: ThemeVibrancy
    }
}

const defaultSettingsState: SettingsState = {
    ui: {
        pip: false,
        volume: false,
        progress: false,
        playlist: false
    },
    views: {
        fx: true,
        eq: true,
        speed: true,
        snip: true,
        seek: true
    },
    notifications: {
        granted: false,
        enabled: false,
        on_track_change: false
    },
    theme: {
        name: 'none' as ThemeName,
        mode: 'dark' as ThemeMode,
        vibrancy: 'LightVibrant' as ThemeVibrancy
    }
}

function createSettingsStore() {
    const store = writable<SettingsState>(defaultSettingsState)
    const { subscribe, update, set } = store

    async function updateSettings(settings: Partial<SettingsState>) {
        update((prev) => ({ ...prev, ...settings }))
        await storage.setItem<SettingsState>('local:chorus_settings', get(store))
    }

    async function rescindSupport() {
        await updateSettings({
            ui: defaultSettingsState.ui,
            theme: defaultSettingsState.theme,
            views: defaultSettingsState.views
        })
    }

    storage.getItem<SettingsState>('local:chorus_settings').then((settings) => {
        if (settings) set(settings)
    })

    storage.watch<SettingsState>('local:chorus_settings', (settings) => {
        if (settings) set(settings)
    })

    return {
        subscribe,
        state: get(store),
        updateSettings,
        rescindSupport
    }
}

export const settingsStore = createSettingsStore()
