<script lang="ts">
    import { roomPresets, convolverPresets } from '$lib/audio-effects/reverb/presets'

    import AudioEffectInputs from '$lib/components/AudioEffectInputs.svelte'
    $: roomOptions = ['none', ...roomPresets].map(preset => ({ label: preset, value: preset }))
    $: convolverOptions = ['none',...convolverPresets].map(preset => ({ label: preset, value: preset }))
</script>

<AudioEffectInputs
    selectedValue="none"
    selectedLabel="active reverb preset"
    topOptions={roomOptions}
    topLabel="room-sized reverb"
    bottomLabel="impulse reverb"
    bottomOptions={convolverOptions}
/>
