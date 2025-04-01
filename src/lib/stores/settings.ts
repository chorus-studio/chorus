import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'

export type SettingsState = {
    ui: {
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
}

const defaultSettingsState: SettingsState = {
    ui: {
        volume: true,
        progress: true,
        playlist: false
    },
    views: {
        fx: true,
        eq: true,
        speed: true,
        snip: false,
        seek: true
    }
}

function createSettingsStore() {
    const store = writable<SettingsState>(defaultSettingsState)
    const { subscribe, update, set } = store

    async function updateSettings(settings: Partial<SettingsState>) {
        update((prev) => ({ ...prev, ...settings }))
        await storage.setItem<SettingsState>('local:chorus_settings', get(store))
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
        updateSettings
    }
}

export const settingsStore = createSettingsStore()
