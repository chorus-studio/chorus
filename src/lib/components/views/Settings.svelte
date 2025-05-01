<script lang="ts">
    import { onMount } from 'svelte'
    import { supporterStore } from '$lib/stores/supporter'
    import { playbackObserver } from '$lib/observers/playback'
    import { settingsStore, type SettingsState, type SettingsKey } from '$lib/stores/settings'

    import { Label } from '$lib/components/ui/label'
    import { Switch } from '$lib/components/ui/switch'
    import { Separator } from '$lib/components/ui/separator'
    import SettingsSwitch from '$lib/components/SettingsSwitch.svelte'

    async function toggleSettings({
        type,
        key
    }: {
        type: SettingsKey
        key: keyof SettingsState[SettingsKey]
    }) {
        await settingsStore.updateSettings({
            [type]: {
                ...$settingsStore[type],
                [key]: !$settingsStore[type][key]
            }
        })

        if (key === 'progress') playbackObserver.toggleProgress()
        if (key === 'volume') playbackObserver.toggleVolumeSlider()
        if (key === 'playlist') playbackObserver.togglePlaylistButton()
    }

    function setUILabel(key: keyof SettingsState[SettingsKey]) {
        if (key in $settingsStore.views) return `show ${key} tab`
        if (key == 'playlist') return 'add to playlist'
        return `v2 ${key} `
    }

    const checkOptInStatus = async () => await supporterStore.sync()

    onMount(() => checkOptInStatus())
</script>

<div class="flex h-full w-full flex-col items-center space-y-2">
    <h2 class="text-left text-base font-semibold">Note: only available for supporters</h2>
    <div class="flex w-full justify-between">
        <SettingsSwitch
            list={Object.keys($settingsStore.ui)}
            title="ui"
            type="ui"
            setLabel={setUILabel}
            handleCheckedChange={toggleSettings}
        />

        <Separator orientation="vertical" class="mx-2 w-0.5 space-x-2" />

        <SettingsSwitch
            list={Object.keys($settingsStore.views)}
            title="views"
            type="views"
            setLabel={setUILabel}
            handleCheckedChange={toggleSettings}
        />
    </div>
</div>
