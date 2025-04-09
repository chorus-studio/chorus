<script lang="ts">
    import { nowPlaying } from '$lib/stores/now-playing'
    import ScrollingText from '$lib/components/ScrollingText.svelte'

    let { isPopup = false } = $props()
    let textClass = isPopup ? 'text-[var(--text)]' : ''
</script>

<div class="flex w-full flex-col {textClass} {isPopup ? 'h-16 justify-center gap-y-2' : ''}">
    <ScrollingText
        text={$nowPlaying.title! ?? 'UP NEXT'}
        className="text-sm font-semibold {textClass} brightness-75"
    />
    <ScrollingText
        text={$nowPlaying.artist! ?? 'DJ X'}
        className="text-sm font-semibold {textClass} brightness-75"
    />
</div>
