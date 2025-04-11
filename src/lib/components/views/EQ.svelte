<script lang="ts">
    import { effectsStore } from '$lib/stores/audio-effects'
    import AudioEffectInputs from '$lib/components/AudioEffectInputs.svelte'

    import { customPresets, spotifyPresets } from '$lib/audio-effects/equalizer/presets'

    let { pip = false }: { pip?: boolean } = $props()

    const customOptions = $derived(
        ['none', ...customPresets].map((preset) => ({
            label: preset,
            value: preset
        }))
    )
    const spotifyOptions = $derived(
        ['none', ...spotifyPresets].map((preset) => ({
            label: preset,
            value: preset
        }))
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
