<script lang="ts">
    import { configStore } from '$lib/stores/config'
    import PresetSelector from './PresetSelector.svelte'

    import {
        spotifyPresets,
        customPresets as eqPresets
    } from '$lib/audio-effects/equalizer/presets'
    import {
        roomPresets,
        impulsePresets,
        customPresets as reverbPresets
    } from '$lib/audio-effects/reverb/presets'

    type PresetConfig = {
        title: string
        key: keyof typeof $configStore.fx_eq_presets
        availablePresets: string[]
    }

    const presetConfigs: PresetConfig[] = [
        {
            title: 'Spotify EQ',
            key: 'spotify_eq_presets',
            availablePresets: spotifyPresets
        },
        {
            title: 'Custom EQ',
            key: 'custom_eq_presets', 
            availablePresets: eqPresets
        },
        {
            title: 'Room Reverb',
            key: 'room_reverb_presets',
            availablePresets: roomPresets
        },
        {
            title: 'Custom Reverb',
            key: 'custom_reverb_presets',
            availablePresets: [...impulsePresets, ...reverbPresets]
        }
    ]

    // Reactive computed values for filtered presets
    $: filteredPresets = presetConfigs.reduce((acc, config) => {
        const selectedPresets = $configStore.fx_eq_presets[config.key]
        acc[config.key] = config.availablePresets.filter(
            preset => !selectedPresets.includes(preset)
        )
        return acc
    }, {} as Record<string, string[]>)

    async function handleAddPreset(preset: string, key: string): Promise<void> {
        const presetKey = key as keyof typeof $configStore.fx_eq_presets
        
        await configStore.updateConfig({
            fx_eq_presets: {
                ...$configStore.fx_eq_presets,
                [presetKey]: [
                    ...$configStore.fx_eq_presets[presetKey],
                    preset
                ]
            }
        })
    }

    async function handleUndo(key: string): Promise<void> {
        const presetKey = key as keyof typeof $configStore.fx_eq_presets
        const currentPresets = $configStore.fx_eq_presets[presetKey]
        
        if (currentPresets.length === 0) return
        
        await configStore.updateConfig({
            fx_eq_presets: {
                ...$configStore.fx_eq_presets,
                [presetKey]: currentPresets.slice(0, -1)
            }
        })
    }

    async function handleResetAll(key: string): Promise<void> {
        const presetKey = key as keyof typeof $configStore.fx_eq_presets
        
        await configStore.updateConfig({
            fx_eq_presets: {
                ...$configStore.fx_eq_presets,
                [presetKey]: []
            }
        })
    }
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    {#each presetConfigs as config (config.key)}
        <PresetSelector
            title={config.title}
            presetKey={config.key}
            availablePresets={filteredPresets[config.key] || []}
            selectedPresets={$configStore.fx_eq_presets[config.key]}
            onAdd={handleAddPreset}
            onUndo={handleUndo}
            onResetAll={handleResetAll}
        />
    {/each}
</div>