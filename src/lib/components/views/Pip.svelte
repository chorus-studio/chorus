<script lang="ts">
    import { onMount } from 'svelte'
    import { ModeWatcher } from 'mode-watcher'
    import TabsList from '$lib/components/TabsList.svelte'
    import Logo from '$lib/components/Logo.svelte'

    let timeout = $state<ReturnType<typeof setTimeout> | null>(null)
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

<div class="dark flex h-[320px] w-[440px] flex-col bg-ink text-ink-fg">
    {#if loading}
        <div class="flex flex-1 items-center justify-center">
            <Logo size={36} class="animate-led-pulse" />
        </div>
    {:else}
        <TabsList pip={true} />
    {/if}
</div>

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
