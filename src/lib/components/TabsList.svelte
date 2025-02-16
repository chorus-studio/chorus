<script lang="ts">
    import type { Component} from 'svelte'
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
    let activeTab = writable(tabs.at(1))

    const components: Record<string, Component> = {
        snip: Snip,
        fx: FX,
        eq: EQ,
        seek: Seek,
        speed: Speed
    }
</script>

<Tabs.Root bind:value={$activeTab} class="p-0 h-6">
    <Tabs.List class="flex items-center h-full bg-transparent justify-end gap-x-1.5 p-0">
        {#each tabs as tab (tab)}
            <Tabs.Trigger value={tab} class="flex p-0 items-center justify-center">
                <Badge variant="outline" class="leading-[18px] font-semibold py-0 pb-[0.125rem] px-1.5 rounded-[2px] text-sm {$activeTab === tab ? 'bg-[green]' : 'bg-zinc-700'}">{tab}</Badge>
            </Tabs.Trigger>
        {/each}
    </Tabs.List>
    <Tabs.Content value={$activeTab} class="relative flex h-[205px] flex-col w-full">
        <TrackInfo />
        <svelte:component this={components[$activeTab]} />
        <p class="absolute bottom-8 text-sm text-end text-zinc-300 w-full">*changes will <span class="font-semibold italic">reset</span> unless saved.</p>
        <ActionButtons />
    </Tabs.Content>
</Tabs.Root>
