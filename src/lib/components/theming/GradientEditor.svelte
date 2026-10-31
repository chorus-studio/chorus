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
    import { cn } from '$lib/utils.js'

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
    /** The preset the gradient still is, until a stop or setting moves off it. */
    const activePreset = $derived(
        presets.find((preset) => gradientCss(preset.gradient) === gradientCss(gradient))?.name
    )

    const MONO = 'font-mono text-[11px] uppercase tracking-[0.12em] text-ink-fg-2'
    const HINT = 'text-xs leading-snug text-ink-muted'
    const VALUE = 'font-mono text-xs text-ink-fg-2'
</script>

<div class="flex flex-col gap-y-5">
    <div class="flex flex-col gap-y-2">
        <div class="flex items-baseline justify-between gap-x-3">
            <span class={MONO}>Start from</span>
            <span class={HINT}>{presets.length} presets · pick one, then tweak</span>
        </div>
        <div class="grid grid-cols-8 gap-1.5">
            {#each presets as preset (preset.name)}
                {@const active = preset.name === activePreset}
                <button
                    type="button"
                    title={preset.name}
                    aria-label={`Preset ${preset.name}`}
                    aria-pressed={active}
                    onclick={() => onChange({ ...preset.gradient, drift: gradient.drift })}
                    class={cn(
                        'h-9 rounded-lg border transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal',
                        active
                            ? 'border-signal ring-1 ring-signal'
                            : 'border-hairline hover:border-hairline-strong'
                    )}
                    style="background: {gradientCss(preset.gradient)}"
                ></button>
            {/each}
        </div>
    </div>

    <div class="flex flex-col gap-y-2.5">
        <div class="flex items-center justify-between gap-x-3">
            <span class={MONO}>Colours</span>
            <button
                type="button"
                onclick={addStop}
                disabled={gradient.stops.length >= GRADIENT_STOPS_MAX}
                class="inline-flex items-center gap-x-1 text-[13px] font-medium text-signal hover:underline disabled:text-ink-dim disabled:no-underline"
            >
                <Plus class="size-3.5" strokeWidth={2.5} />
                Add a stop · {gradient.stops.length} of {GRADIENT_STOPS_MAX}
            </button>
        </div>
        <div
            class="h-4 rounded-full border border-hairline"
            style="background: {bar}"
            role="img"
            aria-label="The gradient's colours in order"
        ></div>
        <div class="flex flex-col gap-y-1.5">
            {#each gradient.stops as stop, i (i)}
                <div class="flex h-10 items-center gap-x-2.5">
                    <ColourField
                        size="lg"
                        hideLabel
                        label={`Stop ${i + 1}`}
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
                    <span class="w-10 text-right {VALUE}">{stop.at}%</span>
                    <button
                        type="button"
                        onclick={() => removeStop(i)}
                        disabled={gradient.stops.length <= GRADIENT_STOPS_MIN}
                        aria-label={`Remove stop ${i + 1}`}
                        class="inline-flex size-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink-fg disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <X class="size-4" />
                    </button>
                </div>
            {/each}
        </div>
    </div>

    <div class="flex items-center justify-between gap-x-3">
        <span class={MONO}>Shape</span>
        <SegmentedControl
            size="sm"
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
    </div>
    {#if gradient.type === 'radial'}
        <div class="flex items-center justify-between gap-x-3">
            <span class={MONO}>Rings</span>
            <SegmentedControl
                size="sm"
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
        <div class="flex items-center justify-between gap-x-3">
            <div class="flex flex-col gap-y-0.5">
                <span class={MONO}>Origin</span>
                <span class={HINT}>Where the gradient starts</span>
            </div>
            <AnchorGrid
                value={gradient.origin}
                onChange={(origin) => patch({ origin })}
                label="Gradient origin"
            />
        </div>
    {/if}
    {#if hasAngle}
        <div class="flex flex-col gap-y-1.5">
            <div class="flex items-center justify-between">
                <span class={MONO}>Angle</span>
                <span class={VALUE}>{gradient.angle}°</span>
            </div>
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
    {/if}
    <div class="flex items-center justify-between gap-x-3">
        <span class={MONO}>Motion</span>
        <div class="flex items-center gap-x-5">
            <label
                class="flex items-center gap-x-2 text-[13px] text-ink-fg-2"
                title="Slowly moves the gradient; held still under Reduce motion"
            >
                <Switch
                    checked={gradient.drift}
                    onCheckedChange={(v) => patch({ drift: v })}
                    aria-label="Drift"
                />
                Drift
            </label>
            {#if canRepeat}
                <label
                    class="flex items-center gap-x-2 text-[13px] text-ink-fg-2"
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
        </div>
    </div>
</div>
