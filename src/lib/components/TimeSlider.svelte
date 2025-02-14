<script lang="ts">
    import { writable } from 'svelte/store'
    import { secondsToTime } from '$lib/utils/time'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { Slider } from '$lib/components/ui/slider'

    let value = writable([$nowPlaying.current ?? 0, $nowPlaying.duration ?? 0])

    $: start = secondsToTime($value.at(0) ?? 0)
    $: end = secondsToTime($value.at(1) ?? 0)
</script>

<div class="flex items-center justify-between gap-x-4 w-full">
    <p class="text-xs text-muted-foreground">{start}</p>
    <Slider
        type="multiple" bind:value={$value} min={0} max={$nowPlaying.duration}  step={1}
        class="h-6 w-full"
    />
    <p class="text-xs text-muted-foreground">{end}</p>
</div>
