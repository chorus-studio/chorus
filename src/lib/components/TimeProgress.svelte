<script lang="ts">
    import { formatTime } from '$lib/utils/time'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { Progress } from '$lib/components/ui/progress'

    export let port: chrome.runtime.Port | null

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
        port?.postMessage({ type: 'current_time', data: { value: hoverPosition } })
    }

    $: currentPosition = Math.round($nowPlaying.current)
</script>

<div class="relative mt-3 h-full w-full flex-col items-center justify-between">
    <div
        role="slider"
        tabindex={0}
        bind:this={sliderRef}
        aria-label="Time slider"
        class="relative w-full"
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
                <span class="text-xs font-semibold text-[var(--text)] brightness-75">
                    {formatTime(hoverPosition)}
                </span>
            </div>
        {/if}
        <Progress
            value={currentPosition ?? 100}
            max={$nowPlaying.duration ?? 100}
            innerClass="bg-[var(--text)] brightness-75"
            class="h-1.5 rounded-none border-[0.5px] border-[var(--text)] bg-[var(--bg)] brightness-75"
        />
    </div>

    <div class="flex items-center justify-between gap-1">
        <span class="text-sm font-semibold text-[var(--text)] brightness-75">
            {$nowPlaying.current ? formatTime($nowPlaying.current) : '-:--'}
        </span>
        <span class="text-sm font-semibold text-[var(--text)] brightness-75">
            {$nowPlaying.duration ? formatTime($nowPlaying.duration) : '-:--'}
        </span>
    </div>
</div>
