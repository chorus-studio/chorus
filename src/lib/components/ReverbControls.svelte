<script lang="ts">
    import { onMount } from 'svelte'
    import { get } from 'svelte/store'
    import { reverbParamsStore, type ReverbParams } from '$lib/stores/reverb-params'
    import { userReverbPresetsStore } from '$lib/stores/reverb-user-presets'
    import { effectsStore } from '$lib/stores/effects'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import UserPresetRow from '$lib/components/UserPresetRow.svelte'
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
    <div class="flex h-full flex-col gap-y-1.5">
        <!-- One column: each slider gets the full width, which is the point of
             tuning by ear, and the five together fill the frame. -->
        {#each CONTROLS as c (c.key)}
            {@const raw = $reverbParamsStore[c.key]}
            <div class="flex flex-col gap-y-0.5">
                <div class="flex h-4 items-center justify-between">
                    <span class="rack-label">{c.label}</span>
                    <span class="font-mono text-[10px] tabular-nums text-ink-fg-2"
                        >{readout(c, raw)}</span
                    >
                </div>
                <div class="-my-0.5">
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
            </div>
        {/each}

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
