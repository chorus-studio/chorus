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
    import LookSketch from './LookSketch.svelte'
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
    import { lookColours, lookSketch } from '$lib/utils/look-preview'
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
        SHOW_THROUGH_MAX_LIGHT,
        type Backdrop,
        type BackdropKind,
        type ImageBackdrop,
        type Look,
        type PaletteSource
    } from '$lib/types/look'

    // The Theme tab's drill-down for one look. Everything edits a draft; the
    // page previews the draft live (onPreview) and nothing is stored until
    // Save. A picture dropped here is stored at once under a fresh id, so
    // Cancel (or a later Replace) can throw the unused ones away.
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
    let previewOn = $state(true)
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

    const mode = $derived(resolveMode($settingsStore.theme.appearance))
    // The cover's palette lands a beat after the cover; the preview follows it.
    const sketch = $derived.by(() => {
        void $playingPalette
        return lookSketch(draft, mode, $nowPlaying.cover)
    })
    const colours = $derived.by(() => {
        void $playingPalette
        return lookColours(draft, mode)
    })
    const rawPalette = $derived.by(() => {
        void $playingPalette
        return resolvePalette(draft.palette)
    })
    const showThroughMax = $derived(mode === 'light' ? SHOW_THROUGH_MAX_LIGHT : SHOW_THROUGH_MAX)

    const checks = $derived([
        { label: 'Text on panel', ratio: contrastRatio(colours.main, colours.text), min: 4.5 },
        { label: 'Accent on panel', ratio: contrastRatio(colours.main, colours.button), min: 3 },
        {
            label: 'Subtext on hover',
            ratio: contrastRatio(colours.button_disabled, colours.subtext),
            min: 4.5
        }
    ])

    // The page follows the draft a beat behind the controls.
    let previewTimer: ReturnType<typeof setTimeout> | null = null
    $effect(() => {
        const snapshot = $state.snapshot(draft) as Look
        const on = previewOn
        if (previewTimer) clearTimeout(previewTimer)
        previewTimer = setTimeout(() => {
            previewTimer = null
            onPreview(on ? snapshot : null)
        }, 60)
    })

    function peek(on: boolean) {
        document.documentElement.toggleAttribute('data-chorus-peek', on)
    }

    onDestroy(() => {
        peek(false)
        if (previewTimer) clearTimeout(previewTimer)
    })

    // ---- palette ----

    const paletteKind = $derived(draft.palette.kind)

    function setPaletteKind(kind: string) {
        if (kind === draft.palette.kind) return
        const current = rawPalette
        if (kind === 'colours') {
            draft.palette = { kind: 'colours', base: current.main, accent: current.button }
        } else if (kind === 'builtin') {
            draft.palette = { kind: 'builtin', name: 'spotify' }
        } else if (kind === 'cover') {
            draft.palette = { kind: 'cover' }
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

    const BOX = 'flex flex-col gap-y-2.5 rounded-md border border-hairline bg-panel px-3 py-2.5'
    const HINT = 'text-[11px] leading-snug text-ink-muted'
    const SLIDER_HEAD = 'flex items-center justify-between'
    const VALUE = 'font-mono text-[11px] text-ink-fg-2'
</script>

<div class="flex flex-col gap-y-3">
    <div class="flex items-center gap-x-2.5">
        <Button variant="ghost" size="sm" onclick={cancel} aria-label="Back to the theme list">
            <ChevronLeft class="size-4" />
            Theme
        </Button>
        <label class="flex items-center gap-x-2">
            <span class="rack-label">Name</span>
            <Input bind:value={draft.name} class="h-7 w-40 text-xs" aria-label="Look name" />
        </label>
        <span class="flex-1"></span>
        <label
            class="flex items-center gap-x-2 whitespace-nowrap text-xs text-ink-fg-2"
            title="Changes land on the page behind this dialog as you make them"
        >
            <Switch bind:checked={previewOn} aria-label="Preview on page" />
            Preview on page
        </label>
        <Button
            variant="outline"
            size="sm"
            title="Hold to hide this dialog and see the page"
            onpointerdown={() => peek(true)}
            onpointerup={() => peek(false)}
            onpointerleave={() => peek(false)}
            onpointercancel={() => peek(false)}
            onkeydown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault()
                    peek(true)
                }
            }}
            onkeyup={() => peek(false)}
            onblur={() => peek(false)}
        >
            <Eye class="size-3.5" />
            Hold to peek
        </Button>
        <Button variant="outline" size="sm" onclick={cancel}>Cancel</Button>
        <Button size="sm" onclick={save}>Save look</Button>
    </div>

    <div class="grid grid-cols-[300px_minmax(0,1fr)] gap-3">
        <div class="flex flex-col gap-y-2.5">
            <span class="rack-label">Preview</span>
            <div class="relative h-[212px] w-[300px] overflow-hidden rounded-lg">
                <div
                    class="absolute left-0 top-0 w-[136px] origin-top-left"
                    style="transform: scale(2.2059)"
                >
                    <LookSketch {sketch} />
                </div>
            </div>

            <div class={BOX}>
                <span class="rack-label">Panels</span>
                <div class="flex flex-col gap-y-1.5">
                    <div class={SLIDER_HEAD}>
                        <span class="text-xs text-ink-fg-2">Show-through</span>
                        <span class={VALUE}
                            >{Math.min(draft.panels.showThrough, showThroughMax)} %</span
                        >
                    </div>
                    <CustomSlider
                        type="single"
                        min={0}
                        max={SHOW_THROUGH_MAX}
                        step={5}
                        value={draft.panels.showThrough}
                        label="Show-through"
                        disabled={!draft.backdrop}
                        onValueChange={(v) =>
                            (draft.panels = { ...draft.panels, showThrough: v as number })}
                    />
                    <span class={HINT}>
                        How much of the backdrop shows through the library, main view and bars. 0 %
                        keeps them solid; Light caps it at {SHOW_THROUGH_MAX_LIGHT} %.
                    </span>
                </div>
                <label class="flex items-center gap-x-2 text-xs text-ink-fg-2">
                    <Switch
                        checked={draft.panels.glass}
                        disabled={!draft.backdrop}
                        onCheckedChange={(v) => (draft.panels = { ...draft.panels, glass: v })}
                        aria-label="Glass on Spotify's panels"
                    />
                    <span>
                        Glass on Spotify's panels
                        <span class="text-ink-muted"
                            >· blurs the backdrop behind them; heavy with a GIF</span
                        >
                    </span>
                </label>
            </div>

            <div class="flex flex-wrap gap-1.5" aria-label="Legibility checks">
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

        <div class="flex min-w-0 flex-col gap-y-2.5">
            <div class={BOX}>
                <div class="flex items-center justify-between gap-x-2">
                    <span class="rack-label">Palette</span>
                    <SegmentedControl
                        size="xs"
                        ariaLabel="Palette source"
                        value={paletteKind}
                        onValueChange={setPaletteKind}
                        options={[
                            {
                                label: 'From colours',
                                value: 'colours',
                                title: 'Two colours derive all fifteen'
                            },
                            { label: 'Built-in', value: 'builtin' },
                            { label: 'Advanced', value: 'slots', title: 'Every slot by hand' },
                            {
                                label: 'Album art',
                                value: 'cover',
                                title: 'Colours read from the playing cover'
                            }
                        ]}
                    />
                </div>

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
                        The base sets the surfaces (a darker sidebar, card and hover a step up, the
                        frame above them); the accent fills the controls, lifted until it reads;
                        text is light or dark by contrast unless you pick one.
                    </span>
                {:else if draft.palette.kind === 'builtin'}
                    <div class="flex items-center gap-x-3">
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
                    </div>
                {:else if draft.palette.kind === 'cover'}
                    <span class={HINT}>
                        The base and accent are read from the playing cover, as Match palette reads
                        them, and change with the music. Light makes a pale version of each.
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
                    <div class="flex items-center gap-x-2">
                        <Button variant="outline" size="xs" onclick={() => (iniOpen = !iniOpen)}>
                            Paste a Spicetify color.ini
                        </Button>
                        <Button variant="outline" size="xs" onclick={copyIni}
                            >Copy as color.ini</Button
                        >
                        <span class={HINT}>The fifteen slots are Spicetify's keys one for one.</span
                        >
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

            <div class={BOX}>
                <div class="flex items-center justify-between gap-x-2">
                    <span class="rack-label">Backdrop</span>
                    <SegmentedControl
                        size="xs"
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
                </div>

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
                    <div class="grid grid-cols-3 gap-x-4">
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
                        screen, washed with the frame colour. It changes with the music; the palette
                        stays yours.
                    </span>
                {/if}
            </div>
        </div>
    </div>
</div>
