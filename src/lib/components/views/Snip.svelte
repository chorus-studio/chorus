<script lang="ts">
    import { onMount, untrack } from 'svelte'
    import { snipStore } from '$lib/stores/snip'
    import { nowPlaying } from '$lib/stores/now-playing'

    import SnipInputs from '$lib/components/SnipInputs.svelte'
    import SnipPlayback from '$lib/components/SnipPlayback.svelte'
    import SnipSections from '$lib/components/SnipSections.svelte'
    import SnipTimeline from '$lib/components/SnipTimeline.svelte'

    let { pip = false }: { pip?: boolean } = $props()
    void pip

    let seededTrack: string | null = null

    function seed() {
        const sameTrack = seededTrack === $nowPlaying.id
        seededTrack = $nowPlaying.id
        snipStore.seed($nowPlaying?.snip, $nowPlaying?.duration ?? 0, sameTrack)
    }

    onMount(seed)

    // Re-seed when the track changes (or its duration first becomes known) and
    // when the saved snip changes (save/delete here or from the popup window),
    // so the editor always mirrors the stored state. Go through deriveds rather
    // than reading `$nowPlaying` inside the effect: the playback observer
    // re-emits the whole store on every time tick (and right after each seek a
    // handle drag schedules), which would reset the bounds mid-drag. A derived
    // only notifies the effect when its own value changes; the saved snip is
    // compared as a string so a re-emitted equal object doesn't count.
    const trackId = $derived($nowPlaying.id)
    const trackDuration = $derived($nowPlaying.duration)
    const savedSnip = $derived(JSON.stringify($nowPlaying.snip ?? null))

    $effect(() => {
        void trackId
        void trackDuration
        void savedSnip
        untrack(seed)
    })
</script>

<!-- Four rows spread evenly over the tab: what the sections do and which one
     is selected, the timeline, the selected section's bounds, and playback. -->
<div class="flex h-full flex-col justify-between gap-y-2">
    <SnipSections />
    <SnipTimeline />
    <SnipInputs />
    <SnipPlayback />
</div>
