<script lang="ts">
    import { onMount } from 'svelte'
    import { get } from 'svelte/store'
    import { reverbParamsStore, type ReverbParams } from '$lib/stores/reverb-params'
    import { userReverbPresetsStore } from '$lib/stores/reverb-user-presets'
    import { effectsStore } from '$lib/stores/effects'
    import * as HoverCard from '$lib/components/ui/hover-card'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import UserPresetRow from '$lib/components/UserPresetRow.svelte'
    import Info from '@lucide/svelte/icons/info'
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
    // plate-topology internals are encoded by the chosen preset.
    const CONTROLS: Ctl[] = [
        { key: 'dry', label: 'Dry', min: 0, max: 1, step: 0.01, pct: true },
        { key: 'wet', label: 'Wet', min: 0, max: 1, step: 0.01, pct: true },
        { key: 'preDelay', label: 'Pre-delay', min: 0, max: 50, step: 1, ms: true },
        { key: 'decay', label: 'Decay', min: 0, max: 1, step: 0.01, pct: true },
        { key: 'damping', label: 'Damping', min: 0, max: 1, step: 0.01, pct: true }
    ]

    const PARAM_HINTS = [
        ['Dry', 'volume of the untouched signal'],
        ['Wet', 'volume of the reverb'],
        ['Pre-delay', 'silence before the reverb starts — longer feels like a bigger space'],
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
        if (c.ms) return `${toMs(raw)} ms`
        return raw.toFixed(2)
    }
</script>

{#if isImpulse}
    <div
        class="flex flex-1 flex-col items-center justify-center gap-y-2 rounded-lg border border-dashed border-hairline-strong px-6 text-center"
    >
        <p class="text-xs leading-snug text-ink-fg-2">
            <span class="font-medium text-ink-fg">{activeEffect}</span> is an impulse-response reverb,
            so it has no adjustable parameters.
        </p>
        <p class="text-[11px] text-ink-muted">
            Pick a room or custom preset to tune the sound here.
        </p>
    </div>
{:else}
    <div class="flex h-full flex-col gap-y-2">
        <div class="grid grid-cols-2 gap-x-4 gap-y-2">
            {#each CONTROLS as c (c.key)}
                {@const raw = $reverbParamsStore[c.key]}
                <div class="flex flex-col gap-y-1">
                    <div class="flex items-center justify-between">
                        <span class="rack-label">{c.label}</span>
                        <span class="font-mono text-[10px] tabular-nums text-ink-fg-2"
                            >{readout(c, raw)}</span
                        >
                    </div>
                    <CustomSlider
                        type="single"
                        min={c.min}
                        max={c.max}
                        step={c.step}
                        value={c.ms ? toMs(raw) : raw}
                        label={c.label}
                        onValueChange={(v) => onChange(c, v as number)}
                    />
                </div>
            {/each}

            <!-- Fills the empty cell beside Damping. -->
            <div class="flex items-end justify-end pb-1">
                <HoverCard.Root openDelay={150} closeDelay={150}>
                    <HoverCard.Trigger
                        aria-label="What the sliders do"
                        class="inline-flex h-6 cursor-help items-center gap-x-1 rounded-md px-1.5 text-[11px] text-ink-muted hover:bg-surface-2 hover:text-ink-fg"
                    >
                        <Info class="size-3" />
                        What these do
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
            </div>
        </div>

        <UserPresetRow
            {pip}
            selectKey="user-reverb-presets"
            bind:presetName
            selected={selectedUserPreset}
            options={userPresetOptions}
            onSave={saveCurrent}
            onLoad={loadUserPreset}
            onDelete={deleteSelected}
        />
    </div>
{/if}
