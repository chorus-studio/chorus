<script lang="ts">
    import EQ from './EQ.svelte'
    import EQControls from '$lib/components/EQControls.svelte'
    import * as HoverCard from '$lib/components/ui/hover-card'
    import { effectsStore } from '$lib/stores/effects'
    import { eqSubView } from '$lib/stores/effects-ui'

    let { pip = false }: { pip?: boolean } = $props()

    let sub = $state<'presets' | 'config'>('presets')

    // Let the tab-level reset button know which sub-view is active (its semantics
    // differ: presets = effect off, config = back to the "from:" starting point).
    $effect(() => {
        eqSubView.set(sub)
    })

    const subTabs = [
        { id: 'presets', label: 'presets' },
        { id: 'config', label: 'config' }
    ] as const

    // A quick frequency guide for the ⓘ info hover-card — the band grid is full,
    // so (unlike reverb) the info trigger lives in the header.
    const BAND_HINTS = [
        ['32–64Hz', 'sub-bass — rumble and thump'],
        ['125–250Hz', 'bass — fullness and warmth'],
        ['500Hz–1kHz', 'mids — body and vocals'],
        ['2k–4kHz', 'presence — clarity and edge'],
        ['8k–16kHz', 'treble — brightness and air']
    ] as const

    // What the config is starting from: the last-loaded user preset, else the
    // active built-in preset, else flat/default.
    let userFrom = $state('')
    const fromLabel = $derived.by(() => {
        if (userFrom) return userFrom
        const active = $effectsStore.equalizer
        return active && active !== 'none' ? active : 'default'
    })

    // Picking a built-in preset supersedes a previously-loaded user preset.
    $effect(() => {
        void $effectsStore.equalizer
        userFrom = ''
    })
</script>

<div class="flex h-full w-full flex-col gap-y-2">
    <div class="flex items-center justify-between gap-x-2">
        <div class="flex min-w-0 flex-1 items-center justify-between gap-x-1.5">
            {#if sub === 'config'}
                <span class="truncate text-xs text-gray-500"
                    >from: <span class="text-gray-400">{fromLabel}</span></span
                >
                <HoverCard.Root openDelay={200} closeDelay={200}>
                    <HoverCard.Trigger
                        aria-label="What the bands do"
                        class="flex shrink-0 cursor-help items-center gap-x-1 text-xs !text-gray-500 !no-underline hover:!text-gray-300"
                    >
                        <span class="text-gray-300 mt-0.5">ⓘ</span>
                        <span class="text-gray-300">info</span>
                    </HoverCard.Trigger>
                    <HoverCard.Content class="z-[1000] flex w-64 flex-col gap-y-1 text-xs">
                        <p class="leading-snug text-gray-400">
                            Boost (+) or cut (−) each frequency band, in dB.
                        </p>
                        {#each BAND_HINTS as [range, hint] (range)}
                            <p class="leading-snug">
                                <span class="font-semibold text-gray-300">{range}</span>
                                <span class="text-gray-400"> — {hint}</span>
                            </p>
                        {/each}
                    </HoverCard.Content>
                </HoverCard.Root>
            {/if}
        </div>

        <div class="flex shrink-0 items-center gap-x-1.5">
            {#each subTabs as t (t.id)}
                <button
                    onclick={() => (sub = t.id)}
                    class="rounded-[2px] px-1.5 py-0 pb-[0.125rem] text-sm font-semibold leading-[18px] text-[#fafafa] transition-colors {sub ===
                    t.id
                        ? 'bg-green-700 hover:bg-green-800'
                        : 'bg-zinc-700 hover:bg-zinc-500'}"
                >
                    {t.label}
                </button>
            {/each}
        </div>
    </div>

    {#if sub === 'presets'}
        <EQ {pip} />
    {:else}
        <EQControls {pip} onUserPresetLoad={(name) => (userFrom = name)} />
    {/if}
</div>
