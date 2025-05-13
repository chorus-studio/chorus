<script lang="ts">
    import { effectsStore } from '$lib/stores/effects'
    import { configStore } from '$lib/stores/config'
    import AudioEffectInputs from '$lib/components/AudioEffectInputs.svelte'

    import { customPresets, spotifyPresets } from '$lib/audio-effects/equalizer/presets'

    let { pip = false }: { pip?: boolean } = $props()

    const customOptions = $derived(
        ['none', ...customPresets].reduce(
            (acc, preset) => {
                if ($configStore.fx_eq_presets.custom_eq_presets.includes(preset)) {
                    return acc
                }
                acc.push({ label: preset, value: preset })
                return acc
            },
            [] as Array<{ label: string; value: string }>
        )
    )

    const spotifyOptions = $derived(
        ['none', ...spotifyPresets].reduce(
            (acc, preset) => {
                if ($configStore.fx_eq_presets.spotify_eq_presets.includes(preset)) {
                    return acc
                }
                acc.push({ label: preset, value: preset })
                return acc
            },
            [] as Array<{ label: string; value: string }>
        )
    )

    const topSelected = $derived(spotifyPresets.includes($effectsStore.equalizer))
</script>

<AudioEffectInputs
    {pip}
    type="equalizer"
    {topSelected}
    topOptions={spotifyOptions}
    topLabel="spotify eq presets"
    bottomLabel="custom eq presets"
    bottomOptions={customOptions}
/>
