<script lang="ts">
    import { onMount } from 'svelte'
    import { get } from 'svelte/store'
    import { eqBandsStore, EQ_BAND_COUNT } from '$lib/stores/eq-bands'
    import { effectsStore } from '$lib/stores/effects'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import { EQ_FILTERS, EQ_PRESETS } from '$lib/audio-effects/equalizer/presets'

    let { pip = false }: { pip?: boolean } = $props()

    // The bands the presets actually drive (the first EQ_BAND_COUNT filters).
    const BANDS = EQ_FILTERS.slice(0, EQ_BAND_COUNT)

    const fmtFreq = (f: number) => (f >= 1000 ? `${f / 1000}k` : `${f}`)
    const fmtGain = (g: number) => `${g > 0 ? '+' : ''}${g.toFixed(1)}`

    // Seed the sliders from the active preset so editing starts where the sound is.
    onMount(() => {
        const effect = get(effectsStore).equalizer
        const preset = effect && effect !== 'none' ? EQ_PRESETS[effect] : null
        if (preset) eqBandsStore.set([...preset])
    })

    function onChange(index: number, value: number) {
        eqBandsStore.updateBand({ index, value })
    }
</script>

<div class="grid max-h-[150px] grid-cols-2 gap-x-3 gap-y-1.5 overflow-y-auto pr-1">
    {#each BANDS as band, i (band.freq)}
        {@const gain = $eqBandsStore[i] ?? 0}
        <div class="flex flex-col gap-y-0.5">
            <div class="flex items-center justify-between">
                <span class="text-xs text-gray-400">{fmtFreq(band.freq)}Hz</span>
                <span class="text-xs text-gray-500">{fmtGain(gain)} dB</span>
            </div>
            <CustomSlider
                type="single"
                min={-12}
                max={12}
                step={0.5}
                value={gain}
                onValueChange={(v) => onChange(i, v as number)}
            />
        </div>
    {/each}
</div>
