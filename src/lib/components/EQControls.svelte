<script lang="ts">
    import { onMount } from 'svelte'
    import { get } from 'svelte/store'
    import { eqBandsStore, EQ_BAND_COUNT } from '$lib/stores/eq-bands'
    import { userEQPresetsStore } from '$lib/stores/eq-user-presets'
    import { effectsStore } from '$lib/stores/effects'
    import { Input } from '$lib/components/ui/input'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import { CustomSelect } from '$lib/components/ui/custom-select'
    import { EQ_FILTERS, EQ_PRESETS } from '$lib/audio-effects/equalizer/presets'

    let {
        pip = false,
        onUserPresetLoad
    }: { pip?: boolean; onUserPresetLoad?: (name: string) => void } = $props()

    // The bands the presets actually drive (the first EQ_BAND_COUNT filters).
    const BANDS = EQ_FILTERS.slice(0, EQ_BAND_COUNT)

    const fmtFreq = (f: number) => (f >= 1000 ? `${f / 1000}k` : `${f}`)
    const fmtGain = (g: number) => `${g > 0 ? '+' : ''}${g.toFixed(1)}`

    // --- User-saved presets: applied via eqBandsStore's live channel, never the
    // engine's name lookup.
    let presetName = $state('')
    let selectedUserPreset = $state('none')
    const userPresetOptions = $derived([
        { label: 'none', value: 'none' },
        ...Object.keys($userEQPresetsStore).map((name) => ({ label: name, value: name }))
    ])
    const hasUserPresets = $derived(Object.keys($userEQPresetsStore).length > 0)

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
</script>

<div class="flex flex-1 flex-col gap-y-1.5">
    <!-- Compact mixer rows (label · slider · dB inline) so all 10 bands + the
         save row fit the fixed tab height without scrolling. -->
    <div class="grid grid-cols-2 gap-x-3 gap-y-2 pr-1">
        {#each BANDS as band, i (band.freq)}
            {@const gain = $eqBandsStore[i] ?? 0}
            <div class="flex items-center gap-x-1">
                <span class="w-9 shrink-0 text-[11px] text-gray-400">{fmtFreq(band.freq)}Hz</span>
                <CustomSlider
                    type="single"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={gain}
                    onValueChange={(v) => onChange(i, v as number)}
                />
                <span class="w-4 shrink-0 text-right text-[10px] text-gray-500"
                    >{fmtGain(gain)}</span
                >
            </div>
        {/each}
    </div>

    <!-- Pinned to the very bottom of the tab, just above the reset row. -->
    <div class="mt-3 flex items-center gap-x-1.5">
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
                key="user-eq-presets"
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
