<script lang="ts">
    import { writable } from 'svelte/store'
    import * as Tabs from '$lib/components/ui/tabs'
    import { Badge } from '$lib/components/ui/badge'
    import Snip from '$lib/components/views/Snip.svelte'

    let tabs = ['snip', 'speed', 'fx', 'eq', 'seek']
    let activeTab = writable(tabs[0])
    import TrackInfo from '$lib/components/TrackInfo.svelte'
</script>

<Tabs.Root bind:value={$activeTab} class="p-0 h-6">
    <Tabs.List class="flex items-center bg-transparent justify-end gap-x-1.5 p-0 h-6">
        {#each tabs as tab (tab)}
            <Tabs.Trigger value={tab} class="flex p-0 items-center justify-center">
                <Badge variant="outline" class="px-1.5 rounded-[2px] text-sm {$activeTab === tab ? 'bg-[green]' : 'bg-zinc-700'}">{tab}</Badge>
            </Tabs.Trigger>
        {/each}
    </Tabs.List>
        <Tabs.Content value={$activeTab} class="flex flex-col items-center justify-center">
               <TrackInfo />
               {#if $activeTab === 'snip'}
                    <Snip />
               {/if}
        </Tabs.Content>
</Tabs.Root>
