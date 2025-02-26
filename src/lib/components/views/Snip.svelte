<script lang="ts">
    import { snipStore } from '$lib/stores/snip'
    import { dataStore } from '$lib/stores/data'
    import { nowPlaying } from '$lib/stores/now-playing'
    import TimeSlider from '$lib/components/TimeSlider.svelte'
    import SnipInputs from '$lib/components/SnipInputs.svelte'

    function setSnip() {
        const track = $nowPlaying?.track_id
            ? dataStore.collectionObject[$nowPlaying.track_id]
            : dataStore.collection.find((x) => x.song_id === $nowPlaying.id)

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
