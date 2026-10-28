<script lang="ts">
    import { onMount } from 'svelte'
    import { get } from 'svelte/store'
    import { eqBandsStore, EQ_BAND_COUNT } from '$lib/stores/eq-bands'
    import { userEQPresetsStore } from '$lib/stores/eq-user-presets'
    import { effectsStore } from '$lib/stores/effects'
    import EQFader from '$lib/components/EQFader.svelte'
    import UserPresetRow from '$lib/components/UserPresetRow.svelte'
    import { EQ_FILTERS, EQ_PRESETS } from '$lib/audio-effects/equalizer/presets'
    import { monotonePath } from '$lib/utils/eq-curve'
    import { cn } from '$lib/utils.js'

    let {
        pip = false,
        onUserPresetLoad
    }: { pip?: boolean; onUserPresetLoad?: (name: string) => void } = $props()

    // The bands the presets actually drive (the first EQ_BAND_COUNT filters).
    const BANDS = EQ_FILTERS.slice(0, EQ_BAND_COUNT)

    const GAIN_MIN = -12
    const GAIN_MAX = 12

    const fmtFreq = (f: number) => (f >= 1000 ? `${f / 1000}k` : `${f}`)
    const fmtGain = (g: number) => `${g > 0 ? '+' : g < 0 ? '−' : ''}${Math.abs(g).toFixed(1)}`

    // --- User-saved presets: applied via eqBandsStore's live channel, never the
    // engine's name lookup.
    let presetName = $state('')
    let selectedUserPreset = $state('none')
    const userPresetOptions = $derived([
        { label: 'none', value: 'none' },
        ...Object.keys($userEQPresetsStore).map((name) => ({ label: name, value: name }))
    ])

    function loadUserPreset(name: string) {
        selectedUserPreset = name
        if (name === 'none') return
        const bands = $userEQPresetsStore[name]
        if (bands) {
            eqBandsStore.setFromPreset([...bands])
            onUserPresetLoad?.(name)
        }
    }

    async function saveCurrent() {
        const name = presetName.trim()
        if (!name) return
        const bands = get(eqBandsStore)
        await userEQPresetsStore.save(name, bands)
        eqBandsStore.markSeed(bands) // saved values become the new reset point
        selectedUserPreset = name
        onUserPresetLoad?.(name)
        presetName = ''
    }

    async function deleteSelected() {
        if (selectedUserPreset === 'none') return
        await userEQPresetsStore.remove(selectedUserPreset)
        selectedUserPreset = 'none'
    }

    // Seed the sliders from the active preset so editing starts where the sound is
    // (also records the config-reset starting point).
    onMount(() => {
        const effect = get(effectsStore).equalizer
        const preset = effect && effect !== 'none' ? EQ_PRESETS[effect] : null
        if (preset) eqBandsStore.seed([...preset])
    })

    function onChange(index: number, value: number) {
        eqBandsStore.updateBand({ index, value })
    }

    // The response curve behind the faders runs through the knob centres: the
    // fader track is inset by half the knob (EQFader's --pad), so the y of a
    // value is the same here as there.
    const KNOB = 12
    let curveWidth = $state(0)
    let curveHeight = $state(0)
    const points = $derived(
        BANDS.map((_, i) => {
            const level = (($eqBandsStore[i] ?? 0) - GAIN_MIN) / (GAIN_MAX - GAIN_MIN)
            return {
                x: ((i + 0.5) / BANDS.length) * curveWidth,
                y: KNOB / 2 + (1 - level) * (curveHeight - KNOB)
            }
        })
    )
    const linePath = $derived(curveWidth && curveHeight ? monotonePath(points) : '')
    const areaPath = $derived(
        linePath
            ? `${linePath} L${points[points.length - 1].x},${curveHeight} L${points[0].x},${curveHeight} Z`
            : ''
    )
    const columns = `repeat(${BANDS.length}, minmax(0, 1fr))`
</script>

<div class="flex h-full flex-col gap-y-2">
    <div class="flex min-h-0 flex-1 flex-col gap-y-1">
        <div class="grid" style:grid-template-columns={columns}>
            {#each BANDS as band, i (band.freq)}
                {@const gain = $eqBandsStore[i] ?? 0}
                <span
                    class={cn(
                        'text-center font-mono text-[10px] tabular-nums',
                        gain === 0 ? 'text-ink-muted' : 'text-signal-bright'
                    )}>{fmtGain(gain)}</span
                >
            {/each}
        </div>

        <div
            class="relative min-h-0 flex-1"
            bind:clientWidth={curveWidth}
            bind:clientHeight={curveHeight}
        >
            <svg
                aria-hidden="true"
                class="pointer-events-none absolute inset-0"
                width={curveWidth}
                height={curveHeight}
            >
                <defs>
                    <linearGradient id="eq-curve-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop
                            offset="0"
                            style="stop-color: hsl(var(--signal)); stop-opacity: 0.26"
                        />
                        <stop offset="1" style="stop-color: hsl(var(--signal)); stop-opacity: 0" />
                    </linearGradient>
                </defs>
                <line
                    x1="0"
                    x2={curveWidth}
                    y1={curveHeight / 2}
                    y2={curveHeight / 2}
                    stroke-dasharray="2 3"
                    class="stroke-ink-fg/15"
                />
                <path d={areaPath} fill="url(#eq-curve-fill)" />
                <path
                    d={linePath}
                    fill="none"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    class="stroke-signal/70"
                />
            </svg>
            <div class="relative grid h-full" style:grid-template-columns={columns}>
                {#each BANDS as band, i (band.freq)}
                    {@const gain = $eqBandsStore[i] ?? 0}
                    <EQFader
                        min={GAIN_MIN}
                        max={GAIN_MAX}
                        step={0.5}
                        value={gain}
                        label={`${fmtFreq(band.freq)} Hz gain`}
                        valueText={`${fmtGain(gain)} dB`}
                        onValueChange={(v) => onChange(i, v)}
                    />
                {/each}
            </div>
        </div>

        <div class="grid" style:grid-template-columns={columns}>
            {#each BANDS as band (band.freq)}
                <span class="text-center font-mono text-[10px] text-ink-muted"
                    >{fmtFreq(band.freq)}</span
                >
            {/each}
        </div>
    </div>

    <UserPresetRow
        {pip}
        selectKey="user-eq-presets"
        bind:presetName
        selected={selectedUserPreset}
        options={userPresetOptions}
        onSave={saveCurrent}
        onLoad={loadUserPreset}
        onDelete={deleteSelected}
    />
</div>
