<script lang="ts">
    import { toSegments } from '$lib/utils/snip-ranges'
    import { formatTime } from '$lib/utils/time'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { trackObserver } from '$lib/observers/track'
    import { Progress } from '$lib/components/ui/progress'

    // Two homes: grafted into Spotify's player bar (id chorus-time-progress,
    // inherits Spotify's white-on-black) and inside the popup/PiP, where the
    // album palette sets --bg / --text / --accent on the root.
    let {
        pip = false,
        port,
        id = 'popup-time-progress'
    }: { pip?: boolean; port: chrome.runtime.Port | null; id?: string } = $props()

    let hoverPosition = $state(0)
    let isHovering = $state(false)
    // Pointer scrubbing: while the bar is held, the fill, the elapsed label
    // and the tooltip follow the pointer; the seek happens once, on release.
    let scrubbing = $state(false)
    let scrubPosition = $state(0)
    let sliderRef: HTMLDivElement

    // Seconds under the pointer, or null while the duration is unknown — a
    // position computed from the 0 sentinel is always 0 and would seek there.
    function positionAt(clientX: number): number | null {
        if (!sliderRef || !($nowPlaying.duration > 0)) return null
        const rect = sliderRef.getBoundingClientRect()
        const seconds = Math.round(((clientX - rect.left) / rect.width) * $nowPlaying.duration)
        return Math.max(0, Math.min(seconds, $nowPlaying.duration))
    }

    function onPointerDown(event: PointerEvent) {
        if (event.pointerType === 'mouse' && event.button !== 0) return
        const position = positionAt(event.clientX)
        if (position === null) return
        sliderRef.setPointerCapture(event.pointerId)
        scrubbing = true
        scrubPosition = position
        hoverPosition = position
        isHovering = true
    }

    function onPointerMove(event: PointerEvent) {
        const position = positionAt(event.clientX)
        if (position === null) return
        hoverPosition = position
        if (scrubbing) scrubPosition = position
    }

    // Release seeks; a cancelled pointer (the browser took it over) doesn't.
    function endScrub(event: PointerEvent, seek: boolean) {
        if (!scrubbing) return
        scrubbing = false
        if (sliderRef.hasPointerCapture(event.pointerId)) {
            sliderRef.releasePointerCapture(event.pointerId)
        }
        if (seek) seekTo(scrubPosition)
        // Keep the tooltip only if the pointer let go over the bar.
        const rect = sliderRef.getBoundingClientRect()
        isHovering =
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
    }

    // Capture lost some other way (the bar unmounted mid-drag): just reset.
    function onLostCapture() {
        if (!scrubbing) return
        scrubbing = false
        isHovering = false
    }

    function onPointerLeave() {
        if (!scrubbing) isHovering = false
    }

    function seekTo(seconds: number) {
        const duration = $nowPlaying.duration
        // Only clamp the upper bound when duration is known — clamping to the
        // 0 sentinel would turn every seek into a track restart. Overshoots
        // are clamped by the media element itself.
        const target =
            duration > 0 ? Math.max(0, Math.min(seconds, duration)) : Math.max(0, seconds)
        $nowPlaying.current = target
        if (port) {
            port.postMessage({ type: 'current_time', data: target })
        } else {
            trackObserver?.updateCurrentTime(target)
        }
    }

    const ARROW_STEP = 5

    function handleKeydown(event: KeyboardEvent) {
        // Only slider-navigation keys seek. Without this filter, ANY key while the
        // bar is focused seeks to the stale hoverPosition — including volume media
        // keys, which Chrome delivers to the focused page as keydown on Windows.
        let target: number
        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowUp':
                target = ($nowPlaying.current ?? 0) + ARROW_STEP
                break
            case 'ArrowLeft':
            case 'ArrowDown':
                target = ($nowPlaying.current ?? 0) - ARROW_STEP
                break
            case 'Home':
                target = 0
                break
            case 'End':
                if (!($nowPlaying.duration > 0)) return
                target = $nowPlaying.duration
                break
            default:
                return
        }
        event.preventDefault()
        seekTo(target)
    }

    const isChorus = $derived(id === 'chorus-time-progress')
    // In the player bar: white fill, snip region in the bar signal (green, or
    // the theme's accent on a themed bar). In the popup/PiP: the album text
    // colour fills, the adaptive accent marks the snip.
    const fillClass = $derived(isChorus ? 'bg-ink-fg' : 'bg-[color:var(--text)]')
    const trackClass = $derived(isChorus ? 'bg-ink-fg/15' : 'bg-[color:var(--text)] opacity-[0.22]')
    const snipColor = $derived(isChorus ? 'hsl(var(--bar-signal))' : 'var(--album-accent)')
    const timeClass = $derived(isChorus ? 'text-ink-muted' : 'text-[color:var(--text-2)]')
    const currentPosition = $derived(
        scrubbing ? scrubPosition : Math.round($nowPlaying.current ?? 0)
    )
    // What plays, in either snip mode: tinted ahead of the playhead, solid
    // behind it. Nothing until the duration is known, or the maths is NaN.
    const segments = $derived.by(() => {
        const duration = $nowPlaying.duration
        if (!(duration > 0)) return []
        return toSegments($nowPlaying.snip, duration).map(({ start, end }) => ({
            start,
            end: end ?? duration,
            color: snipColor
        }))
    })
    // The thumb is a hollow ring: the fill colour as a 2 px stroke around a
    // hole painted in the bar's own background, so it reads as a cut-out at
    // the end of the fill whatever colour that fill is. In the player bar the
    // background is the themed panel colour (theme.css paints the bar in
    // `main`), or Spotify's black footer when no theme is on; in the popup/PiP
    // it's the album colour.
    const thumbRingClass = $derived(isChorus ? 'border-ink-fg' : 'border-[color:var(--text)]')
    const thumbHole = $derived(isChorus ? 'var(--chorus-main, #000)' : 'var(--bg)')
    // Where the thumb sits: the displayed position as a share of the bar.
    const thumbPct = $derived(
        $nowPlaying.duration > 0
            ? Math.min(100, Math.max(0, (currentPosition / $nowPlaying.duration) * 100))
            : 0
    )
    const current = $derived(
        scrubbing
            ? formatTime(scrubPosition)
            : $nowPlaying.current >= 0
              ? formatTime($nowPlaying.current)
              : '-:--'
    )
    const total = $derived($nowPlaying.duration ? formatTime($nowPlaying.duration) : '-:--')
