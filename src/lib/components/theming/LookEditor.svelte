<script lang="ts">
    import { onDestroy } from 'svelte'
    import { toast } from 'svelte-sonner'
    import X from '@lucide/svelte/icons/x'
    import Eye from '@lucide/svelte/icons/eye'
    import Check from '@lucide/svelte/icons/check'
    import TriangleAlert from '@lucide/svelte/icons/triangle-alert'
    import { Button } from '$lib/components/ui/button'
    import { Switch } from '$lib/components/ui/switch'
    import { Input } from '$lib/components/ui/input'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import { CustomSelect } from '$lib/components/ui/custom-select'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'
    import * as Tabs from '$lib/components/ui/tabs'
    import ColourField from './ColourField.svelte'
    import ColourRow from './ColourRow.svelte'
    import GradientEditor from './GradientEditor.svelte'
    import ImageBackdropEditor from './ImageBackdropEditor.svelte'
    import { settingsStore } from '$lib/stores/settings'
    import { nowPlaying } from '$lib/stores/now-playing'
    import {
        THEME_NAMES,
        resolveMode,
        resolvePalette,
        type CSSVariable,
        type ThemeName
    } from '$lib/utils/theming'
    import { lookColours } from '$lib/utils/look-preview'
    import { contrastRatio } from '$lib/utils/popup-palette'
    import { seedFromSwatches } from '$lib/utils/look-palette'
    import { imageSwatches } from '$lib/utils/vibrant-colors'
    import { playingPalette } from '$lib/utils/cover-palette'
    import { deleteWallpaper } from '$lib/utils/wallpapers'
    import {
        COVER_ZOOM_MAX,
        COVER_ZOOM_MIN,
        DEFAULT_COVER,
        DEFAULT_GRADIENT,
        IMAGE_BLUR_MAX,
        IMAGE_DIM_MAX,
        SHOW_THROUGH_MAX,
        resolveShowThrough,
        type Backdrop,
        type BackdropKind,
        type ImageBackdrop,
        type Look,
        type PaletteSource,
        type Surfaces
    } from '$lib/types/look'

    // The look editor, laid out for the card that floats over Spotify's live
    // page (LookDrawer): three tabs in the order a look is made (Backdrop,
    // Palette, Panels), one control to a row at 13 px, the legibility
    // verdict in the footer so it is seen from any tab, and no preview
    // sketch, because the page around the card is the preview. Everything
    // edits a draft; the page shows the draft as it changes (onPreview) and
    // nothing is stored until Save. A picture dropped here is stored at once under a fresh id,
    // so Cancel (or a later Replace) can throw the unused ones away.
    let {
        look,
        isNew,
        onSave,
        onCancel,
        onPreview
    }: {
        look: Look
        isNew: boolean
        onSave: (look: Look) => void
        onCancel: () => void
        /** Show this look on the page now; null puts the saved state back. */
        onPreview: (look: Look | null) => void
    } = $props()

    // The prop may arrive as reactive state; a snapshot is a plain object structuredClone accepts.
    const original = $state.snapshot(look) as Look
    let draft = $state<Look>(structuredClone(original))
    let backdropKind = $state<BackdropKind | 'none'>(original.backdrop?.kind ?? 'none')
    /** Each kind's last settings, so switching away and back loses nothing. */
    const remembered: Partial<Record<BackdropKind, Backdrop>> = original.backdrop
        ? { [original.backdrop.kind]: structuredClone(original.backdrop) }
        : {}
    const originalFileId =
        original.backdrop?.kind === 'image' && original.backdrop.source.type === 'file'
            ? original.backdrop.source.id
            : null
    /** Wallpaper ids stored during this session; all but the one kept are deleted on the way out. */
    const uploaded: string[] = []
    /** While Hold to compare is held, the page wears the saved look instead of the draft. */
    let comparing = $state(false)
    /** Every look opens on its backdrop: it is chosen first, the palette and the panels follow from it. */
    let tab = $state<'panels' | 'palette' | 'backdrop'>('backdrop')

    const defaultShowThrough = $derived($settingsStore.theme.showThrough)
    const followsDefault = $derived(draft.panels.showThrough === null)
    const shownShowThrough = $derived(resolveShowThrough(draft.panels, defaultShowThrough))

    const mode = $derived(resolveMode($settingsStore.theme.appearance))
    // The cover's palette lands a beat after the cover; the colours follow it.
    const colours = $derived.by(() => {
        void $playingPalette
        return lookColours(draft, mode)
    })
    const rawPalette = $derived.by(() => {
        void $playingPalette
        return resolvePalette(draft.palette, draft.backdrop)
    })

    // A palette read from a picture keeps the colours it read as its seed,
    // taken once per picture, so the page and the file carry them along.
    let seededFrom: string | null = null
    $effect(() => {
        const palette = draft.palette
        const backdrop = draft.backdrop
        if (palette.kind !== 'backdrop' || backdrop?.kind !== 'image') return
        const url =
            backdrop.info?.thumb ?? (backdrop.source.type === 'url' ? backdrop.source.url : null)
        if (!url || url === seededFrom) return
        seededFrom = url
        let stale = false
        imageSwatches(url)
            .then((swatches) => {
                const seed = seedFromSwatches(swatches, 'dark')
                if (!stale && seed && draft.palette.kind === 'backdrop') {
                    draft.palette = { kind: 'backdrop', seed }
                }
            })
            .catch(() => undefined)
        return () => {
            stale = true
        }
    })

    const checks = $derived([
        { label: 'Text on panel', ratio: contrastRatio(colours.main, colours.text), min: 4.5 },
        { label: 'Accent on panel', ratio: contrastRatio(colours.main, colours.button), min: 3 },
        {
            label: 'Subtext on hover',
            ratio: contrastRatio(colours.button_disabled, colours.subtext),
            min: 4.5
        }
    ])
    const failing = $derived(checks.find((check) => check.ratio < check.min))

    // The page follows the draft a beat behind the controls, and the saved look while comparing.
    let previewTimer: ReturnType<typeof setTimeout> | null = null
    $effect(() => {
        const snapshot = $state.snapshot(draft) as Look
        const held = comparing
        if (previewTimer) clearTimeout(previewTimer)
        previewTimer = setTimeout(() => {
            previewTimer = null
            onPreview(held ? null : snapshot)
        }, 60)
    })

    onDestroy(() => {
        if (previewTimer) clearTimeout(previewTimer)
    })

    // ---- palette ----

    const paletteKind = $derived(draft.palette.kind)
    // Every slot by hand is hidden until a look has them (a pasted Spicetify
    // scheme, an imported look): fifteen bare colour slots mean little without
    // a map of where each lands on the page.
    const paletteOptions = $derived([
        {
            label: 'From backdrop',
            value: 'backdrop',
            title: 'Colours read from the backdrop itself'
        },
        { label: 'Custom', value: 'colours', title: 'Two colours set all fifteen slots' },
        { label: 'Built-in', value: 'builtin' },
        ...(paletteKind === 'slots'
            ? [{ label: 'Advanced', value: 'slots', title: 'Every slot by hand' }]
            : []),
        { label: 'From cover', value: 'cover', title: 'Colours read from the playing cover' }
    ])
    /** One line under the source picker: what this source does, and why the colours may be stand-ins. */
    const sourceHint = $derived.by(() => {
        switch (draft.palette.kind) {
            case 'backdrop':
                return `The base and accent are read from the backdrop and follow it when it changes.${
                    !draft.backdrop
                        ? " No backdrop yet, so Spotify's colours stand in."
                        : draft.backdrop.kind === 'image' && !draft.palette.seed
                          ? ' Reading the picture…'
                          : ''
                }`
            case 'colours':
                return 'Two colours set all fifteen slots. Pick the surface and the accent; text picks itself.'
            case 'builtin':
                return 'Any built-in palette as the colour half of this look.'
            case 'cover':
                return `Read from the playing cover and changing with the music.${
                    $nowPlaying.cover
                        ? ''
                        : " Nothing is playing now, so Spotify's colours stand in."
                }`
            default:
                return "Every slot by hand, Spicetify's keys one for one."
        }
    })
    /** The surfaces and text the palette paints most of the page with, as a row of swatches. */
    const SWATCHES: Array<{ slot: CSSVariable; label: string }> = [
        { slot: 'main', label: 'Main' },
        { slot: 'card', label: 'Card' },
        { slot: 'button_disabled', label: 'Hover' },
        { slot: 'button', label: 'Accent' },
        { slot: 'text', label: 'Text' }
    ]

    function setPaletteKind(kind: string) {
        if (kind === draft.palette.kind) return
        const current = rawPalette
        if (kind === 'colours') {
            draft.palette = { kind: 'colours', base: current.main, accent: current.button }
        } else if (kind === 'builtin') {
            draft.palette = { kind: 'builtin', name: 'spotify' }
        } else if (kind === 'cover') {
            draft.palette = { kind: 'cover' }
        } else if (kind === 'backdrop') {
            seededFrom = null
            draft.palette = { kind: 'backdrop' }
        } else {
            draft.palette = { kind: 'slots', colours: { ...current } }
        }
    }

    function setSeed(changes: Partial<Extract<PaletteSource, { kind: 'colours' }>>) {
        if (draft.palette.kind !== 'colours') return
        draft.palette = { ...draft.palette, ...changes }
    }

    function setSlot(slot: CSSVariable, hex: string) {
        if (draft.palette.kind !== 'slots') return
        draft.palette = { kind: 'slots', colours: { ...draft.palette.colours, [slot]: hex } }
    }

    async function matchToBackdrop(backdrop: ImageBackdrop) {
        const url =
            backdrop.info?.thumb ?? (backdrop.source.type === 'url' ? backdrop.source.url : null)
        if (!url) return
        try {
            const seed = seedFromSwatches(await imageSwatches(url), mode)
            if (!seed) {
                toast.message('No colour to read in that picture.')
                return
            }
            draft.palette = { kind: 'colours', ...seed }
        } catch {
            toast.error('The picture could not be read for colours.')
        }
    }

    const SLOT_LABELS: Record<CSSVariable, string> = {
        text: 'text',
        subtext: 'subtext',
        main: 'main',
        sidebar: 'sidebar',
        player: 'player',
        card: 'card',
        shadow: 'shadow',
        selected_row: 'selected row',
        button: 'button',
        button_active: 'button active',
        button_disabled: 'button disabled',
        tab_active: 'tab active',
        notification: 'notification',
        notification_error: 'error',
        misc: 'misc'
    }

    const themeLabel = (name: string) =>
        name === 'spotify'
            ? 'Spotify'
            : name === 'artic'
              ? 'Arctic'
              : name
                    .split('_')
                    .join(' ')
                    .replace(/^\w/, (c) => c.toUpperCase())

    // ---- backdrop ----

    function setBackdropKind(kind: string) {
        if (draft.backdrop)
            remembered[draft.backdrop.kind] = $state.snapshot(draft.backdrop) as Backdrop
        backdropKind = kind as BackdropKind | 'none'
        if (kind === 'none') draft.backdrop = null
        else if (kind === 'gradient')
            draft.backdrop = remembered.gradient ?? structuredClone(DEFAULT_GRADIENT)
        else if (kind === 'cover') draft.backdrop = remembered.cover ?? { ...DEFAULT_COVER }
        else draft.backdrop = remembered.image ?? null
    }

    function setImage(backdrop: ImageBackdrop) {
        if (backdrop.source.type === 'file' && !uploaded.includes(backdrop.source.id)) {
            uploaded.push(backdrop.source.id)
        }
        draft.backdrop = backdrop
    }

    /** A fresh storage id per upload, under the look's own. */
    const nextWallpaperId = () => `${draft.id}.${Date.now().toString(36)}`

    function setCover(changes: Partial<Extract<Backdrop, { kind: 'cover' }>>) {
        if (draft.backdrop?.kind !== 'cover') return
        draft.backdrop = { ...draft.backdrop, ...changes }
    }

    // ---- leaving ----

    async function discard(ids: string[]) {
        await Promise.all(ids.map((id) => deleteWallpaper(id).catch(() => undefined)))
    }

    async function save() {
        const final = $state.snapshot(draft) as Look
        const keep =
            final.backdrop?.kind === 'image' && final.backdrop.source.type === 'file'
                ? final.backdrop.source.id
                : null
        const stale = uploaded.filter((id) => id !== keep)
        if (originalFileId && originalFileId !== keep) stale.push(originalFileId)
        await discard(stale)
        onSave(final)
    }

    async function cancel() {
        await discard(uploaded)
        onCancel()
    }

    const TABS = [
        { id: 'backdrop', label: 'Backdrop' },
        { id: 'palette', label: 'Palette' },
        { id: 'panels', label: 'Panels' }
    ] as const
    const TAB = 'flex flex-col gap-y-5 px-5 py-[18px]'
    const HINT = 'text-xs leading-snug text-ink-muted'
    const LABEL = 'text-[13px] font-semibold text-ink-fg'
    const MONO = 'font-mono text-[11px] uppercase tracking-[0.12em] text-ink-fg-2'
    const VALUE = 'font-mono text-xs text-ink-fg-2'
    const ROW =
        'flex items-center justify-between gap-x-3 rounded-[10px] border border-hairline bg-inset px-3 py-2.5'
