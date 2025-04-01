<script lang="ts">
    import { playbackObserver } from '$lib/observers/playback'
    import { settingsStore, type SettingsState } from '$lib/stores/settings'

    import { Label } from '$lib/components/ui/label'
    import { Switch } from '$lib/components/ui/switch'
    import { Separator } from '$lib/components/ui/separator'

    async function toggleUISettings(key: keyof SettingsState['ui']) {
        await settingsStore.updateSettings({
            ui: {
                ...$settingsStore.ui,
                [key]: !$settingsStore.ui[key]
            }
        })

        if (key === 'progress') playbackObserver.toggleProgress()
        if (key === 'volume') playbackObserver.toggleVolumeSlider()
        if (key === 'playlist') playbackObserver.togglePlaylistButton()
    }

    async function toggleViewsSettings(key: keyof SettingsState['views']) {
        await settingsStore.updateSettings({
            views: {
                ...$settingsStore.views,
                [key]: !$settingsStore.views[key]
            }
        })
    }

    function setUILabel(key: keyof SettingsState['ui']) {
        if (key == 'playlist') return 'add to playlist'
        return `${key} v2`
    }
</script>

<div class="flex h-full w-full flex-col items-center justify-center space-y-2">
    <div class="flex w-full justify-between">
        <div class="mr-2 flex w-1/2 flex-col gap-y-2">
            <h2 class="text-base font-semibold">ui</h2>
            {#each Object.keys($settingsStore.ui) as key}
                <div class="flex items-center justify-between gap-y-2.5">
                    <Switch
                        checked={$settingsStore.ui[key as keyof SettingsState['ui']]}
                        onCheckedChange={() => toggleUISettings(key as keyof SettingsState['ui'])}
                    />
                    <Label>{setUILabel(key as keyof SettingsState['ui'])}</Label>
                </div>
            {/each}
        </div>

        <Separator orientation="vertical" class="mx-2 w-0.5 space-x-2" />

        <div class="ml-2 flex w-1/2 flex-col gap-y-2">
            <h2 class="text-base font-semibold">views</h2>
            {#each Object.keys($settingsStore.views) as key}
                <div class="gapy-y-2.5 flex items-center justify-between">
                    <Switch
                        checked={$settingsStore.views[key as keyof SettingsState['views']]}
                        onCheckedChange={() =>
                            toggleViewsSettings(key as keyof SettingsState['views'])}
                    />
                    <Label>show {key} tab</Label>
                </div>
            {/each}
        </div>
    </div>
</div>
