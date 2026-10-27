<script lang="ts">
    import { onMount } from 'svelte'
    import { get } from 'svelte/store'
    import MS from './MS.svelte'
    import MSControls from '$lib/components/MSControls.svelte'
    import EffectStatus from '$lib/components/EffectStatus.svelte'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'
    import * as HoverCard from '$lib/components/ui/hover-card'
    import Info from '@lucide/svelte/icons/info'
    import { effectsStore } from '$lib/stores/effects'
    import { msSubView } from '$lib/stores/effects-ui'

    let { pip = false }: { pip?: boolean } = $props()

    // Opens on whatever the store says (Presets, unless something seeded it),
    // and leaves it on Presets for next time.
    let sub = $state<'presets' | 'config'>(get(msSubView))

    // Let the tab-level reset button know which sub-view is active (its semantics
    // differ: presets = effect off, config = back to the "from:" starting point).
    $effect(() => {
        msSubView.set(sub)
    })
    onMount(() => () => msSubView.set('presets'))

    // A quick guide for the ⓘ hover-card beside the status while editing.
    const PARAM_HINTS = [
        ['Width', 'how far apart left and right sit — 0% is mono, 100% as recorded'],
        ['Balance', 'tilts the whole mix towards one ear'],
        ['Mid gain', 'the centre of the mix — lead vocals, bass, kick'],
        ['Side gain', 'what is panned to the edges — backing, reverb, guitars']
    ] as const

    // What the config is starting from: the active preset, else the engine's
    // plain stereo.
    const fromLabel = $derived.by(() => {
        const active = $effectsStore.msProcessor
        return active && active !== 'none' ? active : 'stereo'
    })
</script>

<div class="flex h-full flex-col gap-y-2.5">
    <div class="flex items-center justify-between gap-x-2">
        <EffectStatus
            name="Stereo"
            value={$effectsStore.msProcessor}
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
                    </HoverCard.Content>
                </HoverCard.Root>
            {/if}
        </EffectStatus>
        <SegmentedControl
            size="xs"
            ariaLabel="Stereo view"
            value={sub}
            onValueChange={(v) => (sub = v as 'presets' | 'config')}
            options={[
                { label: 'Presets', value: 'presets' },
                { label: 'Config', value: 'config' }
            ]}
        />
    </div>

    {#if sub === 'presets'}
        <MS {pip} />
    {:else}
        <MSControls />
    {/if}
</div>