</script>

{#snippet sliderRow(
    label: string,
    shown: string,
    min: number,
    max: number,
    step: number,
    current: number,
    onChange: (v: number) => void,
    hint = '',
    disabled = false
)}
    <div class="flex flex-col gap-y-1.5">
        <div class="flex items-center justify-between">
            <span class={LABEL}>{label}</span>
            <span class={VALUE}>{shown}</span>
        </div>
        <CustomSlider
            type="single"
            {min}
            {max}
            {step}
            value={current}
            {label}
            {disabled}
            onValueChange={(v) => onChange(v as number)}
        />
        {#if hint}
            <span class={HINT}>{hint}</span>
        {/if}
    </div>
{/snippet}

<div class="flex h-full min-h-0 flex-col">
    <div class="flex items-center gap-x-2.5 border-b border-hairline px-4 py-3">
        <Input
            bind:value={draft.name}
            placeholder="Name this look"
            class="h-9 min-w-0 flex-1 text-[15px] font-semibold"
            aria-label="Look name"
        />
        <Button
            variant="outline"
            class="gap-x-1.5 px-3"
            aria-label="Hold to compare with the saved look"
            title="Hold to see the look you had before these changes"
            aria-pressed={comparing}
            onpointerdown={() => (comparing = true)}
            onpointerup={() => (comparing = false)}
            onpointerleave={() => (comparing = false)}
            onpointercancel={() => (comparing = false)}
            onkeydown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault()
                    comparing = true
                }
            }}
            onkeyup={() => (comparing = false)}
            onblur={() => (comparing = false)}
        >
            <Eye class="size-4" />
            Before
        </Button>
        <Button
            variant="ghost"
            size="icon"
            onclick={cancel}
            aria-label="Close the editor"
            title="Close without saving"
        >
            <X class="size-[18px]" />
        </Button>
    </div>

    <Tabs.Root bind:value={tab} class="flex min-h-0 flex-1 flex-col">
        <Tabs.List
            class="h-11 w-full shrink-0 justify-start gap-x-6 rounded-none border-0 border-b border-hairline bg-transparent px-5 py-0"
        >
            {#each TABS as t (t.id)}
                <Tabs.Trigger
                    value={t.id}
                    class="relative h-11 rounded-none px-0.5 text-[13px] font-medium text-ink-fg-2 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-sm after:bg-transparent after:content-[''] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-ink-fg data-[state=active]:after:bg-signal"
                >
                    {t.label}
                </Tabs.Trigger>
            {/each}
        </Tabs.List>
        <div class="chorus-scroll min-h-0 flex-1 overflow-y-auto">
            <Tabs.Content value="backdrop" class="mt-0">
                <div class={TAB}>
                    <SegmentedControl
                        size="md"
                        grow
                        ariaLabel="Backdrop kind"
                        value={backdropKind}
                        onValueChange={setBackdropKind}
                        options={[
                            { label: 'None', value: 'none' },
                            { label: 'Gradient', value: 'gradient' },
                            {
                                label: 'Picture',
                                value: 'image',
                                title: 'A picture, GIF or video loop'
                            },
                            {
                                label: 'Album art',
                                value: 'cover',
                                title: 'The playing cover, blurred'
                            }
                        ]}
                    />

                    {#if backdropKind === 'none'}
                        <span class={HINT}>
                            No backdrop: the frame keeps the palette's own colour and the panels
                            stay solid.
                        </span>
                    {:else if backdropKind === 'gradient' && draft.backdrop?.kind === 'gradient'}
                        <GradientEditor
                            gradient={draft.backdrop}
                            onChange={(g) => (draft.backdrop = g)}
                        />
                    {:else if backdropKind === 'image'}
                        <ImageBackdropEditor
                            backdrop={draft.backdrop?.kind === 'image' ? draft.backdrop : null}
                            wallpaperId={nextWallpaperId()}
                            onChange={setImage}
                            onMatch={matchToBackdrop}
                        />
                    {:else if backdropKind === 'cover' && draft.backdrop?.kind === 'cover'}
                        {@const cover = draft.backdrop}
                        {@render sliderRow(
                            'Blur',
                            `${cover.blur} px`,
                            0,
                            IMAGE_BLUR_MAX,
                            2,
                            cover.blur,
                            (v) => setCover({ blur: v })
                        )}
                        {@render sliderRow(
                            'Dim',
                            `${cover.dim} %`,
                            0,
                            IMAGE_DIM_MAX,
                            5,
                            cover.dim,
                            (v) => setCover({ dim: v })
                        )}
                        {@render sliderRow(
                            'Zoom',
                            `${cover.zoom} %`,
                            COVER_ZOOM_MIN,
                            COVER_ZOOM_MAX,
                            5,
                            cover.zoom,
                            (v) => setCover({ zoom: v })
                        )}
                        <span class={HINT}>
                            The playing cover, enlarged past the blur's soft edge and washed with
                            the frame colour. It changes with the music; the palette stays yours.
                        </span>
                    {/if}
                </div>
            </Tabs.Content>

            <Tabs.Content value="palette" class="mt-0">
                <div class={TAB}>
                    <div class="flex flex-col gap-y-2">
                        <SegmentedControl
                            size="md"
                            grow
                            ariaLabel="Where the colours come from"
                            value={paletteKind}
                            onValueChange={setPaletteKind}
                            options={paletteOptions}
                        />
                        <span class={HINT}>{sourceHint}</span>
                    </div>

                    {#if draft.palette.kind === 'colours'}
                        {@const seed = draft.palette}
                        <div class="flex flex-col gap-y-2">
                            <ColourRow
                                label="Base"
                                hint="Sidebar, main view and bars; card and hover a step up"
                                value={rawPalette.main}
                                onChange={(hex) => setSeed({ base: hex })}
                            />
                            <ColourRow
                                label="Accent"
                                hint="Buttons, the play disc, the active tab; lifted until it reads"
                                value={rawPalette.button}
                                onChange={(hex) => setSeed({ accent: hex })}
                            />
                            <ColourRow
                                label="Text"
                                hint="Light or dark by contrast with the base"
                                value={rawPalette.text}
                                auto={!seed.text}
                                onAutoChange={(on) =>
                                    setSeed({ text: on ? undefined : rawPalette.text })}
                                onChange={(hex) => setSeed({ text: hex })}
                            />
                        </div>
                    {:else if draft.palette.kind === 'builtin'}
                        <CustomSelect
                            size="sm"
                            selected={draft.palette.name}
                            onValueChange={(name) =>
                                (draft.palette = { kind: 'builtin', name: name as ThemeName })}
                            options={THEME_NAMES.map((name) => ({
                                label: themeLabel(name),
                                value: name
                            }))}
                        />
                    {:else if draft.palette.kind === 'slots'}
                        <div class="grid grid-cols-2 gap-1.5">
                            {#each Object.keys(SLOT_LABELS) as slot (slot)}
                                <ColourField
                                    label={SLOT_LABELS[slot as CSSVariable]}
                                    value={rawPalette[slot as CSSVariable]}
                                    onChange={(hex) => setSlot(slot as CSSVariable, hex)}
                                    class="w-full"
                                />
                            {/each}
                        </div>
                    {/if}

                    <div class="flex flex-col gap-y-2">
                        <span class={MONO}>What you get</span>
                        <div
                            class="grid grid-cols-5 gap-1.5"
                            role="img"
                            aria-label="The palette's main surfaces and text"
                        >
                            {#each SWATCHES as swatch (swatch.slot)}
                                <div class="flex flex-col gap-y-1">
                                    <span
                                        class="h-9 rounded-lg border border-hairline"
                                        style="background: {colours[swatch.slot]}"
                                    ></span>
                                    <span class="text-center text-[11px] text-ink-muted"
                                        >{swatch.label}</span
                                    >
                                </div>
                            {/each}
                        </div>
                    </div>

                    <div class="flex flex-col gap-y-2">
                        <span class={MONO}>Legibility</span>
                        {#each checks as check (check.label)}
                            {@const ok = check.ratio >= check.min}
                            <div
                                class="flex items-center justify-between gap-x-3 text-[13px] text-ink-fg-2"
                            >
                                <span class="inline-flex items-center gap-x-2">
                                    {#if ok}
                                        <Check class="size-3.5 text-signal" strokeWidth={3} />
                                    {:else}
                                        <TriangleAlert class="size-3.5 text-amber" />
                                    {/if}
                                    {check.label}
                                </span>
                                <span class={VALUE}
                                    >{check.ratio.toFixed(1)} : 1{ok
                                        ? ''
                                        : ` · needs ${check.min}`}</span
                                >
                            </div>
                        {/each}
                    </div>
                </div>
            </Tabs.Content>

            <Tabs.Content value="panels" class="mt-0">
                <div class={TAB}>
                    {#if !draft.backdrop}
                        <div
                            class="flex flex-col items-start gap-y-2.5 rounded-[10px] border border-dashed border-hairline-strong px-4 py-4"
                        >
                            <span class={LABEL}>Nothing shows through yet.</span>
                            <span class={HINT}>
                                These settings shape how a backdrop shows through the library, the
                                main view and the bars. Choose one first.
                            </span>
                            <Button variant="outline" size="sm" onclick={() => (tab = 'backdrop')}
                                >Choose a backdrop</Button
                            >
                        </div>
                    {:else}
                        {@render sliderRow(
                            'Show-through',
                            `${shownShowThrough} %`,
                            0,
                            SHOW_THROUGH_MAX,
                            5,
                            shownShowThrough,
                            (v) => (draft.panels = { ...draft.panels, showThrough: v }),
                            'How much of the backdrop comes through the library, main view and bars. 0 % is solid, 100 % is clear.',
                            followsDefault
                        )}
                        <div class={ROW}>
                            <div class="flex min-w-0 flex-col gap-y-0.5">
                                <span class={LABEL}>Follow the default</span>
                                <span class={HINT}>
                                    {defaultShowThrough} % today, set on the theme page. Off, this look
                                    keeps its own value.
                                </span>
                            </div>
                            <Switch
                                checked={followsDefault}
                                onCheckedChange={(on) =>
                                    (draft.panels = {
                                        ...draft.panels,
                                        showThrough: on ? null : defaultShowThrough
                                    })}
                                aria-label="Follow the default show-through"
                            />
                        </div>
                        <div class={ROW}>
                            <div class="flex min-w-0 flex-col gap-y-0.5">
                                <span class={LABEL}>Glass</span>
                                <span class={HINT}>
                                    Blurs the backdrop behind each panel, so text stays readable at
                                    high show-through.
                                </span>
                            </div>
                            <Switch
                                checked={draft.panels.glass}
                                onCheckedChange={(v) =>
                                    (draft.panels = { ...draft.panels, glass: v })}
                                aria-label="Glass on the panels"
                            />
                        </div>
                        <div class="flex flex-col gap-y-2">
                            <div class="flex items-center justify-between gap-x-3">
                                <span class={LABEL}>Bar controls</span>
                                <SegmentedControl
                                    size="sm"
                                    ariaLabel="Bar controls"
                                    value={draft.panels.surfaces ?? 'clear'}
                                    onValueChange={(v) =>
                                        (draft.panels = {
                                            ...draft.panels,
                                            surfaces: v as Surfaces
                                        })}
                                    options={[
                                        {
                                            label: 'Frosted',
                                            value: 'clear',
                                            title: 'See-through, with a soft shadow'
                                        },
                                        {
                                            label: 'Solid',
                                            value: 'tinted',
                                            title: "The palette's card colour"
                                        }
                                    ]}
                                />
                            </div>
                            <span class={HINT}>
                                The search box, the home button and Chorus's trays. Frosted lets the
                                backdrop through with a soft shadow; Solid paints them in the
                                palette's card colour.
                            </span>
                        </div>
                    {/if}
                </div>
            </Tabs.Content>
        </div>
    </Tabs.Root>

    <div
        class="flex items-center justify-between gap-x-3 border-t border-hairline bg-ink/30 px-5 py-3"
    >
        {#if failing}
            <span
                class="inline-flex min-w-0 items-center gap-x-2 text-xs text-ink-fg-2"
                title={`${failing.label}: ${failing.ratio.toFixed(1)}:1, at least ${failing.min}:1 needed`}
            >
                <TriangleAlert class="size-3.5 shrink-0 text-amber" />
                <span class="truncate"
                    >{failing.label} is faint, {failing.ratio.toFixed(1)} : 1</span
                >
            </span>
        {:else}
            <span class="inline-flex items-center gap-x-2 text-xs text-ink-fg-2">
                <Check class="size-3.5 shrink-0 text-signal" strokeWidth={3} />
                Readable on its own colours
            </span>
        {/if}
        <div class="flex shrink-0 items-center gap-x-2">
            <Button variant="outline" onclick={cancel}>Cancel</Button>
            <Button onclick={save}>Save look</Button>
        </div>
    </div>
</div>
