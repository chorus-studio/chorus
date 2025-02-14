<script lang="ts">
    import { nowPlaying } from '$lib/stores/now-playing'
</script>

<div class="flex flex-col w-full mb-1">
    <p class="text-base font-bold text-primary">{$nowPlaying.title}</p>
    <p class="text-base text-zinc-400 font-semibold">{$nowPlaying.artist}</p>
</div>