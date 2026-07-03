import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import type { EQBands } from '$lib/stores/eq-bands'

const USER_EQ_PRESETS_KEY = 'local:chorus_user_eq_presets'

// User-saved EQ configs: name -> 10 band gains (dB). Saved/loaded from the EQ
// config editor; applying one goes through eqBandsStore (the live value channel),
// never the engine's name-keyed preset lookup — so user names can never collide
// with or crash the built-in preset resolution.
export type UserEQPresets = Record<string, EQBands>

function createUserEQPresetsStore() {
    const store = writable<UserEQPresets>({})
    const { subscribe, set } = store
    let isUpdatingStorage = false

    async function persist() {
        isUpdatingStorage = true
        try {
            await storage.setItem<UserEQPresets>(USER_EQ_PRESETS_KEY, get(store))
        } catch (error) {
            console.error('Error saving user EQ presets:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    async function save(name: string, bands: EQBands) {
        set({ ...get(store), [name]: [...bands] })
        await persist()
    }

    async function remove(name: string) {
        const next = { ...get(store) }
        delete next[name]
        set(next)
        await persist()
    }

    storage.getItem<UserEQPresets>(USER_EQ_PRESETS_KEY, { fallback: {} }).then((value) => {
        if (value) set(value)
    })

    storage.watch<UserEQPresets>(USER_EQ_PRESETS_KEY, (value) => {
        if (!value || isUpdatingStorage) return
        set(value)
    })

    return { subscribe, save, remove }
}

export const userEQPresetsStore = createUserEQPresetsStore()
