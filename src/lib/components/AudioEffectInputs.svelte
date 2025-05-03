<script lang="ts">
    import { effectsStore } from '$lib/stores/effects'

    import type { Selection } from '$lib/types'
    import { Label } from '$lib/components/ui/label'
    import { Button } from '$lib/components/ui/button'
    import RotateCcw from '@lucide/svelte/icons/rotate-ccw'
    import { Separator } from '$lib/components/ui/separator'
    import { CustomSelect } from '$lib/components/ui/custom-select'

    let {
        pip = false,
        type,
        topLabel,
        topSelected,
        bottomLabel,
        topOptions,
        bottomOptions
    }: {
        type: 'reverb' | 'equalizer'
        topSelected: boolean
        topLabel: string
        bottomLabel: string
        topOptions: Selection[]
        bottomOptions: Selection[]
        pip?: boolean
    } = $props()

    async function handleUpdateEffect(value: string) {
        await effectsStore.updateEffect({ key: type, value })
    }
</script>

<div class="flex w-full flex-col gap-y-2.5">
    <h2 class="text-base leading-none text-gray-400">{type}</h2>

    <div class="flex w-full flex-col gap-y-1.5">
        <div class="flex flex-col">
            <Label for="room" class="w-full text-sm text-gray-400">{topLabel}</Label>
            <CustomSelect
                {pip}
                size="md"
                key={`${type}-top`}
                selected={topSelected ? $effectsStore[type] : 'none'}
                options={topOptions}
                onValueChange={handleUpdateEffect}
            />
        </div>

        <div class="flex flex-col">
            <Label for="room" class="w-full text-sm text-gray-400">{bottomLabel}</Label>
            <CustomSelect
                {pip}
                size="md"
                key={`${type}-bottom`}
                selected={!topSelected ? $effectsStore[type] : 'none'}
                options={bottomOptions}
                onValueChange={handleUpdateEffect}
            />
        </div>
    </div>

    <Separator class="mt-1 h-0.5 w-full" />

    <div class="flex w-full justify-between">
        <Button
            size="icon"
            variant="ghost"
            class="size-5 w-7 rounded-none [&_svg]:size-4"
            onclick={() => handleUpdateEffect('none')}
        >
            <RotateCcw class="size-4" />
        </Button>
        <p class="inline-flex w-full justify-end text-sm text-white">
            {$effectsStore[type]}
        </p>
    </div>
</div>
