<script lang="ts">
    import type { Component } from 'svelte'
    import { writable } from 'svelte/store'
    import * as Tabs from '$lib/components/ui/tabs'
    import { Badge } from '$lib/components/ui/badge'

    import FX from '$lib/components/views/FX.svelte'
    import EQ from '$lib/components/views/EQ.svelte'
    import Snip from '$lib/components/views/Snip.svelte'
    import Seek from '$lib/components/views/Seek.svelte'
    import Speed from '$lib/components/views/Speed.svelte'
    import TrackInfo from '$lib/components/TrackInfo.svelte'
    import ActionButtons from '$lib/components/ActionButtons.svelte'

    let tabs = ['snip', 'speed', 'fx', 'eq', 'seek']
    let activeTab = writable(tabs.at(0))

    const components: Record<string, Component> = {
        snip: Snip,
        fx: FX,
        eq: EQ,
        seek: Seek,
        speed: Speed
    }
</script>

<Tabs.Root bind:value={$activeTab} class="h-6 p-0">
    <Tabs.List class="flex h-full items-center justify-end gap-x-1.5 bg-transparent p-0">
        {#each tabs as tab (tab)}
            <Tabs.Trigger value={tab} class="flex items-center justify-center p-0">
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
    <Tabs.Content value={$activeTab} class="relative flex h-[205px] w-full flex-col">
        <TrackInfo />
        <svelte:component this={components[$activeTab]} />
        <p class="absolute bottom-8 w-full text-end text-sm text-zinc-300">
            *changes will <span class="font-semibold italic">reset</span> unless saved.
        </p>
        <ActionButtons tab={$activeTab} />
    </Tabs.Content>
</Tabs.Root>
