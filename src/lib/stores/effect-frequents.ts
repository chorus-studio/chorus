// Pinned and recently used reverb / EQ presets, for the chip row under each
// tab's pickers: the same idea as the Speed tab's frequent values. Whatever
// becomes the active preset, from the picker, a chip, a quick preset or a
// keyboard command, lands in the row; pinned chips survive new arrivals.
import { get, writable } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import { effectsStore } from '$lib/stores/effects'
import { resolveReverbPreset } from '$lib/audio-effects/reverb/presets'

export type EffectKind = 'reverb' | 'equalizer'
export type EffectFrequent = { value: string; pinned: boolean }
export type EffectFrequents = Record<EffectKind, EffectFrequent[]>

const KEY = 'local:chorus_effect_frequents'
/** Two rows of chips at most; past this the oldest unpinned one makes room. */
export const EFFECT_FREQUENTS_MAX = 8

const unpinned = (value: string): EffectFrequent => ({ value, pinned: false })

export const defaultEffectFrequents: EffectFrequents = {
    reverb: ['studio', 'hall', 'cathedral', 'lofi'].map(unpinned),
    equalizer: ['Bass booster', 'Vocal booster', 'Loudness', 'Rock'].map(unpinned)
}

/**
 * A list with the value in it, the way the Speed tab keeps its chips: left
 * alone if already there, appended while there is room, else written over
 * the oldest unpinned chip (none free: left alone). Positions never shuffle.
 */
export function withFrequent(list: EffectFrequent[], value: string): EffectFrequent[] {
    if (list.some((f) => f.value === value)) return list
    if (list.length < EFFECT_FREQUENTS_MAX) return [...list, unpinned(value)]
    const index = list.findIndex((f) => !f.pinned)
    if (index === -1) return list
    return list.map((f, i) => (i === index ? unpinned(value) : f))
}

function createEffectFrequentsStore() {
    const store = writable<EffectFrequents>(defaultEffectFrequents)

    async function persist(next: EffectFrequents) {
        store.set(next)
        try {
            await storage.setItem<EffectFrequents>(KEY, next)
        } catch (error) {
            console.error('Error saving effect frequents:', error)
        }
    }

    async function touch(kind: EffectKind, value: string) {
        if (!value || value === 'none') return
        const state = get(store)
        const next = withFrequent(state[kind], value)
        if (next !== state[kind]) await persist({ ...state, [kind]: next })
    }

    async function togglePin(kind: EffectKind, value: string) {
        const state = get(store)
        const list = state[kind].map((f) => (f.value === value ? { ...f, pinned: !f.pinned } : f))
        await persist({ ...state, [kind]: list })
    }

    storage.getItem<EffectFrequents>(KEY).then((saved) => {
        if (saved) store.set({ ...defaultEffectFrequents, ...saved })
        // From here on whatever is active counts as used, the effects store's
        // own hydration included: that is the last preset the user had on.
        effectsStore.subscribe(({ reverb, equalizer }) => {
            void touch('reverb', resolveReverbPreset(reverb))
            void touch('equalizer', equalizer)
        })
    })

    storage.watch<EffectFrequents>(KEY, (value) => {
        if (value) store.set(value)
    })

    return { subscribe: store.subscribe, touch, togglePin }
}

export const effectFrequents = createEffectFrequentsStore()
