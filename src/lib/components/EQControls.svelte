<script lang="ts">
    import { onMount } from 'svelte'
    import { get } from 'svelte/store'
    import { eqBandsStore, EQ_BAND_COUNT } from '$lib/stores/eq-bands'
    import { userEQPresetsStore } from '$lib/stores/eq-user-presets'
    import { effectsStore } from '$lib/stores/effects'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import UserPresetRow from '$lib/components/UserPresetRow.svelte'
    import { EQ_FILTERS, EQ_PRESETS } from '$lib/audio-effects/equalizer/presets'
    import { cn } from '$lib/utils.js'

    let {
        pip = false,
        onUserPresetLoad
    }: { pip?: boolean; onUserPresetLoad?: (name: string) => void } = $props()

    // The bands the presets actually drive (the first EQ_BAND_COUNT filters).
    const BANDS = EQ_FILTERS.slice(0, EQ_BAND_COUNT)

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

    // Column-major order: 32…500 Hz down the left, 1k…16k down the right.
    const half = Math.ceil(BANDS.length / 2)
    const ordered = $derived(
        BANDS.map((band, i) => ({ band, i })).sort((a, b) => {
            const ra = a.i % half
            const rb = b.i % half
            return ra === rb ? a.i - b.i : ra - rb
        })
    )
</script>

<div class="flex h-full flex-col gap-y-2">
    <div class="grid grid-cols-2 gap-x-6 gap-y-2.5">
        {#each ordered as { band, i } (band.freq)}
            {@const gain = $eqBandsStore[i] ?? 0}
            <div class="flex h-7 items-center gap-x-2">
                <span class="w-7 shrink-0 text-right font-mono text-[10px] text-ink-muted"
                    >{fmtFreq(band.freq)}</span
                >
                <CustomSlider
                    type="single"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={gain}
                    origin={0}
                    label={`${fmtFreq(band.freq)} Hz gain`}
                    onValueChange={(v) => onChange(i, v as number)}
                />
                <span
                    class={cn(
                        'w-8 shrink-0 text-right font-mono text-[10px] tabular-nums',
                        gain === 0 ? 'text-ink-muted' : 'text-signal-bright'
                    )}>{fmtGain(gain)}</span
                >
            </div>
        {/each}
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
