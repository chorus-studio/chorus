<script lang="ts">
    import { nowPlaying } from '$lib/stores/now-playing'
    import Logo from '$lib/components/Logo.svelte'

    let { size = 52 }: { size?: number } = $props()
    const source = $derived($nowPlaying.cover ?? '')
</script>

<div
    class="flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-[color:color-mix(in_srgb,var(--text)_10%,transparent)]"
    style="width: {size}px; height: {size}px"
>
    {#if source}
        <img src={source} loading="eager" alt="" class="size-full object-cover" />
    {:else}
        <Logo size={Math.round(size * 0.45)} tone="current" class="opacity-40" />
    {/if}
</div>
