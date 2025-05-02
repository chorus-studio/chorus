<script lang="ts">
    import { onMount } from 'svelte'
    import { supporterStore } from '$lib/stores/supporter'
    import { playbackObserver } from '$lib/observers/playback'
    import { settingsStore } from '$lib/stores/settings'
    import type { SettingsState, SettingsKey, SettingsType } from '$lib/stores/settings'

    import { Badge } from '$lib/components/ui/badge'
    import SettingsSwitch from '$lib/components/SettingsSwitch.svelte'

    let pipSupported = $state(false)

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

    async function toggleView(event: MouseEvent) {
        const target = event.target as HTMLButtonElement
        await settingsStore.updateSettings({ type: target.id as SettingsType })
    }

    const checkOptInStatus = async () => {
        await supporterStore.sync()
        if (!$supporterStore?.isSupporter && $settingsStore.type === 'supporter') {
            await settingsStore.updateSettings({ type: 'general' })
        }
    }

    function checkIfPipSupported() {
        if (typeof window !== 'undefined' && 'pictureInPictureEnabled' in document) {
            pipSupported = document.pictureInPictureEnabled
        }
    }

    const isGeneral = $derived($settingsStore.type === 'general')

    onMount(() => {
        checkIfPipSupported()
        checkOptInStatus()
    })
</script>

<div class="flex h-full w-full flex-col items-center space-y-2">
    {#if $supporterStore.isSupporter}
        <div class="flex w-full justify-end gap-x-2">
            <Badge
                id="general"
                onclick={toggleView}
                variant={isGeneral ? 'default' : 'secondary'}
                class="h-5 cursor-pointer rounded-[2px] px-1.5 text-sm">general</Badge
            >
            <Badge
                id="supporter"
                onclick={toggleView}
                variant={isGeneral ? 'secondary' : 'default'}
                class="h-5 cursor-pointer rounded-[2px] px-1.5 text-sm">supporter</Badge
            >
        </div>
    {/if}

    {#if $settingsStore.type === 'general'}
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
                list={Object.keys($settingsStore.ui).filter((key) =>
                    key == 'pip' ? pipSupported : true
                )}
            />
        </div>
    {/if}
</div>
