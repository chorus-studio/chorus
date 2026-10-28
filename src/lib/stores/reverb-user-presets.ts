import { writable, get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import { migrateReverbMix, REVERB_MIX_VERSION, type ReverbParams } from '$lib/stores/reverb-params'

const USER_REVERB_PRESETS_KEY = 'local:chorus_user_reverb_presets'
const USER_REVERB_PRESETS_VERSION_KEY = 'local:chorus_user_reverb_presets_version'

// User-saved reverb configs: name -> full reverb param map (both worklets'
// names; see ReverbParams). Saved/loaded from
// the reverb config editor; applying one goes through reverbParamsStore (the live
// value channel), never the engine's name-keyed preset lookup — so user names can
// never collide with or crash the built-in preset resolution.
export type UserReverbPresets = Record<string, ReverbParams>

function createUserReverbPresetsStore() {
    const store = writable<UserReverbPresets>({})
    const { subscribe, set } = store
    let isUpdatingStorage = false

    async function persist() {
        isUpdatingStorage = true
        try {
            await storage.setItem<UserReverbPresets>(USER_REVERB_PRESETS_KEY, get(store))
        } catch (error) {
            console.error('Error saving user reverb presets:', error)
        } finally {
            isUpdatingStorage = false
        }
    }

    async function save(name: string, params: ReverbParams) {
        set({ ...get(store), [name]: { ...params } })
        await persist()
    }

    async function remove(name: string) {
        const next = { ...get(store) }
        delete next[name]
        set(next)
        await persist()
    }

    Promise.all([
        storage.getItem<UserReverbPresets>(USER_REVERB_PRESETS_KEY),
        storage.getItem<number>(USER_REVERB_PRESETS_VERSION_KEY)
    ]).then(async ([stored, version]) => {
        const outdated = (version ?? 1) < REVERB_MIX_VERSION
        if (outdated) await storage.setItem(USER_REVERB_PRESETS_VERSION_KEY, REVERB_MIX_VERSION)
        if (!stored) return
        if (!outdated) return set(stored)
        // Configs saved against the old mix keep their balance (see migrateReverbMix).
        set(Object.fromEntries(Object.entries(stored).map(([n, p]) => [n, migrateReverbMix(p)])))
        await persist()
    })

    storage.watch<UserReverbPresets>(USER_REVERB_PRESETS_KEY, (value) => {
        if (!value || isUpdatingStorage) return
        set(value)
    })

    return { subscribe, save, remove }
}

export const userReverbPresetsStore = createUserReverbPresetsStore()
