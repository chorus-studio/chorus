<script lang="ts">
    import { Label } from '$lib/components/ui/label'
    import { Separator } from '$lib/components/ui/separator'
    import { effectsStore } from '$lib/stores/audio-effects'

    import type { Selection } from '$lib/types'
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

    let selectedLabel = type === 'reverb' ? 'active reverb preset' : 'active equalizer preset'
</script>

<div class="flex w-full flex-col justify-between space-y-2.5">
    <div class="flex w-full flex-col gap-x-1 gap-y-1">
        <div class="flex w-full items-center justify-between">
            <Label for="room" class="w-full text-base text-gray-400">{topLabel}</Label>
            <CustomSelect
                selected={topSelected ? $effectsStore[type] : 'none'}
                options={topOptions}
                onValueChange={handleUpdateEffect}
            />
        </div>

        <div class="flex w-full items-center justify-between">
            <Label for="room" class="w-full text-base text-gray-400">{bottomLabel}</Label>
            <CustomSelect
                selected={!topSelected ? $effectsStore[type] : 'none'}
                options={bottomOptions}
                onValueChange={handleUpdateEffect}
            />
        </div>
    </div>

    <Separator class="h-0.5 w-full bg-white" />
    <p class="pr-[0.125rem inline-flex w-full justify-between text-base text-gray-400">
        {selectedLabel} <span class="mr-5 text-base text-white">{$effectsStore[type]}</span>
    </p>
</div>
