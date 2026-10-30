<script lang="ts">
    import { nowPlaying } from '$lib/stores/now-playing'
    import Logo from '$lib/components/Logo.svelte'
    import { cn } from '$lib/utils.js'

    let { size = 52, class: className = '' }: { size?: number; class?: string } = $props()
    const source = $derived($nowPlaying.cover ?? '')
</script>

<div
    class={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-[color:color-mix(in_srgb,var(--text)_10%,transparent)]',
        className
    )}
    style="width: {size}px; height: {size}px"
>
    {#if source}
        <img src={source} loading="eager" alt="" class="size-full object-cover" />
    {:else}
        <Logo size={Math.round(size * 0.45)} tone="current" class="opacity-40" />
    {/if}
</div>
