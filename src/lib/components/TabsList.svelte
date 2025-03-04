<script lang="ts">
    import { onMount } from 'svelte'

    import type { Component } from 'svelte'
    import { writable } from 'svelte/store'
    import * as Tabs from '$lib/components/ui/tabs'
    import { Badge } from '$lib/components/ui/badge'

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

    let tabs = ['snip', 'speed', 'fx', 'eq', 'seek', 'info']
    let activeTab = writable<string | undefined>(tabs.at(0))

    const components: Record<string, Component> = {
        snip: Snip,
        fx: FX,
        eq: EQ,
        seek: Seek,
        speed: Speed,
        info: Info
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
            start_time: track?.start_time ?? 0,
            end_time: track?.end_time ?? $nowPlaying.duration
        })
    }

    onMount(() => {
        if ($activeTab === 'snip') {
            setSnip()
        }
        return () => snipStore.reset()
    })
</script>

<Tabs.Root value={$activeTab} class="h-7 p-0">
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
                        ? 'bg-[green]'
                        : 'bg-zinc-700'}">{tab}</Badge
                >
            </Tabs.Trigger>
        {/each}
    </Tabs.List>
    {#if $activeTab}
        <Tabs.Content
            value={$activeTab}
            class="relative flex h-[{$activeTab == 'info' ? '225px' : '205px'}] w-full flex-col"
        >
            {#if $activeTab !== 'info'}
                <TrackInfo />
            {/if}
            <svelte:component this={components[$activeTab]} />
            {#if $activeTab !== 'info'}
                {#if $activeTab == 'snip'}
                    <p class="absolute bottom-8 w-full text-end text-sm text-zinc-300">
                        *changes will <span class="font-semibold italic">reset</span> unless saved.
                    </p>
                {/if}
                <ActionButtons tab={$activeTab} />
            {/if}
        </Tabs.Content>
    {/if}
</Tabs.Root>
