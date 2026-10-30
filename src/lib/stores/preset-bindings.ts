import { get, writable } from 'svelte/store'
import { storage } from '@wxt-dev/storage'

/**
 * Presets that follow an artist: while one of their tracks plays, the bound
 * preset is applied; when the next track is by someone else, what played
 * before comes back. Keys are "artist:<spotify id>".
 */
export const PRESET_BINDINGS_KEY = 'local:chorus_preset_bindings'

export type PresetBinding = {
    key: string
    /** The artist's name, for the lists. */
    name: string
    /** A built-in preset's slug or a Mine slot's id. */
    preset_id: string
    /** The preset's name when bound, shown if the preset is gone. */
    preset_name: string
}

export type PresetBindingsState = { bindings: PresetBinding[] }

const empty: PresetBindingsState = { bindings: [] }

function createPresetBindingsStore() {
    const store = writable<PresetBindingsState>(empty)
    let isUpdatingStorage = false

    async function persist(bindings: PresetBinding[]) {
        store.set({ bindings })
        isUpdatingStorage = true
        try {
            await storage.setItem<PresetBindingsState>(PRESET_BINDINGS_KEY, { bindings })
        } catch (error) {
            console.error('Error saving preset bindings:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    /** Bind (or rebind) a key to a preset. */
    const bind = (binding: PresetBinding) =>
        persist([...get(store).bindings.filter((b) => b.key !== binding.key), binding])

    const unbind = (key: string) => persist(get(store).bindings.filter((b) => b.key !== key))

    /** The binding for the first of these keys that has one. */
    const bindingFor = (keys: string[]): PresetBinding | null => {
        const { bindings } = get(store)
        for (const key of keys) {
            const found = bindings.find((b) => b.key === key)
            if (found) return found
        }
        return null
    }

    storage.getItem<PresetBindingsState>(PRESET_BINDINGS_KEY).then((saved) => {
        if (saved?.bindings) store.set({ bindings: saved.bindings.filter(Boolean) })
    })

    storage.watch<PresetBindingsState>(PRESET_BINDINGS_KEY, (saved) => {
        if (isUpdatingStorage) return
        store.set(saved?.bindings ? { bindings: saved.bindings } : empty)
    })

    return { subscribe: store.subscribe, bind, unbind, bindingFor }
}

export const presetBindingsStore = createPresetBindingsStore()
