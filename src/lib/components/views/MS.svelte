<script lang="ts">
    import { effectsStore } from '$lib/stores/effects'
    import { configStore } from '$lib/stores/config'
    import EffectStatus from '$lib/components/EffectStatus.svelte'
    import AudioEffectInputs from '$lib/components/AudioEffectInputs.svelte'

    import { basicPresets, advancedPresets } from '$lib/audio-effects/ms-processor/presets'

    let { pip = false }: { pip?: boolean } = $props()

    const basicOptions = $derived(
        ['none', ...basicPresets].reduce(
            (acc, preset) => {
                if ($configStore.fx_eq_presets.ms_processor_presets?.includes(preset)) {
                    return acc
                }
                acc.push({ label: preset, value: preset })
                return acc
            },
            [] as Array<{ label: string; value: string }>
        )
    )

    const advancedOptions = $derived(
        ['none', ...advancedPresets].reduce(
            (acc, preset) => {
                if ($configStore.fx_eq_presets.ms_processor_presets?.includes(preset)) {
                    return acc
                }
                acc.push({ label: preset, value: preset })
                return acc
            },
            [] as Array<{ label: string; value: string }>
        )
    )

    const topSelected = $derived(basicPresets.includes($effectsStore.msProcessor))
</script>

<div class="flex h-full flex-col gap-y-2.5">
    <EffectStatus name="Stereo" value={$effectsStore.msProcessor} />

    <AudioEffectInputs
        {pip}
        type="msProcessor"
        {topSelected}
        topOptions={basicOptions}
        topLabel="Channel mode"
        topHint="Left only · right only · mono · swap · mid · side"
        bottomLabel="Stereo processing"
        bottomHint="Width, balance and mid/side gain presets"
        bottomOptions={advancedOptions}
        note="Best heard on headphones."
    />
</div>
