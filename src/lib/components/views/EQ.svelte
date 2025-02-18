<script lang="ts">
    import { effectsStore } from '$lib/stores/audio-effects'
    import { customPresets, spotifyPresets } from '$lib/audio-effects/equalizer/presets'

    import AudioEffectInputs from '$lib/components/AudioEffectInputs.svelte'

    $: customOptions = ['none', ...customPresets].map((preset) => ({
        label: preset,
        value: preset
    }))
    $: spotifyOptions = ['none', ...spotifyPresets].map((preset) => ({
        label: preset,
        value: preset
    }))
    $: topSelected = spotifyPresets.includes($effectsStore.equalizer)
</script>

<AudioEffectInputs
    type="equalizer"
    {topSelected}
    topOptions={spotifyOptions}
    topLabel="spotify eq presets"
    bottomLabel="custom eq presets"
    bottomOptions={customOptions}
/>
