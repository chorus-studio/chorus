<script lang="ts">
    import { effectsStore } from '$lib/stores/audio-effects'
    import AudioEffectInputs from '$lib/components/AudioEffectInputs.svelte'

    import { roomPresets, convolverPresets } from '$lib/audio-effects/reverb/presets'

    let { pip = false }: { pip?: boolean } = $props()

    const roomOptions = $derived(
        ['none', ...roomPresets].map((preset) => ({ label: preset, value: preset }))
    )
    const convolverOptions = $derived(
        ['none', ...convolverPresets].map((preset) => ({
            label: preset,
            value: preset
        }))
    )
    const topSelected = $derived(roomPresets.includes($effectsStore.reverb))
</script>

<AudioEffectInputs
    {pip}
    type="reverb"
    {topSelected}
    topOptions={roomOptions}
    topLabel="room-sized reverb"
    bottomLabel="impulse reverb"
    bottomOptions={convolverOptions}
/>
