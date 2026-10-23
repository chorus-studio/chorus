<script lang="ts">
    import { configStore, type AudioPreset } from '$lib/stores/config'
    import {
        spotifyPresets,
        customPresets as eqPresets
    } from '$lib/audio-effects/equalizer/presets'
    import {
        roomPresets,
        impulsePresets,
        customPresets as reverbPresets
    } from '$lib/audio-effects/reverb/presets'

    import { CustomSelect } from '$lib/components/ui/custom-select'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'

    let { type, preset }: { type: 'reverb' | 'equalizer'; preset: AudioPreset } = $props()

    let currentPreset = $state(preset)

    $effect(() => {
        const updatedPreset = $configStore.audio_presets.find(
            (p) => p.id === preset.id
        ) as AudioPreset
        if (!updatedPreset) return
        currentPreset = updatedPreset
    })

    const filteredPresets = $derived({
        spotify_eq: spotifyPresets.filter(
            (preset) => !$configStore.fx_eq_presets.spotify_eq_presets.includes(preset)
        ),
        custom_eq: eqPresets.filter(
            (preset) => !$configStore.fx_eq_presets.custom_eq_presets.includes(preset)
        ),
        room_reverb: roomPresets.filter(
            (preset) => !$configStore.fx_eq_presets.room_reverb_presets.includes(preset)
        ),
        custom_reverb: [...impulsePresets, ...reverbPresets].filter(
            (preset) => !$configStore.fx_eq_presets.custom_reverb_presets.includes(preset)
        )
    })

    let custom = $state(
        type === 'reverb'
            ? [...impulsePresets, ...reverbPresets].includes(preset.effect.reverb)
            : eqPresets.includes(preset.effect.equalizer)
    )

    const listKey = $derived(
        type === 'reverb'
            ? custom
                ? 'custom_reverb'
                : 'room_reverb'
            : custom
              ? 'custom_eq'
              : 'spotify_eq'
    )

    const options = $derived(
        ['none', ...filteredPresets[listKey as keyof typeof filteredPresets]].map((preset) => ({
            label: preset,
            value: preset
        }))
    )

    async function handleUpdateEffect(value: string) {
        const updatedPreset = { ...currentPreset, effect: { ...currentPreset.effect } }
        if (type === 'reverb') {
            updatedPreset.effect.reverb = value
        } else {
            updatedPreset.effect.equalizer = value
        }

        await configStore.updateConfig({
            audio_presets: $configStore.audio_presets.map((p) =>
                p.id === currentPreset.id ? updatedPreset : p
            )
        })

        configStore.updateAudioPreset({ preset: updatedPreset, type: 'effect' })
    }

    async function handleListChange(value: string) {
        custom = value === 'custom'
        const updatedPreset = { ...currentPreset, effect: { ...currentPreset.effect } }
        if (type === 'reverb') {
            updatedPreset.effect.reverb = 'none'
        } else {
            updatedPreset.effect.equalizer = 'none'
        }

        await configStore.updateConfig({
            audio_presets: $configStore.audio_presets.map((p) =>
                p.id === currentPreset.id ? updatedPreset : p
            )
        })

        if (updatedPreset.active)
            configStore.updateAudioPreset({ preset: updatedPreset, type: 'effect' })
    }

    const selected = $derived(
        type === 'reverb' ? currentPreset.effect.reverb : currentPreset.effect.equalizer
    )
    const listOptions = $derived(
        type === 'reverb'
            ? [
                  { label: 'Room', value: 'room' },
                  { label: 'Custom', value: 'custom' }
              ]
            : [
                  { label: 'Spotify', value: 'spotify' },
                  { label: 'Custom', value: 'custom' }
              ]
    )
</script>

<div class="flex h-[34px] items-center justify-between gap-x-3">
    <span class="w-14 shrink-0 text-xs text-ink-fg-2">{type === 'reverb' ? 'Reverb' : 'EQ'}</span>
    <div class="flex min-w-0 flex-1 items-center justify-end gap-x-2">
        <SegmentedControl
            size="xs"
            ariaLabel={`${type} list`}
            value={custom ? 'custom' : listOptions[0].value}
            onValueChange={handleListChange}
            options={listOptions}
        />
        <CustomSelect
            size="md"
            key={`${preset.id}-${type}`}
            {selected}
            {options}
            onValueChange={handleUpdateEffect}
            class="w-[150px] min-w-0"
        />
    </div>
</div>
