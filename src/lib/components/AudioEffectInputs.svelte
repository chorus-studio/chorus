<script lang="ts">
    import { Label } from '$lib/components/ui/label'
    import { Separator } from '$lib/components/ui/separator'
    import { effectsStore } from '$lib/stores/audio-effects'

    import type { Selection } from '$lib/types'
    import Selector from '$lib/components/Selector.svelte'

    let {
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
    } = $props()

    async function handleUpdateEffect(value: string) {
        await effectsStore.updateEffect({ key: type, value })
        document.dispatchEvent(
            new CustomEvent('FROM_CHORUS_EXTENSION', {
                detail: {
                    type: 'audio_effect',
                    data: {
                        [type]: value
                    }
                }
            })
        )
    }

    let selectedLabel = type === 'reverb' ? 'active reverb preset' : 'active equalizer preset'
</script>

<div class="flex w-full flex-col gap-y-2.5">
    <div class="flex w-full flex-col gap-x-1 gap-y-1">
        <div class="flex w-full items-center justify-between">
            <Label for="room" class="text-base text-gray-400">{topLabel}</Label>
            <Selector
                selected={topSelected ? $effectsStore[type] : 'none'}
                label={topLabel}
                options={topOptions}
                onValueChange={handleUpdateEffect}
            />
        </div>

        <div class="flex w-full items-center justify-between">
            <Label for="room" class="text-base text-gray-400">{bottomLabel}</Label>
            <Selector
                selected={!topSelected ? $effectsStore[type] : 'none'}
                label={bottomLabel}
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
