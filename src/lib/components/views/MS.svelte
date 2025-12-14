<script lang="ts">
    import { effectsStore } from '$lib/stores/effects'
    import { configStore } from '$lib/stores/config'
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

<AudioEffectInputs
    {pip}
    type="msProcessor"
    {topSelected}
    topOptions={basicOptions}
    topLabel="channel modes"
    bottomLabel="stereo processing"
    bottomOptions={advancedOptions}
/>
