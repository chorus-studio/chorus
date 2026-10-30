<script lang="ts">
    import { tick } from 'svelte'
    import ChevronLeft from '@lucide/svelte/icons/chevron-left'
    import { snipStore } from '$lib/stores/snip'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { lyricsStore } from '$lib/stores/lyrics'
    import { lineAt, lineSpan } from '$lib/utils/snip-lyrics'
    import { formatRulerTime, round1 } from '$lib/utils/snip-time'
    import type { LyricLine } from '$lib/utils/lyrics'
    import { cn } from '$lib/utils.js'

    // The Snip tab's lyrics picker: the track's timed lines, one per row.
    // Click the first line of the selected section, then its last, and the
    // section runs from where the first starts to where the line after the
    // last starts. The engine follows the draft, so it is heard at once.
    let { onBack }: { onBack: () => void } = $props()

    const trackId = $derived($nowPlaying.track_id)
    const duration = $derived(Math.max($nowPlaying.duration ?? 0, 0))
    // undefined while fetching, null when the track has none.
    const lyrics = $derived(trackId ? $lyricsStore[trackId] : null)
    const lines = $derived<LyricLine[]>(lyrics?.synced ? lyrics.lines : [])
    const playhead = $derived(round1($nowPlaying.current ?? 0))
    const playingLine = $derived(lineAt(lines, playhead))
    const selected = $derived($snipStore?.selected ?? 0)
    const range = $derived($snipStore?.ranges[selected] ?? null)

    let first = $state<number | null>(null)
    let listEl = $state<HTMLDivElement | null>(null)

    $effect(() => {
        if (trackId) void lyricsStore.load(trackId)
    })

    // Once the lines are in, bring the playing one into view.
    $effect(() => {
        if (!lines.length || !listEl) return
        tick().then(() =>
            listEl?.querySelector('[data-playing]')?.scrollIntoView({ block: 'center' })
        )
    })

    const covered = (line: LyricLine) =>
        range !== null && line.start >= range.start - 0.05 && line.start < range.end - 0.05

    function pick(index: number) {
        if (first === null) {
            first = index
            return
        }
        const span = lineSpan(lines, first, index, duration)
        first = null
        if (!span) return
        snipStore.update((draft) => {
            if (!draft) return draft
            const ranges = draft.ranges.map((r) => ({ ...r }))
            ranges[draft.selected] = span
            return { ...draft, ranges, last_updated: null }
        })
        nowPlaying.setCurrentTime(span.start)
    }
</script>

<div class="flex h-full min-h-0 flex-col gap-y-2">
    <div class="flex h-6 shrink-0 items-center gap-x-2 text-[11px] text-ink-muted">
        <button
            type="button"
            onclick={onBack}
            title="Back to the sections"
            class="chorus-focus -ml-1 inline-flex h-[22px] shrink-0 items-center gap-x-0.5 rounded-md pl-0.5 pr-1.5 text-ink-fg-2 transition-colors hover:bg-surface-2 hover:text-ink-fg"
        >
            <ChevronLeft class="size-3.5" />
            Sections
        </button>
        <span class="truncate">
            Section {selected + 1}:
            {#if first !== null}
                now click its <span class="font-medium text-ink-fg">last line</span>
            {:else}
                click its <span class="font-medium text-ink-fg">first line</span>, then its last
            {/if}
        </span>
        {#if range}
            <span class="ml-auto shrink-0 font-mono text-ink-fg-2">
                {formatRulerTime(range.start)}–{formatRulerTime(range.end)}
            </span>
        {/if}
    </div>

    {#if lyrics === undefined}
        <div class="flex flex-1 items-center justify-center text-xs text-ink-muted">
            Fetching the lyrics…
        </div>
    {:else if lines.length === 0}
        <div class="flex flex-1 flex-col items-center justify-center gap-y-1 text-center">
            <span class="text-[13px] text-ink-fg-2">
                {lyrics ? 'These lyrics are not timed' : 'No lyrics for this track'}
            </span>
            <span class="text-xs text-ink-muted">Set the section on the timeline instead.</span>
        </div>
    {:else}
        <div
            bind:this={listEl}
            class="chorus-scroll min-h-0 flex-1 overflow-y-auto rounded-lg border border-hairline bg-panel py-1"
            role="listbox"
            aria-label="Lyric lines"
        >
            {#each lines as line, i (i)}
                {@const inSection = covered(line)}
                {@const picked = first === i}
                {@const playing = i === playingLine}
                <button
                    type="button"
                    role="option"
                    aria-selected={picked || inSection}
                    data-playing={playing || undefined}
                    onclick={() => pick(i)}
                    class={cn(
                        'flex w-full items-center gap-x-2.5 px-2.5 py-1 text-left text-xs leading-snug transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none',
                        picked
                            ? 'bg-signal/25 text-ink-fg'
                            : inSection
                              ? 'bg-signal/10 text-ink-fg'
                              : 'text-ink-fg-2'
                    )}
                >
                    <span
                        class={cn(
                            'w-9 shrink-0 font-mono text-[10px] tabular-nums',
                            playing ? 'text-signal' : 'text-ink-muted'
                        )}>{formatRulerTime(line.start)}</span
                    >
                    <span class="truncate">{line.text}</span>
                </button>
            {/each}
        </div>
    {/if}
</div>
