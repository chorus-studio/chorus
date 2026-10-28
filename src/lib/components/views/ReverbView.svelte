<script lang="ts">
    import { onMount } from 'svelte'
    import { get } from 'svelte/store'
    import FX from './FX.svelte'
    import ReverbControls from '$lib/components/ReverbControls.svelte'
    import EffectStatus from '$lib/components/EffectStatus.svelte'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'
    import * as HoverCard from '$lib/components/ui/hover-card'
    import Info from '@lucide/svelte/icons/info'
    import { effectsStore } from '$lib/stores/effects'
    import { fxSubView } from '$lib/stores/effects-ui'
    import { resolveReverbPreset } from '$lib/audio-effects/reverb/presets'
    import { REVERB_LEVEL_NOTE } from './reverb-level-note'

    let { pip = false }: { pip?: boolean } = $props()

    // Opens on whatever the store says (Presets, unless something seeded it),
    // and leaves it on Presets for next time.
    let sub = $state<'presets' | 'config'>(get(fxSubView))

    // Let the tab-level reset button know which sub-view is active (its semantics
    // differ: presets = effect off, config = back to the "from:" starting point).
    $effect(() => {
        fxSubView.set(sub)
    })
    onMount(() => () => fxSubView.set('presets'))

    // A quick guide for the ⓘ hover-card beside the status while editing.
    const PARAM_HINTS = [
        ['Dry', 'the untouched signal — 100% leaves the track at its level'],
        ['Wet', 'volume of the reverb'],
        ['Pre-delay', 'silence before the reverb starts — longer feels like a bigger space'],
        ['Decay', 'how long the reverb tail rings out'],
        ['Damping', 'how fast highs fade — higher = darker, softer tail']
    ] as const

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
        >
            {#if sub === 'config'}
                <HoverCard.Root openDelay={150} closeDelay={150}>
                    <HoverCard.Trigger
                        aria-label="What the sliders do"
                        class="inline-flex size-5 shrink-0 cursor-help items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink-fg"
                    >
                        <Info class="size-3" />
                    </HoverCard.Trigger>
                    <HoverCard.Content class="flex w-64 flex-col gap-y-1 text-xs">
                        {#each PARAM_HINTS as [name, hint] (name)}
                            <p class="leading-snug">
                                <span class="font-medium text-ink-fg">{name}</span>
                                <span class="text-ink-muted"> — {hint}</span>
                            </p>
                        {/each}
                        <p class="mt-1 border-t border-hairline pt-1.5 leading-snug text-ink-muted">
                            {REVERB_LEVEL_NOTE}
                        </p>
                    </HoverCard.Content>
                </HoverCard.Root>
            {/if}
        </EffectStatus>
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
