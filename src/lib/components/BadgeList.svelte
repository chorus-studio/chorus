<script lang="ts">
    import { Badge } from '$lib/components/ui/badge'
    let { list, handleSelect } = $props()
</script>

<div class="flex w-full items-center justify-between gap-x-0.5">
    {#each list as item}
        <Badge
            class="cursor-pointer rounded-[2px] bg-slate-700 text-zinc-200 hover:bg-slate-600"
            onclick={() => handleSelect(item)}>{item}</Badge
        >
    {/each}
</div>
