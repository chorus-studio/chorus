<script lang="ts">
    import { effectsStore } from '$lib/stores/effects'
    import AudioEffectInputs from '$lib/components/AudioEffectInputs.svelte'

    import { roomPresets, customPresets } from '$lib/audio-effects/reverb/presets'

    let { pip = false }: { pip?: boolean } = $props()

    const roomOptions = $derived(
        ['none', ...roomPresets].map((preset) => ({ label: preset, value: preset }))
    )
    const customOptions = $derived(
        ['none', ...customPresets].map((preset) => ({
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
    bottomLabel="custom reverb"
    bottomOptions={customOptions}
/>
