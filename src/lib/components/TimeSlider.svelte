<script lang="ts">
    import { snipStore } from '$lib/stores/snip'
    import { secondsToTime } from '$lib/utils/time'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { Slider } from '$lib/components/ui/slider'

    function handleValueChange(value: number[]) {
        const [start_time, end_time] = value
        if (!start_time || !end_time || !$snipStore) return

        snipStore.set({ ...$snipStore, start_time, end_time })
    }
</script>

{#if $snipStore}
    <div class="flex w-full items-center justify-between gap-x-4">
        <p class="text-xs text-muted-foreground">
            {secondsToTime($snipStore?.start_time)}
        </p>
        <Slider
            onValueChange={handleValueChange}
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
