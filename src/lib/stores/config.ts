import { storage } from '@wxt-dev/storage'
import { writable, get } from 'svelte/store'
import { syncWithType } from '$lib/utils/store-utils'
import type { Playback } from '$lib/stores/playback'
import type { AudioEffect } from '$lib/stores/effects'
import { isNormal, type PresetValues } from '$lib/audio-effects/quick-presets'
import {
    normalizeEffectSettings,
    type EffectSettings
} from '$lib/audio-effects/lofi/audio/effect-settings'

export const CONFIG_STORE_KEY = 'local:chorus_config'

export const TITLE_KEYWORDS = 'title_keywords'
export const ARTIST_KEYWORDS = 'artist_keywords'

export type AutoSkipKey = 'title_keywords' | 'artist_keywords'
export type AutoSkipBoolean = 'case_sensitive' | 'match_whole_words' | 'match_exact_words'

export type AutoSkip = {
    enabled: boolean
    artist_keywords: string[]
    title_keywords: string[]
    case_sensitive: boolean
    match_whole_words: boolean
    match_exact_words: boolean
}

export type ConfigState = {
    auto_skip: AutoSkip
    audio_presets: AudioPreset[]
    fx_eq_presets: {
        custom_eq_presets: string[]
        spotify_eq_presets: string[]
        room_reverb_presets: string[]
        custom_reverb_presets: string[]
        ms_processor_presets: string[]
        quick_presets: string[]
    }
}

/**
 * A user's own preset: the "Mine" group of the Presets tab. Slot N (by position)
 * is what the `audio-preset-N` keyboard command toggles.
 */
export type AudioPreset = {
    id: string
    name: string
    playback: Playback
    effect: AudioEffect
    lofi: EffectSettings
}

/** Five slots, matching the five `audio-preset-N` commands in the manifest. */
export const MAX_AUDIO_PRESETS = 5

export const createAudioPreset = (values: PresetValues, name: string): AudioPreset => ({
    id: crypto.randomUUID(),
    name,
    playback: {
        pitch: values.playback.pitch,
        semitone: values.playback.semitone,
        rate: { ...values.playback.rate }
    },
    effect: { ...values.effect },
    lofi: normalizeEffectSettings(values.lofi)
})

export const defaultConfig: ConfigState = {
    audio_presets: [],
    auto_skip: {
        enabled: false,
        title_keywords: [],
        artist_keywords: [],
        case_sensitive: true,
        match_whole_words: true,
        match_exact_words: true
    },
    fx_eq_presets: {
        custom_eq_presets: [],
        spotify_eq_presets: [],
        room_reverb_presets: [],
        custom_reverb_presets: [],
        ms_processor_presets: [],
        quick_presets: []
    }
}

/**
 * Bring a stored config up to date. syncWithType keeps `fx_eq_presets` as-is
 * because it is an object of arrays, so a list added later (quick_presets) has
 * to be filled in here. Preset slots from the old settings-dialog editor carried
 * an `active` flag and could sit at their blank defaults; a blank slot is just a
 * second "Normal", so it is dropped, and every slot gets a name. A slot saved
 * before the lofi rack existed gets the rack switched off.
 */
function migrate(config: ConfigState): ConfigState {
    const fx_eq_presets = { ...defaultConfig.fx_eq_presets, ...(config.fx_eq_presets ?? {}) }
    const audio_presets = (config.audio_presets ?? [])
        .filter((preset) => preset?.playback && preset?.effect && !isNormal(preset))
        .map((preset, index) => ({
            id: preset.id ?? crypto.randomUUID(),
            name: preset.name || `Preset ${index + 1}`,
            playback: preset.playback,
            effect: preset.effect,
            lofi: normalizeEffectSettings(preset.lofi)
        }))
    return { ...config, fx_eq_presets, audio_presets }
}

function createConfigStore() {
    const store = writable<ConfigState>(defaultConfig)
    const { subscribe, set } = store
    let isUpdatingStorage = false

    function checkIfTrackShouldBeSkipped({ title, artist }: { title: string; artist: string }) {
        if (!title || !artist) return false

        const {
            auto_skip: {
                enabled,
                title_keywords,
                artist_keywords,
                case_sensitive,
                match_whole_words,
                match_exact_words
            }
        } = get(store)
        if (!enabled) return false

        const createRegexPattern = (keyword: string) => {
            let pattern = keyword
            if (match_exact_words) {
                pattern = `^${pattern}$`
            } else if (match_whole_words) {
                pattern = `\\b${pattern}\\b`
            }
            return new RegExp(pattern, case_sensitive ? '' : 'i')
        }

        const titleMatch = title_keywords.some((keyword) => createRegexPattern(keyword).test(title))

        const artistMatch = artist_keywords.some((keyword) =>
            artist.split(', ').some((artistName) => createRegexPattern(keyword).test(artistName))
        )

        return titleMatch || artistMatch
    }

    async function updateConfig(config: Partial<ConfigState>) {
        const currentConfig = get(store)
        const updatedConfig = { ...currentConfig, ...config }
        set(updatedConfig)

        isUpdatingStorage = true
        try {
            await storage.setItem(CONFIG_STORE_KEY, updatedConfig)
        } finally {
            isUpdatingStorage = false
        }
    }

    storage.getItem<ConfigState>(CONFIG_STORE_KEY).then((config) => {
        if (!config) return

        // Sync the stored settings with the current type definition
        const syncedConfig = migrate(syncWithType(config, defaultConfig))
        set(syncedConfig)

        // Update storage with synced settings
        isUpdatingStorage = true
        storage
            .setItem<ConfigState>(CONFIG_STORE_KEY, syncedConfig)
            .then(() => {
                isUpdatingStorage = false
            })
            .catch((error) => {
                console.error('Error updating storage:', error)
                isUpdatingStorage = false
            })
    })

    storage.watch<ConfigState>(CONFIG_STORE_KEY, (config) => {
        if (!config || isUpdatingStorage) return

        const syncedConfig = migrate(syncWithType(config, defaultConfig))
        set(syncedConfig)
    })

    return {
        subscribe,
        updateConfig,
        checkIfTrackShouldBeSkipped
    }
}

export const configStore = createConfigStore()
