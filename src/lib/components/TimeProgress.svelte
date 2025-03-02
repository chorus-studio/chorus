<script lang="ts">
    import { formatTime } from '$lib/utils/time'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { trackObserver } from '$lib/observers/track'
    import { Progress } from '$lib/components/ui/progress'

    export let port: chrome.runtime.Port | null
    export let id: string | undefined = 'popup-time-progress'

    let hoverPosition = 0
    let isHovering = false
    let sliderRef: HTMLDivElement

    function handleMouseMove(event: MouseEvent) {
        if (!sliderRef) return

        const rect = sliderRef.getBoundingClientRect()
        const percentage = (event.clientX - rect.left) / rect.width
        const seconds = Math.round(percentage * $nowPlaying.duration)
        hoverPosition = Math.max(0, Math.min(seconds, $nowPlaying.duration))
    }

    function setProgress() {
        if (port) {
            port.postMessage({ type: 'current_time', data: hoverPosition })
        } else {
            trackObserver?.updateCurrentTime(hoverPosition)
        }
    }

    $: isChorus = id === 'chorus-time-progress'
    $: progressColor = isChorus ? 'bg-white' : 'bg-[var(--text)]'
    $: textColor = isChorus ? 'text-white' : 'text-[var(--text)]'
    $: bgColor = isChorus ? 'bg-gray-600' : 'bg-[var(--bg)]'
    $: borderColor = isChorus ? 'border-[#7c7c7c]' : 'border-[var(--text)]'
    $: currentPosition = Math.round($nowPlaying.current ?? 0)
</script>

<div
    class="relative mt-1.5 flex h-full w-full {isChorus
        ? 'gap-x-3'
        : 'mt-3.5 flex-col'} items-center justify-between"
>
    {#if isChorus}
        <span class="min-w-7 text-xs font-semibold text-white">
            {$nowPlaying.current >= 0 ? formatTime($nowPlaying.current) : '-:--'}
        </span>
    {/if}

    <div
        role="slider"
        tabindex={0}
        bind:this={sliderRef}
        aria-label="Time slider"
        class="relative w-full"
        id={id ?? 'popup-time-progress'}
        aria-valuenow={currentPosition}
        onkeydown={setProgress}
        onmousedown={setProgress}
        onmousemove={handleMouseMove}
        onmouseenter={() => (isHovering = true)}
        onmouseleave={() => (isHovering = false)}
    >
        {#if isHovering}
            <div
                class="absolute bottom-full -translate-x-1/2 rounded-sm px-1"
                style="left: {(hoverPosition / $nowPlaying.duration) * 100}%"
            >
                <span class="text-xs font-semibold {textColor} brightness-75">
                    {formatTime(hoverPosition)}
                </span>
            </div>
        {/if}
        <Progress
            segments={$nowPlaying.snipped
                ? [
                      {
                          start: $nowPlaying.start_time,
                          end: $nowPlaying.end_time,
                          color: '#1ed760'
                      }
                  ]
                : []}
            value={currentPosition ?? 0}
            max={$nowPlaying.duration ?? 100}
            innerClass="{progressColor} {isChorus ? 'brightness-100' : 'brightness-75'}"
            class="h-1.5 {isChorus
                ? 'rounded-sm'
                : 'rounded-none'} border-[0.5px] {borderColor} {bgColor} {isChorus
                ? 'brightness-100'
                : 'brightness-75'}"
        />
    </div>

    {#if isChorus}
        <span class="min-w-7 text-xs font-semibold text-white">
            {$nowPlaying.duration ? formatTime($nowPlaying.duration) : '-:--'}
        </span>
    {:else}
        <div class="flex w-full items-center justify-between gap-1">
            <span class="text-xs font-semibold text-[var(--text)]">
                {$nowPlaying.current ? formatTime($nowPlaying.current) : '-:--'}
            </span>
            <span class="text-xs font-semibold text-[var(--text)]">
                {$nowPlaying.duration ? formatTime($nowPlaying.duration) : '-:--'}
            </span>
        </div>
    {/if}
</div>
