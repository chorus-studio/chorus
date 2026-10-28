// Pinned and recently used presets of each picker list (room reverbs, custom
// reverbs, Spotify EQs, custom EQs, stereo processing), for the chip rows under
// the pickers: the
// same idea as the Speed tab's frequent values. Whatever becomes the active
// preset, from the picker, a chip, a quick preset or a keyboard command,
// lands in its list's row; pinned chips survive new arrivals.
import { get, writable } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import { effectsStore } from '$lib/stores/effects'
import { resolveReverbPreset, roomPresets } from '$lib/audio-effects/reverb/presets'
import { resolveEQPreset, spotifyPresets } from '$lib/audio-effects/equalizer/presets'
import { advancedPresets } from '$lib/audio-effects/ms-processor/presets'

export type EffectKind = 'reverb' | 'equalizer' | 'msProcessor'
export type EffectList =
    | 'room_reverb'
    | 'custom_reverb'
    | 'spotify_eq'
    | 'custom_eq'
    | 'ms_processing'
export type EffectFrequent = { value: string; pinned: boolean }
export type EffectFrequents = Record<EffectList, EffectFrequent[]>

/** The effect a list's presets belong to. */
export const LIST_KIND: Record<EffectList, EffectKind> = {
    room_reverb: 'reverb',
    custom_reverb: 'reverb',
    spotify_eq: 'equalizer',
    custom_eq: 'equalizer',
    ms_processing: 'msProcessor'
}

/**
 * Which list a preset name lives in; null for one no list keeps (the stereo
 * channel modes are a chip row of their own, with nothing to remember).
 */
export function listOf(kind: EffectKind, name: string): EffectList | null {
    switch (kind) {
        case 'reverb':
            return roomPresets.includes(name) ? 'room_reverb' : 'custom_reverb'
        case 'equalizer':
            return spotifyPresets.includes(name) ? 'spotify_eq' : 'custom_eq'
        default:
            return advancedPresets.includes(name) ? 'ms_processing' : null
    }
}

const KEY = 'local:chorus_effect_frequents'
/** Two rows of chips; past this the oldest unpinned one makes room. */
export const EFFECT_FREQUENTS_MAX = 6

const unpinned = (value: string): EffectFrequent => ({ value, pinned: false })

export const defaultEffectFrequents: EffectFrequents = {
    room_reverb: ['small', 'studio', 'bathroom', 'hall', 'arena', 'cathedral'].map(unpinned),
    custom_reverb: ['lofi', 'radio', 'dream', 'crystal', 'echo', 'space'].map(unpinned),
    spotify_eq: ['Bass booster', 'Vocal booster', 'Loudness', 'Rock', 'Pop', 'Acoustic'].map(
        unpinned
    ),
    custom_eq: ['Club', 'Live', 'Party'].map(unpinned),
    ms_processing: ['narrow', 'wide', 'ultra-wide', 'vocal-focus', 'karaoke', 'bass-focus'].map(
        unpinned
    )
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
        const list = listOf(kind, value)
        if (!list) return
        const state = get(store)
        const next = withFrequent(state[list], value)
        if (next !== state[list]) await persist({ ...state, [list]: next })
    }

    async function togglePin(list: EffectList, value: string) {
        const state = get(store)
        const next = state[list].map((f) => (f.value === value ? { ...f, pinned: !f.pinned } : f))
        await persist({ ...state, [list]: next })
    }

    storage.getItem<EffectFrequents>(KEY).then((saved) => {
        if (saved) store.set({ ...defaultEffectFrequents, ...saved })
        // From here on whatever is active counts as used, the effects store's
        // own hydration included: that is the last preset the user had on.
        effectsStore.subscribe(({ reverb, equalizer, msProcessor }) => {
            void touch('reverb', resolveReverbPreset(reverb))
            void touch('equalizer', resolveEQPreset(equalizer))
            void touch('msProcessor', msProcessor)
        })
    })

    storage.watch<EffectFrequents>(KEY, (value) => {
        if (value) store.set(value)
    })

    return { subscribe: store.subscribe, touch, togglePin }
}

export const effectFrequents = createEffectFrequentsStore()
