<script lang="ts">
    import { onMount } from 'svelte'
    import type { Component } from 'svelte'
    import { writable } from 'svelte/store'
    import { storage } from '@wxt-dev/storage'

    import * as Tabs from '$lib/components/ui/tabs'
    import { Badge } from '$lib/components/ui/badge'
    import { Label } from '$lib/components/ui/label'
    import { Switch } from '$lib/components/ui/switch'
    import ScrollingText from '$lib/components/ScrollingText.svelte'
    import FX from '$lib/components/views/FX.svelte'
    import EQ from '$lib/components/views/EQ.svelte'
    import Info from '$lib/components/views/Info.svelte'
    import Snip from '$lib/components/views/Snip.svelte'
    import Seek from '$lib/components/views/Seek.svelte'
    import Speed from '$lib/components/views/Speed.svelte'
    import TrackInfo from '$lib/components/TrackInfo.svelte'
    import ActionButtons from '$lib/components/ActionButtons.svelte'

    import { dataStore } from '$lib/stores/data'
    import { snipStore } from '$lib/stores/snip'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { playbackStore } from '$lib/stores/playback'

    let tabs = ['snip', 'speed', 'fx', 'eq', 'seek', 'info']
    let activeTab = writable<string | undefined>()
    let defaultView = writable<string>($activeTab)

    const components: Record<string, Component> = {
        snip: Snip,
        fx: FX,
        eq: EQ,
        seek: Seek,
        speed: Speed,
        info: Info
    }

    async function handleCheckedChange(checked: boolean) {
        if (!$activeTab) return
        if (checked) {
            defaultView.set($activeTab)
            await storage.setItem('local:chorus_default_view', $activeTab)
        }
    }

    function setActiveTab(tab: string) {
        if (tab === 'snip') {
            setSnip()
        }
        activeTab.set(tab)
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
                    playback_rate: $nowPlaying.playback.playback_rate,
                    preserves_pitch: $nowPlaying.playback.preserves_pitch
                }
            })
        }
    }

    async function getDefaultView() {
        const tab = (await storage.getItem<string>('local:chorus_default_view')) ?? 'snip'
        defaultView.set(tab)
        activeTab.set(tab)
    }

    onMount(() => {
        getDefaultView()
        setupSpeed()
        if ($activeTab === 'snip') {
            setSnip()
        } else if ($activeTab === 'speed') {
            setupSpeed()
        }
        return () => snipStore.reset()
    })
</script>

<Tabs.Root value={$activeTab} class="h-7 w-full p-0">
    <Tabs.List class="flex h-full items-center justify-end gap-x-1.5 bg-transparent p-0">
        {#each tabs as tab (tab)}
            <Tabs.Trigger
                value={tab}
                class="flex items-center justify-center p-0"
                onclick={() => setActiveTab(tab)}
            >
                <Badge
                    variant="outline"
                    class="rounded-[2px] px-1.5 py-0 pb-[0.125rem] text-sm font-semibold leading-[18px] {$activeTab ===
                    tab
                        ? 'bg-green-700'
                        : 'bg-zinc-700'}">{tab}</Badge
                >
            </Tabs.Trigger>
        {/each}
    </Tabs.List>

    {#if $activeTab}
        <Tabs.Content value={$activeTab} class="relative flex h-[205px] w-full flex-col">
            {#if $activeTab !== 'info'}
                <TrackInfo />
            {/if}
            <svelte:component this={components[$activeTab]} />
            {#if $activeTab !== 'info'}
                {#if $activeTab == 'snip' || ($activeTab == 'speed' && !$playbackStore.is_default)}
                    <p class="absolute bottom-8 w-full text-end text-sm text-zinc-300">
                        *changes will <span class="font-semibold italic">reset</span> unless saved.
                    </p>
                {/if}
                <div class="absolute bottom-0 flex h-6 w-full items-center justify-end gap-x-2">
                    <Label class="text-sm">set as default view</Label>
                    <Switch
                        checked={$defaultView === $activeTab}
                        onCheckedChange={handleCheckedChange}
                    />
                </div>
                <ActionButtons tab={$activeTab} />
            {/if}
        </Tabs.Content>
    {/if}
</Tabs.Root>
