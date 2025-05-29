import { storage } from '@wxt-dev/storage'
import { writable, get } from 'svelte/store'
import { licenseStore } from '$lib/stores/license'
import { syncWithType } from '$lib/utils/store-utils'
import type { Playback } from '$lib/stores/playback'
import type { AudioEffect } from '$lib/stores/effects'

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
    }
}

export type AudioPreset = {
    id: string
    active: boolean
    playback: Playback
    effect: AudioEffect
}

export const defaultAudioPreset: Omit<AudioPreset, 'id'> = {
    active: false,
    playback: {
        pitch: 1,
        semitone: 0,
        rate: {
            value: 1,
            preserves_pitch: true
        }
    },
    effect: { equalizer: 'none', reverb: 'none' }
}

export const createAudioPreset = (): AudioPreset => ({
    ...defaultAudioPreset,
    id: crypto.randomUUID()
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
        custom_reverb_presets: []
    }
}

function createConfigStore() {
    const store = writable<ConfigState>(defaultConfig)
    const { subscribe, set } = store
    let isUpdatingStorage = false

    function checkIfTrackShouldBeSkipped({ title, artist }: { title: string; artist: string }) {
        if (get(licenseStore).status !== 'granted') return false

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

    function updateAudioPreset({
        preset,
        type
    }: {
        preset: AudioPreset
        type: 'effect' | 'playback'
    }) {
        if (!preset.active) return

        const effect = {
            equalizer: preset.effect.equalizer,
            reverb: preset.effect.reverb
        }
        const playback = {
            pitch: preset.playback.pitch,
            semitone: preset.playback.semitone,
            rate: {
                value: preset.playback.rate.value,
                preserves_pitch: preset.playback.rate.preserves_pitch
            }
        }

        const message = {
            type: type === 'effect' ? 'FROM_EFFECTS_LISTENER' : 'FROM_PLAYBACK_LISTENER',
            data: type === 'effect' ? effect : playback
        }

        window?.postMessage(message, '*')
    }

    storage.getItem<ConfigState>(CONFIG_STORE_KEY).then((config) => {
        if (!config) return

        // Sync the stored settings with the current type definition
        const syncedConfig = syncWithType(config, defaultConfig)
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

        const syncedConfig = syncWithType(config, defaultConfig)
        set(syncedConfig)
    })

    return {
        subscribe,
        updateConfig,
        updateAudioPreset,
        checkIfTrackShouldBeSkipped
    }
}

export const configStore = createConfigStore()
