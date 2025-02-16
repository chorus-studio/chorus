<script lang="ts">
    import { nowPlaying } from '$lib/stores/now-playing'
    import ScrollingText from '$lib/components/ScrollingText.svelte'

    let { isPopup = false } = $props()
</script>

<div class="flex flex-col text-[var(--text)] {isPopup ? 'h-16 gap-y-2 justify-center' : ''}">
    <ScrollingText text={$nowPlaying.title!} className="text-sm font-semibold text-opacity-75" />
    <ScrollingText text={$nowPlaying.artist!} className="text-sm font-semibold text-opacity-75" />
</div>