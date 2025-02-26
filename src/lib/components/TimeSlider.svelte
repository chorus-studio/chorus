<script lang="ts">
    import { snipStore } from '$lib/stores/snip'
    import { nowPlaying } from '$lib/stores/now-playing'

    import { secondsToTime } from '$lib/utils/time'
    import { Slider } from '$lib/components/ui/slider'

    function handleValueChange(value: number[]) {
        const [start_time, end_time] = value
        if (!$snipStore) return

        if (start_time !== $snipStore.start_time) {
            snipStore.set({ ...$snipStore, start_time, last_updated: 'start' })
            nowPlaying.setCurrentTime(start_time)
        }
        if (end_time !== $snipStore.end_time) {
            snipStore.set({ ...$snipStore, end_time, last_updated: 'end' })
            nowPlaying.setCurrentTime(end_time)
        }
    }
</script>

{#if $snipStore}
    <div class="flex w-full items-center justify-between gap-x-4">
        <p class="text-xs text-muted-foreground">
            {secondsToTime($snipStore?.start_time)}
        </p>
        <Slider
            onValueCommit={(value) => handleValueChange(value)}
            type="multiple"
            value={[$snipStore?.start_time, $snipStore?.end_time]}
            min={0}
            max={$nowPlaying.duration}
            step={1}
            class="h-6 w-full"
        />
        <p class="text-xs text-muted-foreground">
            {secondsToTime($snipStore?.end_time)}
        </p>
    </div>
{/if}
