<script lang="ts">
    import { mediaStore } from '$lib/stores/media'
    import { formatTime } from '$lib/utils/formatters'
    import { Progress } from '$lib/components/ui/progress'

    export let sendMessage: (message: { action: string; data?: any }) => void

    let hoverPosition = 0
    let isHovering = false
    let sliderRef: HTMLDivElement

    function handleMouseMove(event: MouseEvent) {
        if (!sliderRef) return

        const rect = sliderRef.getBoundingClientRect()
        const percentage = (event.clientX - rect.left) / rect.width
        const seconds = Math.round(percentage * $mediaStore.duration)
        hoverPosition = Math.max(0, Math.min(seconds, $mediaStore.duration))
    }

    function setProgress() {
        sendMessage({ action: 'ARIA_SEEK_POSITION', data: { value: hoverPosition } })
    }

    $: currentPosition = Math.round($mediaStore.position)
</script>

{#if $mediaStore.duration >= 0}
    <div class="relative -mt-1 w-full flex-col items-center justify-between space-y-2">
        <div
            role="slider"
            tabindex={0}
            bind:this={sliderRef}
            aria-label="Time slider"
            class="relative w-full py-0.5"
            aria-valuenow={currentPosition}
            on:click={setProgress}
            on:keydown={setProgress}
            on:mousedown={setProgress}
            on:mousemove={handleMouseMove}
            on:mouseenter={() => (isHovering = true)}
            on:mouseleave={() => (isHovering = false)}
        >
            {#if isHovering}
                <div
                    class="absolute bottom-full mb-1 -translate-x-1/2 transform rounded border bg-background px-2 py-1 text-xs"
                    style="left: {(hoverPosition / $mediaStore.duration) * 100}%"
                >
                    {formatTime(hoverPosition)}
                </div>
            {/if}
            <Progress value={currentPosition} max={$mediaStore.duration} />
        </div>

        <div class="flex items-center justify-between gap-1">
            <span class="text-xs text-muted-foreground xs:text-sm sm:text-base">
                {formatTime($mediaStore.position)}
            </span>
            <span class="text-xs text-muted-foreground xs:text-sm sm:text-base">
                {formatTime($mediaStore.duration)}
            </span>
        </div>
    </div>
{/if}