</script>

<div class="relative flex w-full select-none items-center gap-x-2 {isChorus ? 'mt-1' : ''}">
    {#if isChorus && $nowPlaying.playback}
        <span
            class="min-w-7 text-right font-mono text-[11px] font-medium tabular-nums text-signal-bar"
        >
            {$nowPlaying.playback.rate.value}×
        </span>
    {/if}

    <div class="flex w-full {isChorus ? 'items-center gap-x-2' : 'flex-col gap-y-1'}">
        {#if isChorus}
            <span class="min-w-8 text-right font-mono text-[11px] {timeClass} tabular-nums"
                >{current}</span
            >
        {/if}

        <div
            {id}
            role="slider"
            tabindex={0}
            bind:this={sliderRef}
            aria-label="Time slider"
            aria-valuemin={0}
            aria-valuemax={$nowPlaying.duration || 0}
            aria-valuenow={currentPosition}
            class="group relative w-full cursor-pointer touch-none py-1.5 focus-visible:outline-none"
            onkeydown={handleKeydown}
            onpointerdown={onPointerDown}
            onpointermove={onPointerMove}
            onpointerup={(e) => endScrub(e, true)}
            onpointercancel={(e) => endScrub(e, false)}
            onlostpointercapture={onLostCapture}
            onpointerenter={() => (isHovering = true)}
            onpointerleave={onPointerLeave}
        >
            {#if isHovering && $nowPlaying.duration > 0}
                <div
                    class="pointer-events-none absolute bottom-full -translate-x-1/2 rounded-sm bg-surface-2 px-1 py-0.5"
                    style="left: {(hoverPosition / $nowPlaying.duration) * 100}%"
                >
                    <span class="font-mono text-[10px] text-ink-fg"
                        >{formatTime(hoverPosition)}</span
                    >
                </div>
            {/if}
            <Progress
                {segments}
                dividerColor={snipColor}
                value={currentPosition ?? 0}
                max={$nowPlaying.duration ?? 100}
                innerClass={fillClass}
                class="h-1 rounded-full {trackClass} transition-all group-hover:h-1.5 group-focus-visible:ring-2 group-focus-visible:ring-signal-bar/60"
            />
            <!-- Thumb at the playhead while hovering, focused or scrubbing, so
                 the bar reads as draggable. Ignores the pointer so presses on
                 it land on the slider. -->
            <div
                class="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-[0_1px_3px_rgba(0,0,0,0.45)] transition-opacity duration-100 {thumbRingClass} {isHovering ||
                scrubbing
                    ? 'opacity-100'
                    : 'opacity-0 group-focus-visible:opacity-100'}"
                style="left: {thumbPct}%; background: {thumbHole}"
                aria-hidden="true"
            ></div>
        </div>

        {#if isChorus}
            <span class="min-w-8 font-mono text-[11px] {timeClass} tabular-nums">{total}</span>
        {:else}
            <div
                class="flex w-full items-center justify-between font-mono leading-none {pip
                    ? 'text-[11px]'
                    : 'text-[10px]'} {timeClass} tabular-nums"
            >
                <span>{current}</span>
                <span>{total}</span>
            </div>
        {/if}
    </div>
</div>
