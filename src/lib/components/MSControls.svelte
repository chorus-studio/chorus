<script lang="ts">
    // The Stereo tab's Config half: the four things the mid-side engine can do,
    // each a full-width slider filling from its neutral point. Opens on the
    // active preset's numbers, so a drag starts from what is playing.
    import { onMount } from 'svelte'
    import { get } from 'svelte/store'
    import { msParamsStore, type MSParams } from '$lib/stores/ms-params'
    import { effectsStore } from '$lib/stores/effects'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import { MS_PRESETS } from '$lib/audio-effects/ms-processor/presets'

    type Ctl = {
        key: keyof MSParams
        label: string
        min: number
        max: number
        step: number
        origin: number
        readout: (v: number) => string
    }

    const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)} dB`

    const CONTROLS: Ctl[] = [
        {
            key: 'width',
            label: 'Width',
            min: 0,
            max: 200,
            step: 1,
            origin: 100,
            readout: (v) => (v === 0 ? 'mono' : `${v}%`)
        },
        {
            key: 'balance',
            label: 'Balance',
            min: -100,
            max: 100,
            step: 1,
            origin: 0,
            readout: (v) => (v === 0 ? 'centre' : v < 0 ? `L ${-v}` : `R ${v}`)
        },
        {
            key: 'midGain',
            label: 'Mid gain',
            min: -12,
            max: 12,
            step: 0.5,
            origin: 0,
            readout: signed
        },
        {
            key: 'sideGain',
            label: 'Side gain',
            min: -12,
            max: 12,
            step: 0.5,
            origin: 0,
            readout: signed
        }
    ]

    // Seed the sliders from the active preset so editing starts where the sound
    // is (no dispatch — that preset is already applied). Also records the
    // config-reset starting point.
    onMount(() => {
        const effect = get(effectsStore).msProcessor
        const preset = effect && effect !== 'none' ? MS_PRESETS[effect] : null
        if (preset) msParamsStore.seed({ ...get(msParamsStore), ...preset })
    })

    const onChange = (key: keyof MSParams, value: number) =>
        msParamsStore.updateParam({ key, value })
</script>

<div class="flex h-full flex-col gap-y-4">
    {#each CONTROLS as c (c.key)}
        {@const value = $msParamsStore[c.key]}
        <div class="flex flex-col gap-y-0.5">
            <div class="flex h-4 items-center justify-between">
                <span class="rack-label">{c.label}</span>
                <span
                    class="font-mono text-[10px] tabular-nums {value === c.origin
                        ? 'text-ink-muted'
                        : 'text-signal-bright'}">{c.readout(value)}</span
                >
            </div>
            <div class="-my-0.5">
                <CustomSlider
                    type="single"
                    min={c.min}
                    max={c.max}
                    step={c.step}
                    {value}
                    origin={c.origin}
                    label={c.label}
                    onValueChange={(v) => onChange(c.key, v as number)}
                />
            </div>
        </div>
    {/each}

    <p class="mt-auto text-[11px] leading-snug text-ink-muted">
        Width 0% folds to mono, 200% pushes the sides out. Mid is what sits in the centre (vocals,
        bass), side what is panned away from it.
    </p>
</div>
