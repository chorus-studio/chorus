<script lang="ts">
    import { onDestroy } from 'svelte'
    import { snipStore } from '$lib/stores/snip'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { clampSnip, formatRulerTime, formatSnipTime, round1 } from '$lib/utils/snip-time'
    import { cn } from '$lib/utils.js'

    // Draggable region editor over a time ruler with the live playhead.
    // Moving a handle also seeks playback there (debounced) so you hear
    // where the bound lands — same behaviour as the old range slider.
    const MIN_LENGTH = 1

    let trackEl = $state<HTMLDivElement | null>(null)
    let dragging = $state<'start' | 'end' | null>(null)
    let seekTimer: ReturnType<typeof setTimeout> | null = null

    const duration = $derived(Math.max($nowPlaying.duration ?? 0, 0))
    const start = $derived($snipStore?.start_time ?? 0)
    const end = $derived($snipStore?.end_time ?? duration)
    const current = $derived($nowPlaying.current ?? 0)

    const pct = (t: number) => (duration > 0 ? Math.min(100, Math.max(0, (t / duration) * 100)) : 0)

    // Major tick spacing adapts to the track length; minor ticks sit halfway.
    const ticks = $derived.by(() => {
        if (!(duration > 0)) return [] as Array<{ t: number; major: boolean }>
        const major =
            duration <= 150
                ? 30
                : duration <= 420
                  ? 60
                  : duration <= 900
                    ? 120
                    : duration <= 1800
                      ? 300
                      : 600
        const out: Array<{ t: number; major: boolean }> = []
        for (let t = 0; t < duration; t += major / 2) {
            out.push({ t, major: t % major === 0 })
        }
        return out
    })

    function timeFromClientX(clientX: number) {
        if (!trackEl || !(duration > 0)) return 0
        const rect = trackEl.getBoundingClientRect()
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
        return round1(ratio * duration)
    }

    function scheduleSeek(time: number) {
        if (seekTimer) clearTimeout(seekTimer)
        seekTimer = setTimeout(() => {
            nowPlaying.setCurrentTime(time)
            seekTimer = null
        }, 150)
    }

    function commit(which: 'start' | 'end', value: number) {
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
        scheduleSeek(which === 'start' ? next.start : next.end)
    }

    function onHandlePointerDown(event: PointerEvent, which: 'start' | 'end') {
        event.preventDefault()
        event.stopPropagation()
        ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
        dragging = which
    }

    function onPointerMove(event: PointerEvent) {
        if (!dragging) return
        commit(dragging, timeFromClientX(event.clientX))
    }

    function onPointerUp() {
        dragging = null
    }

    function onHandleKeydown(event: KeyboardEvent, which: 'start' | 'end') {
        const step = event.shiftKey ? 5 : event.altKey ? 0.1 : 1
        const value = which === 'start' ? start : end
        let next: number
        switch (event.key) {
            case 'ArrowLeft':
            case 'ArrowDown':
                next = value - step
                break
            case 'ArrowRight':
            case 'ArrowUp':
                next = value + step
                break
            case 'Home':
                next = which === 'start' ? 0 : start + MIN_LENGTH
                break
            case 'End':
                next = which === 'end' ? duration : end - MIN_LENGTH
                break
            default:
                return
        }
        event.preventDefault()
        commit(which, next)
    }

    // Clicking the bare track seeks playback there (handles stop propagation).
    function onTrackClick(event: MouseEvent) {
        if (dragging || !(duration > 0)) return
        nowPlaying.setCurrentTime(timeFromClientX(event.clientX))
    }

    onDestroy(() => {
        if (seekTimer) clearTimeout(seekTimer)
    })
</script>

