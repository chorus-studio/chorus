<script lang="ts">
    import { onMount } from 'svelte'
    import { get } from 'svelte/store'
    import { reverbParamsStore, type ReverbParams } from '$lib/stores/reverb-params'
    import { effectsStore } from '$lib/stores/effects'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import {
        customPresets,
        impulsePresets,
        getParamsListForEffect
    } from '$lib/audio-effects/reverb/presets'

    let { pip = false }: { pip?: boolean } = $props()

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
        advanced?: boolean // hidden behind the "advanced" toggle
    }

    // Friendly names; ordered most-recognizable first so the 2-col grid reads well.
    // Core = the audible dimensions users tune on top of a preset; the DSP
    // internals sit behind the advanced toggle.
    const CONTROLS: Ctl[] = [
        { key: 'dry', label: 'Dry', min: 0, max: 1, step: 0.01, pct: true },
        { key: 'wet', label: 'Wet', min: 0, max: 1, step: 0.01, pct: true },
        { key: 'preDelay', label: 'Pre-Delay', min: 0, max: 50, step: 1, ms: true },
        { key: 'decay', label: 'Decay', min: 0, max: 1, step: 0.01, pct: true },
        { key: 'damping', label: 'Damping', min: 0, max: 1, step: 0.01, pct: true },
        { key: 'bandwidth', label: 'Tone', min: 0, max: 1, step: 0.01, pct: true, advanced: true },
        { key: 'inputDiffusion1', label: 'Diffusion', min: 0, max: 1, step: 0.01, pct: true, advanced: true },
        { key: 'inputDiffusion2', label: 'Diffusion 2', min: 0, max: 1, step: 0.01, pct: true, advanced: true },
        { key: 'decayDiffusion1', label: 'Tail', min: 0, max: 0.99, step: 0.01, pct: true, advanced: true },
        { key: 'decayDiffusion2', label: 'Tail 2', min: 0, max: 0.99, step: 0.01, pct: true, advanced: true },
        { key: 'excursionRate', label: 'Mod Rate', min: 0, max: 2, step: 0.01, advanced: true },
        { key: 'excursionDepth', label: 'Mod Depth', min: 0, max: 2, step: 0.01, advanced: true }
    ]

    let showAdvanced = $state(false)
    const visibleControls = $derived(CONTROLS.filter((c) => showAdvanced || !c.advanced))

    const activeEffect = $derived($effectsStore.reverb)
    const isImpulse = $derived(impulsePresets.includes(activeEffect))

    // Seed the sliders from the active digital preset so editing starts where the
    // current sound is. Uses set() (no dispatch) — that preset is already applied.
    onMount(() => {
        const effect = get(effectsStore).reverb
        if (!effect || effect === 'none' || impulsePresets.includes(effect)) return

        const preset = customPresets.includes(effect) ? 'custom' : 'rooms'
        const seeded = { ...get(reverbParamsStore) }
        getParamsListForEffect({ effect, preset }).forEach(({ name, value }) => {
            if (name in seeded) (seeded as Record<string, number>)[name] = value
        })
        reverbParamsStore.set(seeded)
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
    <div class="flex flex-col gap-y-1.5">
        <div class="grid max-h-[135px] grid-cols-2 gap-x-3 gap-y-1.5 overflow-y-auto pr-1">
            {#each visibleControls as c (c.key)}
                {@const raw = $reverbParamsStore[c.key]}
                <div class="flex flex-col gap-y-0.5">
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
        </div>

        <button
            onclick={() => (showAdvanced = !showAdvanced)}
            class="self-start text-xs text-gray-500 underline-offset-2 hover:text-gray-300 hover:underline"
        >
            {showAdvanced ? 'hide advanced' : 'advanced…'}
        </button>
    </div>
{/if}
