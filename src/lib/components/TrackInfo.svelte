<script lang="ts">
    import { nowPlaying } from '$lib/stores/now-playing'
    import ScrollingText from '$lib/components/ScrollingText.svelte'

    let { isPopup = false } = $props()
</script>

<div class="flex w-full flex-col text-[var(--text)] {isPopup ? 'h-16 justify-center gap-y-2' : ''}">
    <ScrollingText
        text={$nowPlaying.title! ?? 'UP NEXT'}
        className="text-sm font-semibold text-[var(--text)] brightness-75"
    />
    <ScrollingText
        text={$nowPlaying.artist! ?? 'DJ X'}
        className="text-sm font-semibold text-[var(--text)] brightness-75"
    />
</div>
