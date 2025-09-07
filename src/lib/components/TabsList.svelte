<script lang="ts">
    import { onMount } from 'svelte'
    import type { Component } from 'svelte'
    import { storage } from '@wxt-dev/storage'

    import * as Tabs from '$lib/components/ui/tabs'
    import { Badge } from '$lib/components/ui/badge'
    import { Label } from '$lib/components/ui/label'
    import { Switch } from '$lib/components/ui/switch'

    import FXEQ from '$lib/components/views/FXEQ.svelte'
    import Info from '$lib/components/views/Info.svelte'
    import Snip from '$lib/components/views/Snip.svelte'
    import Seek from '$lib/components/views/Seek.svelte'
    import Speed from '$lib/components/views/Speed.svelte'
    import PopUp from '$lib/components/views/PopUp.svelte'
    import TrackInfo from '$lib/components/TrackInfo.svelte'
    import AvatarLogo from '$lib/components/AvatarLogo.svelte'
    import Settings from '$lib/components/views/Settings.svelte'
    import ToggleSelect from '$lib/components/ToggleSelect.svelte'
    import ActionButtons from '$lib/components/ActionButtons.svelte'

    import { dataStore } from '$lib/stores/data'
    import { snipStore } from '$lib/stores/snip'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { playbackStore } from '$lib/stores/playback'
    import { settingsStore } from '$lib/stores/settings'
    import { volumeStore, type VolumeType } from '$lib/stores/volume'

    let { pip = false }: { pip?: boolean } = $props()

    const VIEW_KEY = 'local:chorus_view'

    let tabs = [
        pip ? 'player' : '',
        'snip',
        'speed',
        'fx|eq',
        'seek',
        'settings',
        pip ? '' : 'info'
    ].filter(Boolean)

    let filteredTabs: string[] = $state(tabs)

    let activeTab = $state<string | undefined>()
    let defaultView = $state<string>(tabs[0])

    const components: Record<string, Component> = {
        snip: Snip,
        'fx|eq': FXEQ,
        seek: Seek,
        speed: Speed,
        info: Info,
        settings: Settings,
        player: PopUp
    }

    async function handleCheckedChange(checked: boolean) {
        if (!activeTab) return
        if (checked) {
            defaultView = activeTab
            await storage.setItem(VIEW_KEY, activeTab)
        }
    }

    function setActiveTab(tab: string) {
        if (tab === 'snip') {
            setSnip()
        }
        activeTab = tab
    }

    function setSnip() {
        const track = $nowPlaying?.track_id
            ? dataStore.collectionObject[$nowPlaying.track_id]
            : dataStore.collection.find((x) => x.song_id === $nowPlaying.id)

        snipStore.set({
            is_shared: false,
            last_updated: 'start',
            start_time: track?.snip?.start_time ?? 0,
            end_time: track?.snip?.end_time ?? $nowPlaying.duration
        })
    }

    async function setupSpeed() {
        if ($nowPlaying?.playback) {
            await playbackStore.updatePlayback({
                track: {
                    rate: $nowPlaying.playback.rate,
                    pitch: $nowPlaying.playback.pitch,
                    semitone: $nowPlaying.playback.semitone
                }
            })
        }
    }

    async function getDefaultView() {
        const tab = (await storage.getItem<string>(VIEW_KEY)) ?? filteredTabs[0]
        defaultView = tab == 'player' && !pip ? filteredTabs[0] : tab
        activeTab = defaultView
    }

    async function handleVolumeTypeChange(value: string) {
        await volumeStore.updateVolume({ type: value as VolumeType })
    }

    onMount(() => {
        getDefaultView()
        setupSpeed()
        if (activeTab === 'snip') setSnip()
        if (activeTab === 'speed') setupSpeed()

        const unsubscribeSettingsViews = settingsStore.subscribe((state) => {
            const settingsViews = state.views
            filteredTabs = tabs.filter((tab) => {
                if (!Object.keys(settingsViews).includes(tab)) return true
                return settingsViews[tab as keyof typeof settingsViews]
            })
        })

        return () => {
            unsubscribeSettingsViews()
            snipStore.reset()
        }
    })
</script>

<Tabs.Root value={activeTab} class="h-7 w-full p-0">
    <Tabs.List class="flex h-full items-center justify-end gap-x-1.5 bg-transparent p-0">
        {#if pip}
            <div class="absolute left-0">
                <AvatarLogo class="bg-black" />
            </div>
        {/if}

        {#each filteredTabs as tab (tab)}
            <Tabs.Trigger
                value={tab}
                class="flex items-center justify-center  p-0 {pip ? 'gap-y-3' : ''}"
                onclick={() => setActiveTab(tab)}
            >
                <Badge
                    variant="outline"
                    class="rounded-[2px] text-[#fafafa] {['settings', 'info', 'support'].includes(
                        tab
                    )
                        ? 'p-0'
                        : 'px-1.5 py-0 pb-[0.125rem]'} text-sm font-semibold leading-[18px] {activeTab ===
                    tab
                        ? 'bg-green-700 hover:bg-green-800'
                        : 'bg-zinc-700 hover:bg-zinc-500'}"
                >
                    {#if tab === 'settings'}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="lucide lucide-settings-icon lucide-settings h-5 w-5 fill-none stroke-2 p-1"
                            ><path
                                d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
                            /><circle cx="12" cy="12" r="3" /></svg
                        >
                    {:else if tab === 'info'}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="lucide lucide-circle-help-icon lucide-circle-help h-5 w-5 fill-none stroke-2 p-1"
                            ><circle cx="12" cy="12" r="10" /><path
                                d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
                            /><path d="M12 17h.01" /></svg
                        >
                    {:else if tab === 'support'}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="lucide lucide-coffee-icon lucide-coffee h-5 w-5 fill-none stroke-2 p-1"
                            ><path d="M10 2v2" /><path d="M14 2v2" /><path
                                d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"
                            /><path d="M6 2v2" /></svg
                        >
                    {:else}
                        {tab}
                    {/if}
                </Badge>
            </Tabs.Trigger>
        {/each}
    </Tabs.List>

    {#if activeTab}
        <Tabs.Content
            value={activeTab}
            class="relative flex {activeTab === 'player' ? 'h-[210px]' : 'h-[205px]'} {[
                'player',
                'snip',
                'fx|eq',
                'speed'
            ].includes(activeTab)
                ? 'space-y-2'
                : ''} w-full flex-col"
        >
            {#if !['speed', 'info', 'settings', 'support', 'player', 'fx|eq'].includes(activeTab)}
                <TrackInfo />
            {/if}
            {@const View = components[activeTab]}
            <View {pip} />

            {#if activeTab === 'player'}
                <div class="absolute bottom-0 z-50 flex w-full items-center gap-x-2">
                    <span class="text-sm text-muted-foreground">vol</span>
                    <ToggleSelect
                        {pip}
                        value={$volumeStore.type}
                        onValueChange={handleVolumeTypeChange}
                        list={[
                            { label: 'ln', value: 'linear' },
                            { label: 'lg', value: 'logarithmic' }
                        ]}
                    />
                </div>
            {/if}
            {#if activeTab !== 'info'}
                <div
                    class="absolute bottom-0 right-0 z-50 flex h-6 w-fit items-center justify-end gap-x-2"
                >
                    <Label class="text-sm text-muted-foreground">set default view</Label>
                    <Switch
                        checked={defaultView === activeTab}
                        onCheckedChange={handleCheckedChange}
                    />
                </div>
                <ActionButtons tab={activeTab} />
            {/if}
        </Tabs.Content>
    {/if}
</Tabs.Root>
