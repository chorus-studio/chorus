<script lang="ts">
    import { onMount } from 'svelte'
    import { pipStore } from '$lib/stores/pip'
    import * as Card from '$lib/components/ui/card'
    import TabsList from '$lib/components/TabsList.svelte'
    import { ModeWatcher } from 'mode-watcher'

    onMount(() => {
        pipStore.update(true)
        return () => {
            pipStore.update(false)
        }
    })
</script>

<ModeWatcher defaultMode="dark" defaultTheme="dark" track={false} />

<Card.Root class="rounded-none bg-black !text-white">
    <Card.Content class="h-[270px] w-[350px] p-4">
        <div class="relative flex flex-col justify-center">
            <TabsList pip={true} />
        </div>
    </Card.Content>
</Card.Root>

<style>
    :global(.dark) {
        color-scheme: dark;
    }

    @media all and (display-mode: picture-in-picture) {
        :global(.dark) {
            color-scheme: dark;
            @apply bg-primary text-white;
        }
    }
</style>
