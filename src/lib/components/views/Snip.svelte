<script lang="ts">
    import { snipStore } from '$lib/stores/snip'
    import { nowPlaying } from '$lib/stores/now-playing'
    import TimeSlider from '$lib/components/TimeSlider.svelte'
    import SnipInputs from '$lib/components/SnipInputs.svelte'

    let { pip = false }: { pip?: boolean } = $props()

    function setSnip() {
        snipStore.set({
            is_shared: false,
            last_updated: 'start',
            start_time: $nowPlaying?.snip?.start_time ?? 0,
            end_time: $nowPlaying?.snip?.end_time ?? $nowPlaying.duration
        })
    }

    onMount(setSnip)
</script>

<div class="flex h-full w-full flex-col gap-x-1 space-y-2.5">
    <TimeSlider {pip} />
    <SnipInputs />
</div>
