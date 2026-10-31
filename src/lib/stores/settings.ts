import { storage } from '@wxt-dev/storage'
import { SHOW_THROUGH_DEFAULT } from '$lib/types/look'
import { writable, get } from 'svelte/store'
import type { ThemeName } from '$lib/utils/theming'
import { syncWithType } from '$lib/utils/store-utils'

export const SETTINGS_STORE_KEY = 'local:chorus_settings'

export type SettingsKey = 'ui' | 'views' | 'notifications' | 'theme' | 'features'
/** The pausable features (utils/features): true while active. */
export type FeatureKey = 'snips' | 'blocks' | 'effects'
/** Dark or light rack (and page, while a theme is applied); `system` follows the OS. */
export type Appearance = 'dark' | 'light' | 'system'
/** Where the toolbar popup takes its colours from (the PiP player always follows the theme). */
export type PopupColours = 'album' | 'theme'
/** Glass material tweaks: panel opacity (0..1), backdrop blur (px), refraction strength (0 = off). */
export type GlassSettings = {
    opacity: number
    blur: number
    refraction: number
}

export type SettingsState = {
    ui: {
        pip: boolean
        theme: boolean
        glass: boolean
        playlist: boolean
        volume: boolean
        progress: boolean
    }
    views: {
        presets: boolean
        snip: boolean
        seek: boolean
        speed: boolean
        fx: boolean
        eq: boolean
        ms: boolean
        sleep: boolean
    }
    notifications: {
        granted: boolean
        enabled: boolean
        on_track_change: boolean
    }
    theme: {
        /** The built-in palette in force when no look is. */
        name: ThemeName
        /** A saved look's id (types/look.ts), built-in or the person's own; null for a bare palette. */
        look: string | null
        /** 0–100 %: how much of a backdrop shows through the panels, for looks without their own value. */
        showThrough: number
        appearance: Appearance
        popup: PopupColours
        glass: GlassSettings
    }
    features: Record<FeatureKey, boolean>
}

export const DEFAULT_GLASS: GlassSettings = { opacity: 0.5, blur: 40, refraction: 22 }

const defaultSettingsState: SettingsState = {
    ui: {
        pip: false,
        theme: false,
        glass: false,
        volume: false,
        progress: true,
        playlist: false
    },
    views: {
        presets: true,
        speed: true,
        snip: true,
        seek: true,
        fx: true,
        eq: true,
        ms: true,
        sleep: true
    },
    notifications: {
        granted: false,
        enabled: false,
        on_track_change: false
    },
    theme: {
        name: 'spotify' as ThemeName,
        look: null,
        showThrough: SHOW_THROUGH_DEFAULT,
        appearance: 'dark',
        popup: 'album',
        glass: DEFAULT_GLASS
    },
    features: { snips: true, blocks: true, effects: true }
}

/** `ui.frosted` became `ui.glass`; carry a saved "on" across so the panels don't go solid on update. */
function migrate(settings: SettingsState): SettingsState {
    const ui = settings.ui as SettingsState['ui'] & { frosted?: boolean }
    if (ui && ui.frosted && ui.glass === undefined) {
        return { ...settings, ui: { ...ui, glass: true } }
    }
    return settings
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
        const syncedSettings = syncWithType(migrate(settings), defaultSettingsState)
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
