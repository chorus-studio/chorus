<script lang="ts">
    import { onDestroy } from 'svelte'
    import { toast } from 'svelte-sonner'
    import ChevronLeft from '@lucide/svelte/icons/chevron-left'
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
    import {
        completePalette,
        parseSpicetifyIni,
        seedFromSwatches,
        toSpicetifyIni
    } from '$lib/utils/look-palette'
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

    // The look editor, laid out for the drawer that sits over Spotify's live
    // page (LookDrawer): three tabs (Panels, Palette, Backdrop), the legibility
    // readout in the footer so it is seen from any tab, and no preview sketch,
    // because the page around the drawer is the preview. Everything edits a draft; the
    // page shows the draft as it changes (onPreview) and nothing is stored
    // until Save. A picture dropped here is stored at once under a fresh id,
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
    let iniOpen = $state(false)
    let iniText = $state('')
    /** While Hold to compare is held, the page wears the saved look instead of the draft. */
    let comparing = $state(false)
    /** A remix or a saved look opens on its backdrop; a blank new look starts with colours. */
    let tab = $state<'panels' | 'palette' | 'backdrop'>(
        original.backdrop || original.palette.kind === 'backdrop' ? 'backdrop' : 'palette'
    )

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
        { label: 'Backdrop', value: 'backdrop', title: 'Colours read from the backdrop itself' },
        { label: 'Colours', value: 'colours', title: 'Two colours derive all fifteen' },
        { label: 'Built-in', value: 'builtin' },
        ...(paletteKind === 'slots'
            ? [{ label: 'Advanced', value: 'slots', title: 'Every slot by hand' }]
            : []),
        { label: 'Album art', value: 'cover', title: 'Colours read from the playing cover' }
    ])

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

    function applyIni() {
        const schemes = parseSpicetifyIni(iniText)
        if (!schemes.length) {
            toast.error('No colour scheme found in that text.')
            return
        }
        draft.palette = { kind: 'slots', colours: completePalette(schemes[0].colours) }
        if (schemes[0].name && schemes[0].name !== 'Imported' && isNew) draft.name = schemes[0].name
        iniOpen = false
        iniText = ''
        toast.success(`Scheme “${schemes[0].name}” applied.`)
    }

    async function copyIni() {
        try {
            await navigator.clipboard.writeText(toSpicetifyIni(draft.name || 'Chorus', rawPalette))
            toast.success('Copied as a Spicetify color.ini scheme.')
        } catch {
            toast.error('The clipboard is not available here.')
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
        { id: 'panels', label: 'Panels' },
        { id: 'palette', label: 'Palette' },
        { id: 'backdrop', label: 'Backdrop' }
    ] as const
    const TAB = 'flex flex-col gap-y-2.5 px-4 py-3.5'
    const HINT = 'text-[11px] leading-snug text-ink-muted'
    const SLIDER_HEAD = 'flex items-center justify-between'
    const VALUE = 'font-mono text-[11px] text-ink-fg-2'
</script>

<div class="flex min-h-0 flex-col">
    <div class="flex items-center gap-x-2 border-b border-hairline px-3 py-2.5">
        <Button
            variant="ghost"
            size="icon-sm"
            onclick={cancel}
            aria-label="Back to the looks"
            title="Back to the looks"
        >
            <ChevronLeft class="size-4" />
        </Button>
        <Input
            bind:value={draft.name}
            class="h-8 min-w-0 flex-1 text-sm font-semibold"
            aria-label="Look name"
        />
        <Button
            variant="outline"
            size="icon-sm"
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
            <Eye class="size-3.5" />
        </Button>
        <Button size="sm" onclick={save}>Save</Button>
    </div>

    <Tabs.Root bind:value={tab} class="flex min-h-0 flex-1 flex-col">
        <Tabs.List
            class="h-9 w-full shrink-0 justify-start gap-x-4 rounded-none border-0 border-b border-hairline bg-transparent px-4 py-0"
        >
            {#each TABS as t (t.id)}
                <Tabs.Trigger
                    value={t.id}
                    class="relative h-9 rounded-none px-0.5 text-xs after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-sm after:bg-transparent after:content-[''] data-[state=active]:bg-transparent data-[state=active]:after:bg-signal"
                >
                    {t.label}
                </Tabs.Trigger>
            {/each}
        </Tabs.List>
        <div class="chorus-scroll min-h-0 flex-1 overflow-y-auto">
            <Tabs.Content value="panels" class="mt-0">
                <div class={TAB}>
                    <div class={SLIDER_HEAD}>
                        <span class="rack-label">Show-through</span>
                        <span class={VALUE}
                            >{shownShowThrough} %{followsDefault ? ' · default' : ''}</span
                        >
                    </div>
                    <CustomSlider
                        type="single"
                        min={0}
                        max={SHOW_THROUGH_MAX}
                        step={5}
                        value={shownShowThrough}
                        label="Show-through"
                        disabled={!draft.backdrop || followsDefault}
                        onValueChange={(v) =>
                            (draft.panels = { ...draft.panels, showThrough: v as number })}
                    />
                    <label class="flex items-center gap-x-2 text-xs text-ink-fg-2">
                        <Switch
                            checked={followsDefault}
                            disabled={!draft.backdrop}
                            onCheckedChange={(on) =>
                                (draft.panels = {
                                    ...draft.panels,
                                    showThrough: on ? null : defaultShowThrough
                                })}
                            aria-label="Follow the default show-through"
                        />
                        <span>
                            Follow the default
                            <span class="text-ink-muted"
                                >· {defaultShowThrough} %, set on the theme page</span
                            >
                        </span>
                    </label>
                    <span class={HINT}>
                        How much of the backdrop shows through the library, main view and bars. 0 %
                        keeps them solid; at 100 % they vanish, and Glass keeps the text readable
                        over the blur. Most looks can follow the default; set a value here when this
                        one wants its own.
                    </span>
                    <label class="mt-1 flex items-center gap-x-2 text-xs text-ink-fg-2">
                        <Switch
                            checked={draft.panels.glass}
                            disabled={!draft.backdrop}
                            onCheckedChange={(v) => (draft.panels = { ...draft.panels, glass: v })}
                            aria-label="Glass on Spotify's panels"
                        />
                        <span>
                            Glass on Spotify's panels
                            <span class="text-ink-muted">· blurs the backdrop behind them</span>
                        </span>
                    </label>
                    <div class="mt-1 flex items-center justify-between gap-x-2">
                        <span class="rack-label">Surfaces</span>
                        <SegmentedControl
                            size="xs"
                            ariaLabel="Surfaces"
                            value={draft.panels.surfaces ?? 'clear'}
                            onValueChange={(v) =>
                                (draft.panels = { ...draft.panels, surfaces: v as Surfaces })}
                            options={[
                                {
                                    label: 'Clear',
                                    value: 'clear',
                                    title: 'Translucent, with a soft shadow'
                                },
                                {
                                    label: 'Tinted',
                                    value: 'tinted',
                                    title: "The palette's card colour"
                                }
                            ]}
                        />
                    </div>
                    <span class={HINT}>
                        Clear: the search pill, the home button and Chorus's trays go translucent
                        with a soft shadow over the backdrop. Tinted: they take the palette's card
                        colour.
                    </span>
                    {#if !draft.backdrop}
                        <span class={HINT}>These apply once the look has a backdrop.</span>
                    {/if}
                </div>
            </Tabs.Content>
            <Tabs.Content value="palette" class="mt-0">
                <div class={TAB}>
                    <SegmentedControl
                        size="xs"
                        grow
                        ariaLabel="Palette source"
                        value={paletteKind}
                        onValueChange={setPaletteKind}
                        options={paletteOptions}
                    />

                    {#if draft.palette.kind === 'colours'}
                        {@const seed = draft.palette}
                        <div class="flex flex-wrap items-center gap-2">
                            <ColourField
                                label="Base"
                                value={rawPalette.main}
                                onChange={(hex) => setSeed({ base: hex })}
                            />
                            <ColourField
                                label="Accent"
                                value={rawPalette.button}
                                onChange={(hex) => setSeed({ accent: hex })}
                            />
                            <ColourField
                                label="Text"
                                value={rawPalette.text}
                                auto={!seed.text}
                                onChange={(hex) => setSeed({ text: hex })}
                            />
                            {#if seed.text}
                                <button
                                    type="button"
                                    class="text-[11px] text-signal hover:underline"
                                    onclick={() => setSeed({ text: undefined })}>Text auto</button
                                >
                            {/if}
                        </div>
                        <span class={HINT}>
                            The base sets the surfaces (a darker sidebar, card and hover a step up,
                            the frame above them); the accent fills the controls, lifted until it
                            reads; text is light or dark by contrast unless you pick one.
                        </span>
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
                        <span class={HINT}
                            >Any of the built-in palettes as the colour half of this look.</span
                        >
                    {:else if draft.palette.kind === 'backdrop'}
                        <span class={HINT}>
                            The base and accent are read from the backdrop: a gradient's widest stop
                            and the stop furthest from it in hue, a picture's colours, or the
                            playing cover. Change the backdrop and the palette follows.
                            {#if !draft.backdrop}
                                No backdrop yet, so Spotify's colours stand in.
                            {:else if draft.backdrop.kind === 'image' && !draft.palette.seed}
                                Reading the picture…
                            {/if}
                        </span>
                    {:else if draft.palette.kind === 'cover'}
                        <span class={HINT}>
                            The base and accent are read from the playing cover, as Match palette
                            reads them, and change with the music. Light makes a pale version of
                            each.
                            {#if !$nowPlaying.cover}
                                Nothing is playing now, so Spotify's colours stand in.
                            {/if}
                        </span>
                    {:else}
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
                        <span class={HINT}>The fifteen slots are Spicetify's keys one for one.</span
                        >
                    {/if}

                    <div class="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="xs"
                            onclick={() => (iniOpen = !iniOpen)}
                            title="A Spicetify colour scheme becomes this look's palette, every slot as written"
                        >
                            Paste a Spicetify color.ini
                        </Button>
                        <Button
                            variant="outline"
                            size="xs"
                            onclick={copyIni}
                            title="The palette as it stands, as a Spicetify scheme"
                        >
                            Copy as color.ini
                        </Button>
                    </div>
                    {#if iniOpen}
                        <textarea
                            bind:value={iniText}
                            rows="5"
                            spellcheck="false"
                            placeholder={'[Scheme]\ntext = ffffff\nmain = 121212\nbutton = 1ed760\n…'}
                            aria-label="Spicetify color.ini text"
                            class="w-full rounded-md border border-hairline bg-inset px-2 py-1.5 font-mono text-[11px] text-ink-fg outline-none placeholder:text-ink-dim focus-visible:border-signal/60"
                        ></textarea>
                        <div class="flex items-center gap-x-2">
                            <Button size="xs" onclick={applyIni}>Apply scheme</Button>
                            <Button variant="ghost" size="xs" onclick={() => (iniOpen = false)}
                                >Close</Button
                            >
                        </div>
                    {/if}

                    <div class="flex gap-0.5" aria-label="The palette's colours">
                        {#each ['main', 'sidebar', 'shadow', 'card', 'button_disabled', 'button', 'button_active', 'subtext', 'text'] as slot (slot)}
                            <span
                                class="h-2 flex-1 rounded-[2px] border border-hairline"
                                style="background: {colours[slot as CSSVariable]}"
                                title={SLOT_LABELS[slot as CSSVariable]}
                            ></span>
                        {/each}
                    </div>
                </div>
            </Tabs.Content>
            <Tabs.Content value="backdrop" class="mt-0">
                <div class={TAB}>
                    <SegmentedControl
                        size="xs"
                        grow
                        ariaLabel="Backdrop kind"
                        value={backdropKind}
                        onValueChange={setBackdropKind}
                        options={[
                            { label: 'None', value: 'none' },
                            { label: 'Gradient', value: 'gradient' },
                            {
                                label: 'Image',
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
                        <span class={HINT}>The frame keeps the palette's own colour.</span>
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
                        <div class="grid grid-cols-3 gap-x-3">
                            <div class="flex flex-col gap-y-1">
                                <div class={SLIDER_HEAD}>
                                    <span class="rack-label">Blur</span><span class={VALUE}
                                        >{cover.blur} px</span
                                    >
                                </div>
                                <CustomSlider
                                    type="single"
                                    min={0}
                                    max={IMAGE_BLUR_MAX}
                                    step={2}
                                    value={cover.blur}
                                    label="Blur"
                                    onValueChange={(v) => setCover({ blur: v as number })}
                                />
                            </div>
                            <div class="flex flex-col gap-y-1">
                                <div class={SLIDER_HEAD}>
                                    <span class="rack-label">Dim</span><span class={VALUE}
                                        >{cover.dim} %</span
                                    >
                                </div>
                                <CustomSlider
                                    type="single"
                                    min={0}
                                    max={IMAGE_DIM_MAX}
                                    step={5}
                                    value={cover.dim}
                                    label="Dim"
                                    onValueChange={(v) => setCover({ dim: v as number })}
                                />
                            </div>
                            <div class="flex flex-col gap-y-1">
                                <div class={SLIDER_HEAD}>
                                    <span class="rack-label">Zoom</span><span class={VALUE}
                                        >{cover.zoom} %</span
                                    >
                                </div>
                                <CustomSlider
                                    type="single"
                                    min={COVER_ZOOM_MIN}
                                    max={COVER_ZOOM_MAX}
                                    step={5}
                                    value={cover.zoom}
                                    label="Zoom"
                                    onValueChange={(v) => setCover({ zoom: v as number })}
                                />
                            </div>
                        </div>
                        <span class={HINT}>
                            The playing track's cover, enlarged so the blur's soft edge stays off
                            screen, washed with the frame colour. It changes with the music; the
                            palette stays yours.
                        </span>
                    {/if}
                </div>
            </Tabs.Content>
        </div>
    </Tabs.Root>

    <div class="flex flex-col gap-y-2 border-t border-hairline px-4 pb-2.5 pt-2">
        <div class="flex items-center gap-x-2">
            <span class="rack-label">Legibility</span>
            <span class={HINT}>on the palette's own colours</span>
        </div>
        <div class="flex flex-wrap gap-1.5">
            {#each checks as check (check.label)}
                {@const ok = check.ratio >= check.min}
                <span
                    class="inline-flex items-center gap-x-1 rounded-sm border border-hairline px-1.5 py-0.5 font-mono text-[10px] text-ink-fg-2"
                    title={ok
                        ? `${check.label}: ${check.ratio.toFixed(1)}:1, at least ${check.min}:1 needed`
                        : `${check.label}: ${check.ratio.toFixed(1)}:1, below the ${check.min}:1 needed`}
                >
                    {#if ok}
                        <Check class="size-2.5 text-signal" strokeWidth={3} />
                    {:else}
                        <TriangleAlert class="size-2.5 text-amber" />
                    {/if}
                    {check.label}
                    {check.ratio.toFixed(1)}
                </span>
            {/each}
        </div>
    </div>

    <div class="flex items-center justify-between gap-x-3 border-t border-hairline px-4 py-2.5">
        <span class={HINT}>
            {isNew ? 'A new look: nothing is kept until Save.' : 'Editing a saved look.'} The page around
            this drawer shows it as you go.
        </span>
        <Button variant="outline" size="sm" onclick={cancel}>Cancel</Button>
    </div>
</div>