{#if $snipStore}
    <div class="relative h-[70px] select-none" role="group" aria-label="Snip timeline">
        <!-- ruler labels -->
        <div class="absolute inset-x-0 top-0 h-3 font-mono text-[9px] leading-none text-ink-muted">
            {#each ticks as tick (tick.t)}
                {#if tick.major && pct(tick.t) < 90}
                    <span
                        class={cn('absolute', tick.t === 0 ? '' : '-translate-x-1/2')}
                        style="left: {pct(tick.t)}%"
                    >
                        {formatRulerTime(tick.t)}
                    </span>
                {/if}
            {/each}
            {#if duration > 0}
                <span class="absolute right-0">{formatRulerTime(duration)}</span>
            {/if}
        </div>
        <!-- tick marks -->
        <div class="absolute inset-x-0 top-[14px] h-1.5" aria-hidden="true">
            {#each ticks as tick (tick.t)}
                <span
                    class={cn(
                        'absolute w-px',
                        tick.major ? '-top-px h-1.5 bg-ink-fg/30' : 'top-0 h-1 bg-ink-fg/20'
                    )}
                    style="left: {pct(tick.t)}%"
                ></span>
            {/each}
            <span class="absolute -top-px right-0 h-1.5 w-px bg-ink-fg/30"></span>
        </div>

        <!-- track: keyboard access lives on the two handles -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            bind:this={trackEl}
            class="absolute inset-x-0 top-[22px] h-[30px] rounded-md border border-hairline bg-inset"
            onpointermove={onPointerMove}
            onpointerup={onPointerUp}
            onpointercancel={onPointerUp}
            onclick={onTrackClick}
        >
            <div
                class="absolute inset-y-0 border-y border-signal/50 bg-signal/15"
                style="left: {pct(start)}%; width: {Math.max(0, pct(end) - pct(start))}%"
            ></div>

            <button
                type="button"
                role="slider"
                aria-label="Snip start"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={start}
                aria-valuetext={formatSnipTime(start)}
                class="snip-handle"
                style="left: calc({pct(start)}% - 5px)"
                onpointerdown={(e) => onHandlePointerDown(e, 'start')}
                onkeydown={(e) => onHandleKeydown(e, 'start')}
                onclick={(e) => e.stopPropagation()}
            >
                <i></i><i></i>
            </button>
            <button
                type="button"
                role="slider"
                aria-label="Snip end"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={end}
                aria-valuetext={formatSnipTime(end)}
                class="snip-handle"
                style="left: calc({pct(end)}% - 5px)"
                onpointerdown={(e) => onHandlePointerDown(e, 'end')}
                onkeydown={(e) => onHandleKeydown(e, 'end')}
                onclick={(e) => e.stopPropagation()}
            >
                <i></i><i></i>
            </button>

            <div class="snip-playhead" style="left: {pct(current)}%" aria-hidden="true"></div>
        </div>

        <!-- bound readouts under the handles -->
        <span
            class="absolute top-[56px] font-mono text-[10px] leading-none text-signal-bright"
            style="left: {pct(start)}%; transform: translateX(-{pct(start)}%)"
        >
            {formatSnipTime(start)}
        </span>
        <span
            class="absolute top-[56px] font-mono text-[10px] leading-none text-signal-bright"
            style="left: {pct(end)}%; transform: translateX(-{pct(end)}%)"
        >
            {formatSnipTime(end)}
        </span>
    </div>
{/if}

<style lang="postcss">
    .snip-handle {
        position: absolute;
        top: -4px;
        bottom: -4px;
        width: 10px;
        border-radius: 4px;
        border: 0;
        padding: 0;
        cursor: ew-resize;
        touch-action: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 2px;
        background: hsl(var(--signal));
        box-shadow: 0 0 0 2px hsl(var(--ink));
        transition: box-shadow 0.15s ease;
    }
    .snip-handle:hover,
    .snip-handle:focus-visible {
        outline: none;
        box-shadow:
            0 0 0 2px hsl(var(--ink)),
            0 0 0 4px hsl(var(--signal) / 0.35);
    }
    .snip-handle i {
        display: block;
        width: 1px;
        height: 10px;
        background: rgba(0, 0, 0, 0.45);
    }
    .snip-playhead {
        position: absolute;
        top: -6px;
        bottom: -2px;
        width: 2px;
        pointer-events: none;
        background: hsl(var(--ink-fg));
        transform: translateX(-50%);
    }
    .snip-playhead::before {
        content: '';
        position: absolute;
        top: -1px;
        left: 50%;
        transform: translateX(-50%);
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 6px solid hsl(var(--ink-fg));
    }
</style>
