<script lang="ts">
    import { onMount } from 'svelte'
    import * as Card from '$lib/components/ui/card'
    import TabsList from '$lib/components/TabsList.svelte'
    import { ModeWatcher } from 'mode-watcher'
    import AvatarLogo from '$lib/components/AvatarLogo.svelte'

    let timeout = $state<NodeJS.Timeout | null>(null)
    let loading = $state(true)

    function handleLoad() {
        if (timeout) {
            clearTimeout(timeout)
            timeout = null
        }

        timeout = setTimeout(() => {
            loading = false
        }, 1250)
    }
    onMount(() => {
        handleLoad()
    })
</script>

<ModeWatcher defaultMode="dark" defaultTheme="dark" track={false} />

<Card.Root class="dark rounded-none">
    <Card.Content class="h-[270px] w-[350px] p-4 pt-2">
        {#if loading}
            <div
                class="relative inset-1/2 left-1/2 top-1/2 flex h-full w-full -translate-x-1/2 -translate-y-1/2 animate-spin items-center justify-center"
            >
                <AvatarLogo src={chrome.runtime.getURL('/icon/128.png')} class="size-16" />
            </div>
        {:else}
            <div class="relative flex flex-col justify-center">
                <TabsList pip={true} />
            </div>
        {/if}
    </Card.Content>
</Card.Root>

<style lang="postcss">
    :global(.dark) {
        color-scheme: dark;
    }

    @media all and (display-mode: picture-in-picture) {
        :global(.dark) {
            color-scheme: dark;
        }
    }
</style>
