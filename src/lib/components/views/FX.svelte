<script lang="ts">
    import { effectsStore } from '$lib/stores/audio-effects'
    import { roomPresets, convolverPresets } from '$lib/audio-effects/reverb/presets'
    import AudioEffectInputs from '$lib/components/AudioEffectInputs.svelte'

    $: roomOptions = ['none', ...roomPresets].map((preset) => ({ label: preset, value: preset }))
    $: convolverOptions = ['none', ...convolverPresets].map((preset) => ({
        label: preset,
        value: preset
    }))
    $: topSelected = roomPresets.includes($effectsStore.reverb)
</script>

<AudioEffectInputs
    type="reverb"
    {topSelected}
    topOptions={roomOptions}
    topLabel="room-sized reverb"
    bottomLabel="impulse reverb"
    bottomOptions={convolverOptions}
/>
