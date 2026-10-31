<script lang="ts">
    import {
        BUILTIN_LOOKS,
        GRADIENT_STOPS_MAX,
        GRADIENT_STOPS_MIN,
        type GradientBackdrop,
        type GradientKind,
        type RadialShape
    } from '$lib/types/look'
    import { gradientCss } from '$lib/utils/backdrop-css'
    import X from '@lucide/svelte/icons/x'
    import Plus from '@lucide/svelte/icons/plus'
    import { Switch } from '$lib/components/ui/switch'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'
    import ColourField from './ColourField.svelte'
    import AnchorGrid from './AnchorGrid.svelte'

    let {
        gradient,
        onChange
    }: { gradient: GradientBackdrop; onChange: (gradient: GradientBackdrop) => void } = $props()

    const patch = (changes: Partial<GradientBackdrop>) => onChange({ ...gradient, ...changes })

    function setStop(index: number, changes: Partial<GradientBackdrop['stops'][number]>) {
        patch({ stops: gradient.stops.map((s, i) => (i === index ? { ...s, ...changes } : s)) })
    }

    /** A new stop halfway between the last two, in the colour between them. */
    function addStop() {
        if (gradient.stops.length >= GRADIENT_STOPS_MAX) return
        const sorted = [...gradient.stops].sort((a, b) => a.at - b.at)
        const a = sorted[sorted.length - 2]
        const b = sorted[sorted.length - 1]
        patch({ stops: [...gradient.stops, { color: b.color, at: Math.round((a.at + b.at) / 2) }] })
    }

    function removeStop(index: number) {
        if (gradient.stops.length <= GRADIENT_STOPS_MIN) return
        patch({ stops: gradient.stops.filter((_, i) => i !== index) })
    }

    // The built-in looks' gradients double as presets; picking one keeps the drift choice.
    const presets = BUILTIN_LOOKS.filter((look) => look.backdrop?.kind === 'gradient').map(
        (look) => ({
            name: look.name,
            gradient: look.backdrop as GradientBackdrop
        })
    )

    const bar = $derived(
        `linear-gradient(90deg, ${[...gradient.stops]
            .sort((a, b) => a.at - b.at)
            .map((s) => `${s.color} ${s.at}%`)
            .join(', ')})`
    )
    const hasAngle = $derived(gradient.type === 'linear' || gradient.type === 'conic')
    const hasOrigin = $derived(gradient.type === 'radial' || gradient.type === 'conic')
    const canRepeat = $derived(gradient.type !== 'mesh')
</script>

<div class="flex flex-col gap-y-2.5">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span class="rack-label">Type</span>
        <SegmentedControl
            size="xs"
            ariaLabel="Gradient type"
            value={gradient.type}
            onValueChange={(v) => patch({ type: v as GradientKind })}
            options={[
                { label: 'Linear', value: 'linear' },
                { label: 'Radial', value: 'radial' },
                { label: 'Conic', value: 'conic' },
                { label: 'Mesh', value: 'mesh', title: 'Soft blobs of each colour over the last' }
            ]}
        />
        <span class="flex-1"></span>
        {#if canRepeat}
            <label
                class="flex items-center gap-x-2 text-xs text-ink-fg-2"
                title="Repeats the colours from the last stop outward: rings from a radial, stripes from a linear, spokes from a conic. Put the last stop early, say 20 %, for a tight pattern."
            >
                <Switch
                    checked={Boolean(gradient.repeat)}
                    onCheckedChange={(v) => patch({ repeat: v })}
                    aria-label="Repeat"
                />
                Repeat
            </label>
        {/if}
        <label
            class="flex items-center gap-x-2 text-xs text-ink-fg-2"
            title="Slowly moves the gradient; held still under Reduce motion"
        >
            <Switch
                checked={gradient.drift}
                onCheckedChange={(v) => patch({ drift: v })}
                aria-label="Drift"
            />
            Drift
        </label>
    </div>

    <div
        class="h-3 rounded-full border border-hairline"
        style="background: {bar}"
        role="img"
        aria-label="The gradient's colours in order"
    ></div>

    <div class="flex flex-col gap-y-1.5">
        {#each gradient.stops as stop, i (i)}
            <div class="flex items-center gap-x-2">
                <ColourField
                    label={`${i + 1}`}
                    value={stop.color}
                    onChange={(hex) => setStop(i, { color: hex })}
                />
                <div class="flex-1">
                    <CustomSlider
                        type="single"
                        min={0}
                        max={100}
                        step={1}
                        value={stop.at}
                        label={`Stop ${i + 1} position`}
                        onValueChange={(v) => setStop(i, { at: v as number })}
                    />
                </div>
                <span class="w-8 text-right font-mono text-[11px] text-ink-fg-2">{stop.at}%</span>
                <button
                    type="button"
                    onclick={() => removeStop(i)}
                    disabled={gradient.stops.length <= GRADIENT_STOPS_MIN}
                    aria-label={`Remove stop ${i + 1}`}
                    class="inline-flex size-6 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-2 hover:text-ink-fg disabled:opacity-30 disabled:hover:bg-transparent"
                >
                    <X class="size-3.5" />
                </button>
            </div>
        {/each}
        <button
            type="button"
            onclick={addStop}
            disabled={gradient.stops.length >= GRADIENT_STOPS_MAX}
            class="inline-flex items-center gap-x-1 self-start text-xs text-signal hover:underline disabled:text-ink-dim disabled:no-underline"
        >
            <Plus class="size-3" strokeWidth={2.5} />
            Add a stop · up to {GRADIENT_STOPS_MAX}
        </button>
    </div>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        {#if hasAngle}
            <div class="flex flex-1 items-center gap-x-2">
                <span class="rack-label">Angle</span>
                <div class="flex-1">
                    <CustomSlider
                        type="single"
                        min={0}
                        max={360}
                        step={5}
                        value={gradient.angle}
                        label="Angle"
                        onValueChange={(v) => patch({ angle: v as number })}
                    />
                </div>
                <span class="w-9 text-right font-mono text-[11px] text-ink-fg-2"
                    >{gradient.angle}°</span
                >
            </div>
        {/if}
        {#if gradient.type === 'radial'}
            <div class="flex items-center gap-x-2">
                <span class="rack-label">Shape</span>
                <SegmentedControl
                    size="xs"
                    ariaLabel="Radial shape"
                    value={gradient.shape ?? 'ellipse'}
                    onValueChange={(v) => patch({ shape: v as RadialShape })}
                    options={[
                        { label: 'Ellipse', value: 'ellipse', title: 'Stretched to the window' },
                        { label: 'Circle', value: 'circle', title: 'Round, as rings should be' }
                    ]}
                />
            </div>
        {/if}
        {#if hasOrigin}
            <div class="flex items-center gap-x-2">
                <span class="rack-label">Origin</span>
                <AnchorGrid
                    value={gradient.origin}
                    onChange={(origin) => patch({ origin })}
                    label="Gradient origin"
                />
            </div>
        {/if}
    </div>

    <div class="flex flex-col gap-y-1.5">
        <span class="rack-label">Presets</span>
        <div class="grid grid-cols-12 gap-1.5">
            {#each presets as preset (preset.name)}
                <button
                    type="button"
                    title={preset.name}
                    aria-label={`Preset ${preset.name}`}
                    onclick={() => onChange({ ...preset.gradient, drift: gradient.drift })}
                    class="h-7 rounded-md border border-hairline transition-shadow hover:border-hairline-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                    style="background: {gradientCss(preset.gradient)}"
                ></button>
            {/each}
        </div>
    </div>
</div>
