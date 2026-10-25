<script lang="ts">
    import { snipStore } from '$lib/stores/snip'
    import { mediaStore } from '$lib/stores/media'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { clampSnip, formatSnipTime, parseTimeInput, round1 } from '$lib/utils/snip-time'

    import Play from '@lucide/svelte/icons/play'
    import Plus from '@lucide/svelte/icons/plus'
    import Info from '@lucide/svelte/icons/info'
    import Minus from '@lucide/svelte/icons/minus'
    import ArrowUpToLine from '@lucide/svelte/icons/arrow-up-to-line'
    import { Button } from '$lib/components/ui/button'

    type Which = 'start' | 'end'
    const MIN_LENGTH = 1

    const duration = $derived(Math.max($nowPlaying.duration ?? 0, 0))
    const start = $derived($snipStore?.start_time ?? 0)
    const end = $derived($snipStore?.end_time ?? duration)
    const length = $derived(Math.max(0, end - start))

    function commit(which: Which, value: number, seek = true) {
        if (!$snipStore) return
        const next = clampSnip(
            { start: which === 'start' ? value : start, end: which === 'end' ? value : end },
            duration,
            MIN_LENGTH
        )
        snipStore.set({
            ...$snipStore,
            start_time: next.start,
            end_time: next.end,
            last_updated: which
        })
        if (seek) nowPlaying.setCurrentTime(which === 'start' ? next.start : next.end)
    }

    function handleChange(event: Event, which: Which) {
        const input = event.target as HTMLInputElement
        const parsed = parseTimeInput(input.value)
        if (parsed === null) {
            input.value = formatSnipTime(which === 'start' ? start : end)
            return
        }
        commit(which, parsed)
    }

    function nudge(which: Which, delta: number) {
        commit(which, (which === 'start' ? start : end) + delta)
    }

    function setToPlayhead(which: Which) {
        commit(which, round1($nowPlaying.current ?? 0), false)
    }

    function ensurePlaying() {
        if ($mediaStore.playing) return
        const playPause = document.querySelector(
            '[data-testid="control-button-playpause"]'
        ) as HTMLButtonElement | null
        playPause?.click()
    }

    function playSnip() {
        nowPlaying.setCurrentTime(start)
        ensurePlaying()
    }

    function playLastSeconds() {
        nowPlaying.setCurrentTime(Math.max(start, end - 3))
        ensurePlaying()
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
                        onclick={() => setToPlayhead(which as Which)}
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
                        onclick={() => nudge(which as Which, -1)}
                        class="chorus-focus inline-flex h-7 w-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-ink-fg-2 hover:bg-surface-2/80"
                    >
                        <Minus class="size-3" />
                    </button>
                    <input
                        aria-label={`${label} time`}
                        value={formatSnipTime(value)}
                        onchange={(e) => handleChange(e, which as Which)}
                        class="readout h-7 w-full min-w-0 flex-1 justify-center text-center focus-visible:border-signal/60 focus-visible:outline-none"
                    />
                    <button
                        type="button"
                        aria-label={`${label} plus one second`}
                        onclick={() => nudge(which as Which, 1)}
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

    <div class="mt-auto flex items-center justify-between gap-x-2">
        <div class="flex items-center gap-x-1">
            <Button variant="secondary" size="sm" onclick={playSnip} class="h-[26px]">
                <Play class="size-3 fill-current" />
                Play snip
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onclick={playLastSeconds}
                class="h-[26px]"
                title="Hear how the snip ends"
            >
                Last 3 s
            </Button>
        </div>
        <span class="flex items-center gap-x-1.5 text-[11px] text-ink-muted">
            <Info class="size-3 shrink-0" />
            Drag handles · ← → nudge 1 s
        </span>
    </div>
{/if}
