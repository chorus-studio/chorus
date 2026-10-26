<script lang="ts">
    import { onDestroy } from 'svelte'
    import { snipStore, type Bound } from '$lib/stores/snip'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { MIN_SECTION_LENGTH } from '$lib/utils/snip-ranges'
    import { formatRulerTime, formatSnipTime, round1 } from '$lib/utils/snip-time'
    import { cn } from '$lib/utils.js'

    // Region editor over a time ruler with the live playhead. Every section is
    // drawn; the handles belong to the selected one, and clicking a section
    // selects it. Green is what plays and hatching is what's skipped, in both
    // modes. Moving a handle also seeks playback there (debounced) so you hear
    // where the bound lands.
    let trackEl = $state<HTMLDivElement | null>(null)
    let trackWidth = $state(0)
    let dragging = $state<Bound | null>(null)
    let seekTimer: ReturnType<typeof setTimeout> | null = null
    const HANDLE_HINT = 'Drag · ← → 1 s · Shift 5 s · Alt 0.1 s'

    const duration = $derived(Math.max($nowPlaying.duration ?? 0, 0))
    const mode = $derived($snipStore?.mode ?? 'play')
    const ranges = $derived($snipStore?.ranges ?? [])
    const selected = $derived($snipStore?.selected ?? 0)
    const range = $derived(ranges[selected] ?? { start: 0, end: duration })
    const current = $derived($nowPlaying.current ?? 0)

    const pct = (t: number) => (duration > 0 ? Math.min(100, Math.max(0, (t / duration) * 100)) : 0)

    // The readouts under the handles need about 90 px between them; a
    // narrower section gets one "start – end" label at its midpoint instead.
    const sectionPx = $derived(((pct(range.end) - pct(range.start)) / 100) * trackWidth)
    const narrow = $derived(trackWidth > 0 && sectionPx < 92)
    const midPct = $derived((pct(range.start) + pct(range.end)) / 2)

    // Ruler ticks. The major step is the smallest conventional one that puts
    // at most MAX_LABELS labels on the track with clear space between them
    // (a 9 px mono glyph is about 5.5 px wide), so a three-hour podcast gets
    // half-hour labels rather than twenty overlapping ten-minute ones. Minor
    // ticks sit halfway. A label that would run into the end label is dropped.
    const STEPS = [5, 10, 15, 30, 60, 120, 300, 600, 900, 1200, 1800, 3600, 7200, 10800, 21600]
    const MAX_LABELS = 7
    const CHAR_PX = 5.5
    const MIN_LABEL_GAP_PX = 14
    type Tick = { t: number; major: boolean; label: string | null }
    const ticks = $derived.by((): Tick[] => {
        if (!(duration > 0)) return []
        const width = trackWidth > 0 ? trackWidth : 400
        const px = (t: number) => (t / duration) * width
        const labelPx = (t: number) => formatRulerTime(t).length * CHAR_PX
        const endPx = labelPx(duration)

        const fits = (step: number) => {
            if (duration / step > MAX_LABELS) return false
            const last = Math.floor((duration - 0.001) / step) * step
            return px(step) - labelPx(last) >= MIN_LABEL_GAP_PX
        }
        const major = STEPS.find(fits) ?? STEPS[STEPS.length - 1]

        const out: Tick[] = []
        for (let t = 0; t < duration; t += major / 2) {
            const isMajor = t % major === 0
            let label: string | null = null
            if (isMajor) {
                const half = labelPx(t) / 2
                const right = t === 0 ? px(t) + half * 2 : px(t) + half
                if (right + 8 <= width - endPx) label = formatRulerTime(t)
            }
            out.push({ t, major: isMajor, label })
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

    function commit(which: Bound, value: number) {
        const next = snipStore.setBound(which, value, duration)
        if (next) scheduleSeek(which === 'start' ? next.start : next.end)
    }

    function onHandlePointerDown(event: PointerEvent, which: Bound) {
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

    function onHandleKeydown(event: KeyboardEvent, which: Bound) {
        const step = event.shiftKey ? 5 : event.altKey ? 0.1 : 1
        const value = which === 'start' ? range.start : range.end
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
                next = which === 'start' ? 0 : range.start + MIN_SECTION_LENGTH
                break
            case 'End':
                next = which === 'end' ? duration : range.end - MIN_SECTION_LENGTH
                break
            default:
                return
        }
        event.preventDefault()
        commit(which, next)
    }

    // Clicking a section selects it; clicking anywhere on the track also seeks
    // there (handles stop propagation).
    function onTrackClick(event: MouseEvent) {
        if (dragging || !(duration > 0)) return
        const time = timeFromClientX(event.clientX)
        const hit = ranges.findIndex((r) => time >= r.start && time <= r.end)
        if (hit >= 0 && hit !== selected) snipStore.select(hit)
        nowPlaying.setCurrentTime(time)
    }

    onDestroy(() => {
        if (seekTimer) clearTimeout(seekTimer)
    })
</script>

{#if $snipStore}
    <div class="relative h-[76px] select-none" role="group" aria-label="Snip timeline">
        <!-- ruler labels -->
        <div class="absolute inset-x-0 top-0 h-3 font-mono text-[9px] leading-none text-ink-muted">
            {#each ticks as tick (tick.t)}
                {#if tick.label !== null}
                    <span
                        class={cn('absolute', tick.t === 0 ? '' : '-translate-x-1/2')}
                        style="left: {pct(tick.t)}%"
                    >
                        {tick.label}
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
            bind:clientWidth={trackWidth}
            class={cn(
                'absolute inset-x-0 top-[24px] h-[36px] rounded-md border border-hairline',
                mode === 'play' ? 'snip-track-skipped' : 'snip-track-plays'
            )}
            onpointermove={onPointerMove}
            onpointerup={onPointerUp}
            onpointercancel={onPointerUp}
            onclick={onTrackClick}
        >
            <!-- sections, clipped to the track's rounded corners -->
            <div class="absolute inset-0 overflow-hidden rounded-[5px]" aria-hidden="true">
                {#each ranges as r, i (i)}
                    <div
                        class={cn(
                            'snip-section',
                            mode === 'play' ? 'snip-section-plays' : 'snip-section-skipped',
                            i === selected && 'snip-section-selected'
                        )}
                        style="left: {pct(r.start)}%; width: {Math.max(
                            0,
                            pct(r.end) - pct(r.start)
                        )}%"
                    >
                        <span class="font-mono text-[10px] leading-none">{i + 1}</span>
                    </div>
                {/each}
            </div>

            <button
                type="button"
                role="slider"
                aria-label="Section start"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={range.start}
                aria-valuetext={formatSnipTime(range.start)}
                title={HANDLE_HINT}
                class="snip-handle"
                style="left: calc({pct(range.start)}% - 5px)"
                onpointerdown={(e) => onHandlePointerDown(e, 'start')}
                onkeydown={(e) => onHandleKeydown(e, 'start')}
                onclick={(e) => e.stopPropagation()}
            >
                <i></i><i></i>
            </button>
            <button
                type="button"
                role="slider"
                aria-label="Section end"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={range.end}
                aria-valuetext={formatSnipTime(range.end)}
                title={HANDLE_HINT}
                class="snip-handle"
                style="left: calc({pct(range.end)}% - 5px)"
                onpointerdown={(e) => onHandlePointerDown(e, 'end')}
                onkeydown={(e) => onHandleKeydown(e, 'end')}
                onclick={(e) => e.stopPropagation()}
            >
                <i></i><i></i>
            </button>

            <div class="snip-playhead" style="left: {pct(current)}%" aria-hidden="true"></div>
        </div>

        <!-- bound readouts under the selected section's handles -->
        {#if narrow}
            <span
                class="absolute top-[64px] whitespace-nowrap font-mono text-[10px] leading-none text-signal-bright"
                style="left: {midPct}%; transform: translateX(-{midPct}%)"
            >
                {formatSnipTime(range.start)} – {formatSnipTime(range.end)}
            </span>
        {:else}
            <span
                class="absolute top-[64px] font-mono text-[10px] leading-none text-signal-bright"
                style="left: {pct(range.start)}%; transform: translateX(-{pct(range.start)}%)"
            >
                {formatSnipTime(range.start)}
            </span>
            <span
                class="absolute top-[64px] font-mono text-[10px] leading-none text-signal-bright"
                style="left: {pct(range.end)}%; transform: translateX(-{pct(range.end)}%)"
            >
                {formatSnipTime(range.end)}
            </span>
        {/if}
    </div>
{/if}

<style lang="postcss">
    /* The track shows what the sections sit on: in play mode the rest of the
       track is skipped (hatched), in skip mode the rest plays (green). */
    .snip-track-skipped {
        background-color: hsl(var(--inset));
        background-image: repeating-linear-gradient(
            135deg,
            hsl(var(--ink-fg) / 0.06) 0 1.5px,
            transparent 1.5px 6px
        );
    }
    .snip-track-plays {
        background-color: hsl(var(--signal) / 0.14);
    }
    .snip-section {
        position: absolute;
        top: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        box-sizing: border-box;
        border-top: 1px solid transparent;
        border-bottom: 1px solid transparent;
    }
    .snip-section-plays {
        background-color: hsl(var(--signal) / 0.12);
        border-color: hsl(var(--signal) / 0.3);
        color: hsl(var(--signal-bright) / 0.85);
    }
    .snip-section-skipped {
        background-color: hsl(var(--inset));
        background-image: repeating-linear-gradient(
            135deg,
            hsl(var(--ink-fg) / 0.1) 0 1.5px,
            transparent 1.5px 6px
        );
        border-color: hsl(var(--ink-fg) / 0.14);
        color: hsl(var(--ink-muted));
    }
    .snip-section-selected {
        border-color: hsl(var(--signal) / 0.6);
        color: hsl(var(--ink-fg));
    }
    .snip-section-plays.snip-section-selected {
        background-color: hsl(var(--signal) / 0.22);
    }
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
