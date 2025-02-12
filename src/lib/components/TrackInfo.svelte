<script lang="ts">
    import { nowPlaying } from '$lib/stores/now-playing'
</script>

<div class="flex flex-col gap-0.5">
    <p class="text-base w-[312px] font-bold text-primary">{$nowPlaying.title}</p>
    <p class="text-base w-[312px] text-gray-600 font-semibold">{$nowPlaying.artist}</p>
</div>