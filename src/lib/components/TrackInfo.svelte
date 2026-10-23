<script lang="ts">
    import { nowPlaying } from '$lib/stores/now-playing'
    import ScrollingText from '$lib/components/ScrollingText.svelte'

    // `compact`: single-line "title · artist" used above per-track controls.
    let { isPopup = false, compact = false }: { isPopup?: boolean; compact?: boolean } = $props()

    const title = $derived($nowPlaying.title ?? 'Nothing playing')
    const artist = $derived($nowPlaying.artist ?? '—')
</script>

{#if compact}
    <div class="flex min-w-0 items-center gap-1.5 text-xs leading-none">
        <span class="truncate font-medium text-ink-fg">{title}</span>
        <span class="shrink-0 text-dim">·</span>
        <span class="truncate text-ink-muted">{artist}</span>
    </div>
{:else}
    <div class="flex w-full min-w-0 flex-col {isPopup ? 'gap-y-1' : 'gap-y-0.5'}">
        <ScrollingText text={title} className="text-[13px] font-semibold text-ink-fg" />
        <ScrollingText text={artist} className="text-xs text-ink-muted" />
    </div>
{/if}
