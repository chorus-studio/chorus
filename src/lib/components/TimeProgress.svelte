<script lang="ts">
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
    let sliderRef: HTMLDivElement

    function handleMouseMove(event: MouseEvent) {
        // duration 0 means "never known" — a hover position computed from it
        // is always 0 and a later click/key would seek there.
        if (!sliderRef || !($nowPlaying.duration > 0)) return

        const rect = sliderRef.getBoundingClientRect()
        const percentage = (event.clientX - rect.left) / rect.width
        const seconds = Math.round(percentage * $nowPlaying.duration)
        hoverPosition = Math.max(0, Math.min(seconds, $nowPlaying.duration))
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

    function setProgress() {
        // A bar click is a percentage of the duration — meaningless when unknown.
        if (!($nowPlaying.duration > 0)) return
        seekTo(hoverPosition)
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
    // In the player bar: white fill, green snip region. In the popup/PiP: the
    // album text colour fills, the adaptive accent marks the snip.
    const fillClass = $derived(isChorus ? 'bg-ink-fg' : 'bg-[color:var(--text)]')
    const trackClass = $derived(isChorus ? 'bg-ink-fg/15' : 'bg-[color:var(--text)] opacity-[0.22]')
    const snipColor = $derived(isChorus ? 'hsl(var(--signal))' : 'var(--album-accent)')
    const timeClass = $derived(isChorus ? 'text-ink-muted' : 'text-[color:var(--text-2)]')
    const currentPosition = $derived(Math.round($nowPlaying.current ?? 0))
    const current = $derived($nowPlaying.current >= 0 ? formatTime($nowPlaying.current) : '-:--')
    const total = $derived($nowPlaying.duration ? formatTime($nowPlaying.duration) : '-:--')
</script>

<div class="relative flex w-full items-center gap-x-2 {isChorus ? 'mt-1' : ''}">
    {#if isChorus && $nowPlaying.playback}
        <span class="min-w-7 text-right font-mono text-[11px] font-medium tabular-nums text-signal">
            {$nowPlaying.playback.rate.value}×
        </span>
    {/if}

    <div class="flex w-full {isChorus ? 'items-center gap-x-2' : 'flex-col gap-y-1.5'}">
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
            class="group relative w-full cursor-pointer py-1.5 focus-visible:outline-none"
            onkeydown={handleKeydown}
            onmousedown={setProgress}
            onmousemove={handleMouseMove}
            onmouseenter={() => (isHovering = true)}
            onmouseleave={() => (isHovering = false)}
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
                segments={$nowPlaying.snip
                    ? [
                          {
                              start: $nowPlaying.snip?.start_time,
                              end: $nowPlaying.snip?.end_time,
                              color: snipColor
                          }
                      ]
                    : []}
                dividerColor={snipColor}
                value={currentPosition ?? 0}
                max={$nowPlaying.duration ?? 100}
                innerClass={fillClass}
                class="h-1 rounded-full {trackClass} transition-all group-hover:h-1.5 group-focus-visible:ring-2 group-focus-visible:ring-signal/60"
            />
        </div>

        {#if isChorus}
            <span class="min-w-8 font-mono text-[11px] {timeClass} tabular-nums">{total}</span>
        {:else}
            <div
                class="flex w-full items-center justify-between font-mono text-[10px] {timeClass} tabular-nums"
            >
                <span>{current}</span>
                <span>{total}</span>
            </div>
        {/if}
    </div>
</div>
