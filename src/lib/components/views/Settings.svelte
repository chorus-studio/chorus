<script lang="ts">
    import { onMount } from 'svelte'
    import { settingsStore } from '$lib/stores/settings'
    import { playbackObserver } from '$lib/observers/playback'
    import type { SettingsState, SettingsKey } from '$lib/stores/settings'
    import { setTheme, injectTheme, removeTheme } from '$lib/utils/theming'

    import SettingsSwitch from '$lib/components/SettingsSwitch.svelte'

    let pipSupported = $state(false)

    async function toggleSettings({
        type,
        key
    }: {
        type: SettingsKey
        key: keyof SettingsState[SettingsKey]
    }) {
        const enabled = !$settingsStore[type][key]

        await settingsStore.updateSettings({
            [type]: {
                ...$settingsStore[type],
                [key]: enabled
            }
        })

        if (key === 'progress') playbackObserver.toggleProgress()
        if (key === 'volume') playbackObserver.toggleVolumeSlider()
        if (key === 'playlist') playbackObserver.togglePlaylistButton()
        if (key === 'theme') {
            if (!enabled) return removeTheme()
            await setTheme($settingsStore.theme.name)
        }
    }

    function setUILabel(key: keyof SettingsState[SettingsKey]) {
        const keyStr = String(key)
        if (key in $settingsStore.views) return `show ${keyStr} tab`
        if (key == 'playlist') return 'add to playlist'
        return `v2 ${keyStr} `
    }

    function checkIfPipSupported() {
        if (typeof window !== 'undefined' && 'pictureInPictureEnabled' in document) {
            pipSupported = document.pictureInPictureEnabled
        }
    }

    onMount(checkIfPipSupported)
</script>

<div class="flex h-full w-full flex-col items-center space-y-2">
    <div class="!mt-4 flex w-full justify-between gap-x-2">
        <SettingsSwitch
            title="ui"
            type="ui"
            className="mr-0"
            setLabel={setUILabel}
            handleCheckedChange={toggleSettings}
            list={Object.keys($settingsStore.ui).filter((key) => {
                if (key == 'pip') return pipSupported
                return true
            })}
            )}
        />

        <SettingsSwitch
            list={Object.keys($settingsStore.views)}
            title="views"
            type="views"
            className="mr-0"
            setLabel={setUILabel}
            handleCheckedChange={toggleSettings}
        />
    </div>
</div>
