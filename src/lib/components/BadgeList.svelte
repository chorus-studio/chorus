<script lang="ts">
    import Star from '@lucide/svelte/icons/star'
    import { Button } from '$lib/components/ui/button'
    import { Badge } from '$lib/components/ui/badge'
    import { type Frequent } from '$lib/stores/playback'

    let {
        list,
        handleSelect,
        handlePin = () => {}
    }: {
        list: number[] | Frequent[]
        handleSelect: (value: number) => void
        handlePin?: (value: Frequent) => void
    } = $props()

    let isFrequentList = $derived(list.length > 0 && typeof list[0] !== 'number')
</script>

<div
    class="flex w-full items-center justify-between {isFrequentList
        ? 'gap-x-1'
        : 'gap-x-0.5'} no-scrollbar overflow-x-auto"
>
    {#each list as item}
        <div class="relative flex items-center">
            {#if isFrequentList}
                <Button
                    size="icon"
                    class="h-5 w-4 rounded-none rounded-l-[2px] [&_svg]:size-3"
                    variant="default"
                    onclick={() => handlePin(item as Frequent)}
                >
                    <Star
                        class="size-3 stroke-red-500 {(item as Frequent).pinned
                            ? 'fill-red-500'
                            : 'fill-none'}"
                    />
                </Button>
            {/if}

            <Badge
                class="w-fit cursor-pointer {isFrequentList
                    ? 'rounded-l-none rounded-r-[2px]'
                    : 'rounded-[2px]'} bg-slate-700 text-zinc-200 hover:bg-slate-500"
                onclick={() =>
                    handleSelect(isFrequentList ? (item as Frequent).value : (item as number))}
            >
                {isFrequentList ? (item as Frequent).value : item}
            </Badge>
        </div>
    {/each}
</div>
