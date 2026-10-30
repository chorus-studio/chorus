<script lang="ts">
    import { nowPlaying } from '$lib/stores/now-playing'
    import ScrollingText from '$lib/components/ScrollingText.svelte'

    // `compact`: single-line "title · artist" used above per-track controls.
    // `pip`: the PiP player's larger type.
    let {
        isPopup = false,
        compact = false,
        pip = false
    }: { isPopup?: boolean; compact?: boolean; pip?: boolean } = $props()

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
    <!-- The popup and PiP wear the cover palette (--text); the in-page rack its ink tokens. -->
    <div
        class="flex w-full min-w-0 flex-col {pip ? 'gap-y-1.5' : isPopup ? 'gap-y-1' : 'gap-y-0.5'}"
    >
        <ScrollingText
            text={title}
            className="{pip ? 'text-lg' : 'text-[13px]'} font-semibold {isPopup
                ? 'text-[color:var(--text)]'
                : 'text-ink-fg'}"
        />
        <ScrollingText
            text={artist}
            className="{pip ? 'text-sm' : 'text-xs'} {isPopup
                ? 'text-[color:var(--text-2)]'
                : 'text-ink-muted'}"
        />
    </div>
{/if}
