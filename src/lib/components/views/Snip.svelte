<script lang="ts">
    import { snipStore } from '$lib/stores/snip'
    import { nowPlaying } from '$lib/stores/now-playing'
    import TimeSlider from '$lib/components/TimeSlider.svelte'
    import SnipInputs from '$lib/components/SnipInputs.svelte'

    function setSnip() {
        snipStore.set({
            is_shared: false,
            last_updated: 'start',
            end_time: $nowPlaying.end_time,
            start_time: $nowPlaying.start_time
        })
    }

    onMount(() => {
        setSnip()
        return () => snipStore.reset()
    })
</script>

{#if $snipStore}
    <div class="flex w-full flex-col gap-x-1 gap-y-3">
        <TimeSlider />
        <SnipInputs />
    </div>
{/if}
