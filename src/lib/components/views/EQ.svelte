<script lang="ts">
    import { customPresets, spotifyPresets } from '$lib/audio-effects/equalizer/presets'

    import AudioEffectInputs from '$lib/components/AudioEffectInputs.svelte'
    $: customOptions = ['none', ...customPresets].map(preset => ({ label: preset, value: preset }))
    $: spotifyOptions = ['none',...spotifyPresets].map(preset => ({ label: preset, value: preset }))
</script>

<AudioEffectInputs
    selectedValue="none"
    selectedLabel="active eq preset"
    topOptions={spotifyOptions}
    topLabel="spotify eq presets"
    bottomLabel="custom eq presets"
    bottomOptions={customOptions}
/>
