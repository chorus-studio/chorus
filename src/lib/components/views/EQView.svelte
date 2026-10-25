<script lang="ts">
    import EQ from './EQ.svelte'
    import EQControls from '$lib/components/EQControls.svelte'
    import EffectStatus from '$lib/components/EffectStatus.svelte'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'
    import * as HoverCard from '$lib/components/ui/hover-card'
    import Info from '@lucide/svelte/icons/info'
    import { effectsStore } from '$lib/stores/effects'
    import { eqSubView } from '$lib/stores/effects-ui'

    let { pip = false }: { pip?: boolean } = $props()

    let sub = $state<'presets' | 'config'>('presets')

    // Let the tab-level reset button know which sub-view is active (its semantics
    // differ: presets = effect off, config = back to the "from:" starting point).
    $effect(() => {
        eqSubView.set(sub)
    })

    // A quick frequency guide for the ⓘ info hover-card.
    const BAND_HINTS = [
        ['32–64 Hz', 'sub-bass — rumble and thump'],
        ['125–250 Hz', 'bass — fullness and warmth'],
        ['500 Hz–1 kHz', 'mids — body and vocals'],
        ['2–4 kHz', 'presence — clarity and edge'],
        ['8–16 kHz', 'treble — brightness and air']
    ] as const

    // What the config is starting from: the last-loaded user preset, else the
    // active built-in preset, else flat/default.
    let userFrom = $state('')
    const fromLabel = $derived.by(() => {
        if (userFrom) return userFrom
        const active = $effectsStore.equalizer
        return active && active !== 'none' ? active : 'flat'
    })

    // Picking a built-in preset supersedes a previously-loaded user preset.
    $effect(() => {
        void $effectsStore.equalizer
        userFrom = ''
    })
</script>

<div class="flex h-full flex-col gap-y-2.5">
    <div class="flex items-center justify-between gap-x-2">
        <EffectStatus
            name="EQ"
            value={$effectsStore.equalizer}
            from={sub === 'config' ? fromLabel : ''}
        >
            {#if sub === 'config'}
                <HoverCard.Root openDelay={150} closeDelay={150}>
                    <HoverCard.Trigger
                        aria-label="What the bands do"
                        class="inline-flex size-5 shrink-0 cursor-help items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink-fg"
                    >
                        <Info class="size-3" />
                    </HoverCard.Trigger>
                    <HoverCard.Content class="flex w-60 flex-col gap-y-1 text-xs">
                        <p class="leading-snug text-ink-muted">
                            Boost (+) or cut (−) each band, in dB.
                        </p>
                        {#each BAND_HINTS as [range, hint] (range)}
                            <p class="leading-snug">
                                <span class="font-mono text-ink-fg">{range}</span>
                                <span class="text-ink-muted"> — {hint}</span>
                            </p>
                        {/each}
                    </HoverCard.Content>
                </HoverCard.Root>
            {/if}
        </EffectStatus>

        <SegmentedControl
            size="xs"
            ariaLabel="EQ view"
            value={sub}
            onValueChange={(v) => (sub = v as 'presets' | 'config')}
            options={[
                { label: 'Presets', value: 'presets' },
                { label: 'Config', value: 'config' }
            ]}
        />
    </div>

    {#if sub === 'presets'}
        <EQ {pip} />
    {:else}
        <EQControls {pip} onUserPresetLoad={(name) => (userFrom = name)} />
    {/if}
</div>
