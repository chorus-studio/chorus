<script lang="ts">
    import { effectsStore } from '$lib/stores/effects'
    import { configStore } from '$lib/stores/config'
    import AudioEffectInputs from '$lib/components/AudioEffectInputs.svelte'
    import RecentEffects from '$lib/components/RecentEffects.svelte'

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
    const allowed = $derived(
        [...roomOptions, ...customOptions].map((o) => o.value).filter((v) => v !== 'none')
    )
</script>

<AudioEffectInputs
    {pip}
    type="reverb"
    {topSelected}
    topOptions={roomOptions}
    topLabel="Room"
    topHint="Spaces from a small room to a cathedral"
    bottomLabel="Custom & impulse"
    bottomHint="Character presets; impulses aren't tunable"
    bottomOptions={customOptions}
>
    <RecentEffects kind="reverb" {allowed} />
</AudioEffectInputs>
