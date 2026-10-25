<script lang="ts">
    import FX from './FX.svelte'
    import ReverbControls from '$lib/components/ReverbControls.svelte'
    import EffectStatus from '$lib/components/EffectStatus.svelte'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'
    import { effectsStore } from '$lib/stores/effects'
    import { fxSubView } from '$lib/stores/effects-ui'
    import { resolveReverbPreset } from '$lib/audio-effects/reverb/presets'

    let { pip = false }: { pip?: boolean } = $props()

    let sub = $state<'presets' | 'config'>('presets')

    // Let the tab-level reset button know which sub-view is active (its semantics
    // differ: presets = effect off, config = back to the "from:" starting point).
    $effect(() => {
        fxSubView.set(sub)
    })

    // What the config is starting from: the last-loaded user preset, else the
    // active built-in preset, else the engine defaults.
    let userFrom = $state('')

    // Picking a built-in preset supersedes a previously-loaded user preset.
    $effect(() => {
        void $effectsStore.reverb
        userFrom = ''
    })
    const fromLabel = $derived.by(() => {
        if (userFrom) return userFrom
        const active = resolveReverbPreset($effectsStore.reverb)
        return active && active !== 'none' ? active : 'default'
    })
</script>

<div class="flex h-full flex-col gap-y-2.5">
    <div class="flex items-center justify-between gap-x-2">
        <EffectStatus
            name="Reverb"
            value={$effectsStore.reverb}
            from={sub === 'config' ? fromLabel : ''}
        />
        <SegmentedControl
            size="xs"
            ariaLabel="Reverb view"
            value={sub}
            onValueChange={(v) => (sub = v as 'presets' | 'config')}
            options={[
                { label: 'Presets', value: 'presets' },
                { label: 'Config', value: 'config' }
            ]}
        />
    </div>

    {#if sub === 'presets'}
        <FX {pip} />
    {:else}
        <ReverbControls {pip} onUserPresetLoad={(name) => (userFrom = name)} />
    {/if}
</div>
