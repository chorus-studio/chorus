<script lang="ts">
    import { nowPlaying } from '$lib/stores/now-playing'
    import ScrollingText from '$lib/components/ScrollingText.svelte'

    let { isPopup = false } = $props()
</script>

<div class="flex flex-col text-[var(--text)] {isPopup ? 'h-16 justify-center gap-y-2' : ''}">
    <ScrollingText
        text={$nowPlaying.title!}
        className="text-sm font-semibold text-[var(--text)] brightness-50"
    />
    <ScrollingText
        text={$nowPlaying.artist!}
        className="text-sm font-semibold text-[var(--text)] brightness-50"
    />
</div>
