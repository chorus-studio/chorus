<script lang="ts">
    import { Label } from '$lib/components/ui/label'
    import { Separator } from '$lib/components/ui/separator'

    import type { Selection } from '$lib/types'
    import Selector from '$lib/components/Selector.svelte'

    let {
        topLabel,
        bottomLabel,
        topOptions,
        bottomOptions,
        selectedLabel,
        selectedValue
    }: {
        selectedLabel: string,
        selectedValue: string,
        topLabel: string, bottomLabel: string, topOptions: Selection[], bottomOptions: Selection[] } = $props()
</script>


<div class="flex flex-col gap-y-2.5 w-full">
    <div class="flex flex-col gap-y-1 w-full gap-x-1">
        <div class="flex items-center justify-between w-full">
            <Label for="room" class="text-base text-gray-400">{topLabel}</Label>
            <Selector
                selected="none"
                label={topLabel}
                options={topOptions}
            />
        </div>

        <div class="flex items-center justify-between w-full">
            <Label for="room" class="text-base text-gray-400">{bottomLabel}</Label>
            <Selector
                selected="none"
                label={bottomLabel}
                options={bottomOptions}
            />
        </div>
    </div>

    <Separator  class="w-full h-0.5 bg-white"/>
    <p class="inline-flex justify-between w-full pr-[0.125rem text-base text-gray-400">
        {selectedLabel} <span class="mr-5 text-white text-base">{selectedValue}</span>
    </p>
</div>