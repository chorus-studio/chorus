<script lang="ts">
    import { onMount } from 'svelte'
    import { get } from 'svelte/store'
    import { reverbParamsStore, type ReverbParams } from '$lib/stores/reverb-params'
    import { userReverbPresetsStore } from '$lib/stores/reverb-user-presets'
    import { effectsStore } from '$lib/stores/effects'
    import { Input } from '$lib/components/ui/input'
    import * as HoverCard from '$lib/components/ui/hover-card'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import { CustomSelect } from '$lib/components/ui/custom-select'
    import {
        customPresets,
        impulsePresets,
        getParamsListForEffect
    } from '$lib/audio-effects/reverb/presets'

    let {
        pip = false,
        onUserPresetLoad
    }: { pip?: boolean; onUserPresetLoad?: (name: string) => void } = $props()

    // The worklet stores pre-delay in samples; show it as ms for readability.
    const SR = 44100

    type Ctl = {
        key: keyof ReverbParams
        label: string
        min: number
        max: number
        step: number
        pct?: boolean // 0..1 shown as a percentage
        ms?: boolean // stored as samples, edited/shown as milliseconds
    }

    // Only the audible dimensions users know from mainstream reverb UIs: amount
    // (dry/wet), length (decay), distance (pre-delay), brightness (damping). The
    // plate-topology internals (diffusion/tail/tone/mod) are encoded by the chosen
    // preset — they still seed the params store and save into user presets, they
    // just don't get footgun sliders. (What each slider does is documented in the
    // ⓘ hover-card in ReverbView's header.)
    const CONTROLS: Ctl[] = [
        { key: 'dry', label: 'Dry', min: 0, max: 1, step: 0.01, pct: true },
        { key: 'wet', label: 'Wet', min: 0, max: 1, step: 0.01, pct: true },
        { key: 'preDelay', label: 'Pre-Delay', min: 0, max: 50, step: 1, ms: true },
        { key: 'decay', label: 'Decay', min: 0, max: 1, step: 0.01, pct: true },
        { key: 'damping', label: 'Damping', min: 0, max: 1, step: 0.01, pct: true }
    ]

    // Shown in the ⓘ info hover-card that fills the grid's empty last cell.
    const PARAM_HINTS = [
        ['Dry', 'volume of the untouched signal'],
        ['Wet', 'volume of the reverb'],
        ['Pre-Delay', 'silence before the reverb starts — longer feels like a bigger space'],
        ['Decay', 'how long the reverb tail rings out'],
        ['Damping', 'how fast highs fade — higher = darker, softer tail']
    ] as const

    // --- User-saved presets: applied via reverbParamsStore's live channel, never
    // the engine's name lookup.
    let presetName = $state('')
    let selectedUserPreset = $state('none')
    const userPresetOptions = $derived([
        { label: 'none', value: 'none' },
        ...Object.keys($userReverbPresetsStore).map((name) => ({ label: name, value: name }))
    ])
    const hasUserPresets = $derived(Object.keys($userReverbPresetsStore).length > 0)

    function loadUserPreset(name: string) {
        selectedUserPreset = name
        if (name === 'none') return
        const params = $userReverbPresetsStore[name]
        if (params) {
            reverbParamsStore.setFromPreset({ ...params })
            onUserPresetLoad?.(name)
        }
    }

    async function saveCurrent() {
        const name = presetName.trim()
        if (!name) return
        const params = get(reverbParamsStore)
        await userReverbPresetsStore.save(name, params)
        reverbParamsStore.markSeed(params) // saved values become the new reset point
        selectedUserPreset = name
        onUserPresetLoad?.(name)
        presetName = ''
    }

    async function deleteSelected() {
        if (selectedUserPreset === 'none') return
        await userReverbPresetsStore.remove(selectedUserPreset)
        selectedUserPreset = 'none'
    }

    const activeEffect = $derived($effectsStore.reverb)
    const isImpulse = $derived(impulsePresets.includes(activeEffect))

    // Seed the sliders from the active digital preset so editing starts where the
    // current sound is (no dispatch — that preset is already applied). Also records
    // the config-reset starting point.
    onMount(() => {
        const effect = get(effectsStore).reverb
        if (!effect || effect === 'none' || impulsePresets.includes(effect)) return

        const preset = customPresets.includes(effect) ? 'custom' : 'rooms'
        const seeded = { ...get(reverbParamsStore) }
        getParamsListForEffect({ effect, preset }).forEach(({ name, value }) => {
            if (name in seeded) (seeded as Record<string, number>)[name] = value
        })
        reverbParamsStore.seed(seeded)
    })

    const toSamples = (ms: number) => Math.round(ms * (SR / 1000))
    const toMs = (samples: number) => Math.round(samples / (SR / 1000))

    function onChange(c: Ctl, v: number) {
        reverbParamsStore.updateParam({ key: c.key, value: c.ms ? toSamples(v) : v })
    }

    function readout(c: Ctl, raw: number) {
        if (c.pct) return `${Math.round(raw * 100)}%`
        if (c.ms) return `${toMs(raw)}ms`
        return raw.toFixed(2)
    }
