<script lang="ts">
    import { snipStore, type Bound } from '$lib/stores/snip'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { formatSnipTime, parseTimeInput, round1 } from '$lib/utils/snip-time'

    import Plus from '@lucide/svelte/icons/plus'
    import Minus from '@lucide/svelte/icons/minus'
    import ArrowUpToLine from '@lucide/svelte/icons/arrow-up-to-line'

    // Start / End / Length of the selected section.
    const duration = $derived(Math.max($nowPlaying.duration ?? 0, 0))
    const range = $derived($snipStore?.ranges[$snipStore.selected] ?? { start: 0, end: duration })
    const start = $derived(range.start)
    const end = $derived(range.end)
    const length = $derived(Math.max(0, end - start))

    function commit(which: Bound, value: number, seek = true) {
        const next = snipStore.setBound(which, value, duration)
        if (next && seek) nowPlaying.setCurrentTime(which === 'start' ? next.start : next.end)
    }

    function handleChange(event: Event, which: Bound) {
        const input = event.target as HTMLInputElement
        const parsed = parseTimeInput(input.value)
        if (parsed === null) {
            input.value = formatSnipTime(which === 'start' ? start : end)
            return
        }
        commit(which, parsed)
    }

    function nudge(which: Bound, delta: number) {
        commit(which, (which === 'start' ? start : end) + delta)
    }

    function setToPlayhead(which: Bound) {
        commit(which, round1($nowPlaying.current ?? 0), false)
    }
</script>

{#if $snipStore}
    <div class="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,0.7fr)] gap-x-2.5">
        {#each [['start', 'Start'], ['end', 'End']] as [which, label] (which)}
            {@const value = which === 'start' ? start : end}
            <div class="flex min-w-0 flex-col gap-y-1.5">
                <div class="flex h-4 items-center justify-between">
                    <span class="rack-label">{label}</span>
                    <button
                        type="button"
                        onclick={() => setToPlayhead(which as Bound)}
                        title={`Set ${label.toLowerCase()} to the current position`}
                        class="chorus-focus inline-flex h-4 items-center gap-x-1 whitespace-nowrap rounded-sm px-0.5 text-[11px] text-signal hover:text-signal-bright"
                    >
                        <ArrowUpToLine class="size-[11px]" />
                        Playhead
                    </button>
                </div>
                <div class="flex items-center gap-x-1">
                    <button
                        type="button"
                        aria-label={`${label} minus one second`}
                        onclick={() => nudge(which as Bound, -1)}
                        class="chorus-focus inline-flex h-7 w-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-ink-fg-2 hover:bg-surface-2/80"
                    >
                        <Minus class="size-3" />
                    </button>
                    <input
                        aria-label={`${label} time`}
                        value={formatSnipTime(value)}
                        onchange={(e) => handleChange(e, which as Bound)}
                        class="readout h-7 w-full min-w-0 flex-1 justify-center text-center focus-visible:border-signal/60 focus-visible:outline-none"
                    />
                    <button
                        type="button"
                        aria-label={`${label} plus one second`}
                        onclick={() => nudge(which as Bound, 1)}
                        class="chorus-focus inline-flex h-7 w-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-ink-fg-2 hover:bg-surface-2/80"
                    >
                        <Plus class="size-3" />
                    </button>
                </div>
            </div>
        {/each}

        <div class="flex min-w-0 flex-col gap-y-1.5">
            <span class="rack-label flex h-4 items-center">Length</span>
            <div class="readout h-7 justify-center text-ink-muted">{formatSnipTime(length)}</div>
        </div>
    </div>
{/if}
