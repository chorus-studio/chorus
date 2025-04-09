<script lang="ts">
    import { nowPlaying } from '$lib/stores/now-playing'

    $: source = $nowPlaying.cover ?? ''
</script>

<div class="flex aspect-square size-16 items-center justify-center bg-[var(--bg)]">
    <img src={source} loading="eager" alt="Cover Album Art" class="aspect-square size-16" />
</div>