</script>

{#if isImpulse}
    <p class="px-1 pt-2 text-xs leading-snug text-gray-500">
        “{activeEffect}” is an impulse-response reverb — its parameters aren't editable. Pick a
        room or custom preset to tune the config.
    </p>
{:else}
    <div class="flex flex-1 flex-col gap-y-1.5">
        <div class="grid grid-cols-2 gap-x-3 gap-y-3 pr-1">
            {#each CONTROLS as c (c.key)}
                {@const raw = $reverbParamsStore[c.key]}
                <div class="flex flex-col gap-y-1.5">
                    <div class="flex items-center justify-between">
                        <span class="text-xs text-gray-400">{c.label}</span>
                        <span class="text-xs text-gray-500">{readout(c, raw)}</span>
                    </div>
                    <CustomSlider
                        type="single"
                        min={c.min}
                        max={c.max}
                        step={c.step}
                        value={c.ms ? toMs(raw) : raw}
                        onValueChange={(v) => onChange(c, v as number)}
                    />
                </div>
            {/each}

            <!-- Fills the empty cell beside Damping. The HoverCard trigger renders
                 as an <a>, so the colors are forced (!) to override page link styles. -->
            <div class="flex items-end justify-end">
                <HoverCard.Root openDelay={200} closeDelay={200}>
                    <HoverCard.Trigger
                        aria-label="What the sliders do"
                        class="flex cursor-help items-center gap-x-1 text-xs !text-gray-500 !no-underline hover:!text-gray-300"
                    >
                        <span class="!text-gray-300 mt-0.5">ⓘ</span>
                        <span class="!text-gray-300">info</span>
                    </HoverCard.Trigger>
                    <HoverCard.Content class="z-[1000] flex w-64 flex-col gap-y-1 text-xs">
                        {#each PARAM_HINTS as [name, hint] (name)}
                            <p class="leading-snug">
                                <span class="font-semibold text-gray-300">{name}</span>
                                <span class="text-gray-400"> — {hint}</span>
                            </p>
                        {/each}
                    </HoverCard.Content>
                </HoverCard.Root>
            </div>
        </div>

        <!-- Pinned to the very bottom of the tab, just above the reset row. -->
        <div class="mt-4 flex items-center gap-x-1.5">
            <Input
                placeholder="save config as…"
                bind:value={presetName}
                onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && saveCurrent()}
                class="h-6 min-w-0 flex-1 rounded-sm border-muted-foreground bg-transparent px-2 text-xs"
            />
            <button
                onclick={saveCurrent}
                disabled={!presetName.trim()}
                class="h-6 shrink-0 rounded-[2px] bg-green-700 px-2 text-xs font-semibold text-[#fafafa] hover:bg-green-800 disabled:opacity-40"
            >
                save
            </button>

            {#if hasUserPresets}
                <CustomSelect
                    {pip}
                    size="md"
                    key="user-reverb-presets"
                    selected={selectedUserPreset}
                    options={userPresetOptions}
                    onValueChange={loadUserPreset}
                    class="shrink-0"
                />
                {#if selectedUserPreset !== 'none'}
                    <button
                        aria-label="Delete preset"
                        title="Delete preset"
                        onclick={deleteSelected}
                        class="shrink-0 text-xs text-gray-500 hover:text-red-400"
                    >
                        ✕
                    </button>
                {/if}
            {/if}
        </div>
    </div>
{/if}
