<script lang="ts">
    import { nowPlaying } from '$lib/stores/now-playing'

    $: source = $nowPlaying.cover ?? ''
</script>

<div class="flex items-center justify-center h-16 w-16 bg-[var(--bg)]">
    <img src={source} loading="eager" alt="Cover Album Art" class="w-full aspect-auto h-full" />
</div>
