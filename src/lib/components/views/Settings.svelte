<script lang="ts">
    import { onMount } from 'svelte'
    import { supporterStore } from '$lib/stores/supporter'
    import { playbackObserver } from '$lib/observers/playback'
    import { settingsStore, type SettingsState, type SettingsKey } from '$lib/stores/settings'

    import { Badge } from '$lib/components/ui/badge'
    import { Separator } from '$lib/components/ui/separator'
    import SettingsSwitch from '$lib/components/SettingsSwitch.svelte'

    let settingsView = $state('general')

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
        if (key == 'playback') return 'prioritize playback'
        return `v2 ${key} `
    }

    function toggleView(event: MouseEvent) {
        const target = event.target as HTMLButtonElement
        settingsView = target.id
    }

    const checkOptInStatus = async () => await supporterStore.sync()

    onMount(() => checkOptInStatus())
</script>

<div class="flex h-full w-full flex-col items-center space-y-2">
    {#if $supporterStore.isSupporter}
        <div class="flex w-full justify-end gap-x-2">
            <Badge
                id="general"
                onclick={toggleView}
                variant="default"
                class="h-5 rounded-[2px] px-1 text-sm">general</Badge
            >
            <Badge
                id="supporter"
                onclick={toggleView}
                variant="default"
                class="h-5 rounded-[2px] px-1 text-sm">supporter</Badge
            >
        </div>
    {/if}

    {#if settingsView === 'general'}
        <div class="!mt-4 flex w-full justify-between gap-x-2">
            <SettingsSwitch
                list={Object.keys($settingsStore.base)}
                title="base"
                type="base"
                className="mr-0"
                setLabel={setUILabel}
                handleCheckedChange={toggleSettings}
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
    {:else}
        <div class="flex w-full justify-between">
            <SettingsSwitch
                title="ui"
                type="ui"
                className="w-full"
                setLabel={setUILabel}
                handleCheckedChange={toggleSettings}
                list={Object.keys($settingsStore.ui)}
            />
        </div>
    {/if}
</div>
