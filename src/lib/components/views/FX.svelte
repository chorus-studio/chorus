<script lang="ts">
    import { effectsStore } from '$lib/stores/effects'
    import { configStore } from '$lib/stores/config'
    import AudioEffectInputs from '$lib/components/AudioEffectInputs.svelte'

    import { roomPresets, customPresets, impulsePresets } from '$lib/audio-effects/reverb/presets'

    let { pip = false }: { pip?: boolean } = $props()

    const roomOptions = $derived(
        ['none', ...roomPresets].reduce(
            (acc, preset) => {
                if ($configStore.fx_eq_presets.room_reverb_presets.includes(preset)) {
                    return acc
                }
                acc.push({ label: preset, value: preset })
                return acc
            },
            [] as Array<{ label: string; value: string }>
        )
    )

    const customOptions = $derived(
        ['none', ...impulsePresets, ...customPresets].reduce(
            (acc, preset) => {
                if ($configStore.fx_eq_presets.custom_reverb_presets.includes(preset)) {
                    return acc
                }
                acc.push({ label: preset, value: preset })

                return acc
            },
            [] as Array<{ label: string; value: string }>
        )
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
