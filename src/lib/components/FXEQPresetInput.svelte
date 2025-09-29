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

    import { Label } from '$lib/components/ui/label'
    import { Switch } from '$lib/components/ui/switch'
    import { Button } from '$lib/components/ui/button'
    import RotateCcw from '@lucide/svelte/icons/rotate-ccw'
    import { CustomSelect } from '$lib/components/ui/custom-select'

    let { type, preset }: { type: 'reverb' | 'equalizer'; preset: AudioPreset } = $props()

    let currentPreset = $state(preset)

    $effect(() => {
        const updatedPreset = $configStore.audio_presets.find(
            (p) => p.id === preset.id
        ) as AudioPreset
        if (!updatedPreset) return
        currentPreset = updatedPreset
    })

    let filteredPresets = $state({
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
            ? filteredPresets.custom_reverb.includes(preset.effect.reverb)
            : filteredPresets.custom_eq.includes(preset.effect.equalizer)
    )

    const typeMap = $derived({
        reverb: custom ? 'custom_reverb' : 'room_reverb',
        equalizer: custom ? 'custom_eq' : 'spotify_eq'
    })

    let options = $derived(
        ['none', ...filteredPresets[typeMap[type] as keyof typeof filteredPresets]].map(
            (preset) => ({
                label: preset,
                value: preset
            })
        )
    )

    async function handleUpdateEffect(value: string) {
        const updatedPreset = { ...currentPreset }
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

    async function handleCustomToggle(checked: boolean) {
        custom = checked
        const updatedPreset = { ...currentPreset }
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

        if (updatedPreset.active) configStore.updateAudioPreset({ preset: updatedPreset, type: 'effect' })
    }

    let label = $derived(custom ? 'custom' : type === 'reverb' ? 'room' : 'spotify')
    let selected = $derived(
        type === 'reverb' ? currentPreset.effect.reverb : currentPreset.effect.equalizer
    )
</script>

<div class="flex flex-col gap-y-2">
    <div class="flex w-full items-center justify-between rounded-md bg-primary-foreground p-4">
        <h2 class="text-base capitalize">{type}</h2>
        <div class="flex w-full justify-end gap-4">
            <Label for={`${type}-custom`} class="text-sm">custom fx</Label>
            <Switch checked={custom} onCheckedChange={handleCustomToggle} />
        </div>
    </div>
    <div class="flex w-full justify-between gap-2 rounded-md bg-primary-foreground p-4">
        <Label for={`${type}-custom`} class="text-base">{label}</Label>

        <div class="flex items-center gap-x-3">
            <CustomSelect {selected} {options} onValueChange={handleUpdateEffect} />
            <Button
                size="icon"
                variant="ghost"
                class="size-7 [&:svg]:size-4"
                onclick={() => handleUpdateEffect('none')}
            >
                <RotateCcw class="stroke-white" />
            </Button>
        </div>
    </div>
</div>
