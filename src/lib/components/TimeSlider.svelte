<script lang="ts">
    import { snipStore } from '$lib/stores/snip'
    import { nowPlaying } from '$lib/stores/now-playing'

    import { secondsToTime } from '$lib/utils/time'
    import { CustomSlider } from '$lib/components/ui/custom-slider'

    // Debounce timer for setCurrentTime calls
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    // Debounced function to update the current time
    function debouncedSetCurrentTime(time: number) {
        nowPlaying.setCurrentTime(time)
    }

    // Helper function to update a specific time value
    function updateTimeValue({
        value,
        last_updated
    }: {
        value: number
        last_updated: 'start' | 'end'
    }) {
        const key = last_updated === 'start' ? 'start_time' : 'end_time'
        const currentValue = $snipStore![key]
        if (value == currentValue) return

        snipStore.set({ ...$snipStore!, [key]: value, last_updated: last_updated })

        // Debounce the setCurrentTime call
        if (debounceTimer) clearTimeout(debounceTimer)

        debounceTimer = setTimeout(() => {
            debouncedSetCurrentTime(value)
            debounceTimer = null
        }, 150)
    }

    function handleValueChange(value: number[]) {
        const [start_time, end_time] = value
        if (!$snipStore) return

        // Update start time if changed
        updateTimeValue({ value: start_time, last_updated: 'start' })

        // Update end time if changed
        updateTimeValue({ value: end_time, last_updated: 'end' })
    }
</script>

{#if $snipStore}
    <div class="flex w-full items-center justify-between gap-x-4">
        <p class="w-full max-w-6 text-xs text-muted-foreground">
            {secondsToTime($snipStore?.start_time)}
        </p>
        <CustomSlider
            onValueChange={(value) => handleValueChange(value as number[])}
            type="multiple"
            value={[$snipStore?.start_time, $snipStore?.end_time]}
            min={0}
            max={$nowPlaying.duration}
            step={1}
        />
        <p class="w-full max-w-6 text-xs text-muted-foreground">
            {secondsToTime($snipStore?.end_time)}
        </p>
    </div>
{/if}
