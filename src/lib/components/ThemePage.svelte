<script lang="ts">
    import { get } from 'svelte/store'
    import { toast } from 'svelte-sonner'
    import Check from '@lucide/svelte/icons/check'
    import Plus from '@lucide/svelte/icons/plus'
    import Search from '@lucide/svelte/icons/search'
    import Ellipsis from '@lucide/svelte/icons/ellipsis'
    import Upload from '@lucide/svelte/icons/upload'
    import X from '@lucide/svelte/icons/x'
    import Palette from '@lucide/svelte/icons/palette'
    import { Switch } from '$lib/components/ui/switch'
    import { Button } from '$lib/components/ui/button'
    import { Input } from '$lib/components/ui/input'
    import * as Popover from '$lib/components/ui/popover'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'
    import LookSketch from './theming/LookSketch.svelte'
    import { settingsStore, type Appearance } from '$lib/stores/settings'
    import { looksStore, ownLooks, findLook } from '$lib/stores/looks'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { openLookEditor, remixForEditing } from '$lib/stores/look-editor'
    import { THEME_NAMES, applyLook, resolveMode, type ThemeName } from '$lib/utils/theming'
    import { lookSketch, paletteSketch, type Sketch } from '$lib/utils/look-preview'
    import { playingPalette } from '$lib/utils/cover-palette'
    import { LookFileError, parseLookFile } from '$lib/utils/look-file'
    import { saveTextFile } from '$lib/utils/save-file'
    import { extensionVersion } from '$lib/utils/extension-version'
    import { closeThemePage } from '$lib/utils/theme-route'
    import { BUILTIN_LOOKS, SHOW_THROUGH_MAX, newLook, type Look } from '$lib/types/look'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import { cn } from '$lib/utils.js'

    // The theme page across Spotify's main view: the content script mounts
    // this over the main view while the URL carries #chorus/theme and removes
    // it when the URL changes (Back, a sidebar click). The sidebar, top bar
    // and player bar stay, and they wear whatever is picked here as it is
    // picked, so the page is its own preview. A filter rail on the left, one
    // grid of looks and palettes on the right; editing opens the drawer
    // (theming/LookDrawer) over the live page, and this page steps aside.
    // Every control writes settings or the looks store; App.svelte re-applies
    // the look from there, so the popup and PiP follow the same path.

    type Item = {
        id: string
        kind: 'palette' | 'look'
        label: string
        sketch: Sketch
        mine: boolean
        builtIn: boolean
        hidden: boolean
    }
    type Filter = 'all' | 'looks' | 'palettes' | 'mine'

    let filter = $state<Filter>('all')
    let query = $state('')
    let showHidden = $state(false)
    let menuFor = $state<string | null>(null)
    let confirmDelete = $state<string | null>(null)
    let fileInput = $state<HTMLInputElement | null>(null)
    let importing = $state(false)

    const label = (theme: string) =>
        theme === 'spotify'
            ? 'Spotify (default)'
            : theme === 'artic'
              ? 'Arctic'
              : theme
                    .split('_')
                    .join(' ')
                    .replace(/^\w/, (c) => c.toUpperCase())

    // Each card shows the page as it will wear it: inverted for a light
    // appearance, on the frame colour the page derives, under the look's backdrop.
    const mode = $derived(resolveMode($settingsStore.theme.appearance))
    const hidden = $derived(new Set($looksStore.hiddenBuiltIn))
    const items = $derived.by<Item[]>(() => {
        const cover = $nowPlaying.cover
        const through = $settingsStore.theme.showThrough
        // A look whose palette follows the cover redraws when that palette is read.
        void $playingPalette
        const mine = ownLooks($looksStore).map((look) => ({
            id: look.id,
            kind: 'look' as const,
            label: look.name,
            sketch: lookSketch(look, mode, cover, through),
            mine: true,
            builtIn: false,
            hidden: false
        }))
        const builtin = BUILTIN_LOOKS.map((look) => ({
            id: look.id,
            kind: 'look' as const,
            label: look.name,
            sketch: lookSketch(look, mode, cover, through),
            mine: false,
            builtIn: true,
            hidden: hidden.has(look.id)
        }))
        const palettes = THEME_NAMES.map((name) => ({
            id: name,
            kind: 'palette' as const,
            label: label(name),
            sketch: paletteSketch(name, mode),
            mine: false,
            builtIn: true,
            hidden: hidden.has(name)
        }))
        return [...mine, ...builtin, ...palettes]
    })
    const hiddenCount = $derived(items.filter((item) => item.hidden).length)
    const matches = (item: Item, f: Filter) =>
        f === 'all' ||
        (f === 'looks' && item.kind === 'look') ||
        (f === 'palettes' && item.kind === 'palette') ||
        (f === 'mine' && item.mine)
    const filters = $derived(
        (
            [
                { id: 'all', label: 'All' },
                { id: 'looks', label: 'Looks' },
                { id: 'palettes', label: 'Palettes' },
                { id: 'mine', label: 'Mine' }
            ] as { id: Filter; label: string }[]
        ).map((f) => ({
            ...f,
            count: items.filter((item) => matches(item, f.id) && !item.hidden).length
        }))
    )
    const visible = $derived.by(() => {
        const q = query.trim().toLowerCase()
        return items.filter((item) => {
            if (item.hidden && !showHidden) return false
            if (!matches(item, filter)) return false
            return !q || item.label.toLowerCase().includes(q)
        })
    })

    function isSelected(item: Item): boolean {
        const { look, name } = $settingsStore.theme
        return item.kind === 'look' ? item.id === look : !look && item.id === name
    }

    // Picking a card applies it, and the "Apply theme" switch follows.
    async function select(item: Item) {
        const theme = $settingsStore.theme
        if (item.kind === 'palette') {
            await settingsStore.updateSettings({
                theme: { ...theme, name: item.id as ThemeName, look: null },
                ui: { ...$settingsStore.ui, theme: item.id !== 'spotify' }
            })
        } else {
            await settingsStore.updateSettings({
                theme: { ...theme, look: item.id },
                ui: { ...$settingsStore.ui, theme: true }
            })
        }
    }

    async function toggleApply(enabled: boolean) {
        await settingsStore.updateSettings({ ui: { ...$settingsStore.ui, theme: enabled } })
    }

    async function setAppearance(value: string) {
        await settingsStore.updateSettings({
            theme: { ...$settingsStore.theme, appearance: value as Appearance }
        })
    }

    // The default show-through paints live and persists a beat later, so a
    // drag doesn't write storage (and re-run the look in every window) per pixel.
    let showThrough = $state($settingsStore.theme.showThrough)
    let showThroughTimer: ReturnType<typeof setTimeout> | null = null
    function setShowThrough(value: number) {
        showThrough = value
        const settings = {
            ...$settingsStore,
            theme: { ...$settingsStore.theme, showThrough: value }
        }
        void applyLook(settings, get(looksStore))
        if (showThroughTimer) clearTimeout(showThroughTimer)
        showThroughTimer = setTimeout(() => {
            showThroughTimer = null
            settingsStore.updateSettings({ theme: settings.theme })
        }, 200)
    }

    // Radio-group keyboard pattern: arrows move within the grid (its column
    // count read off the first row) and select as they go, Home/End jump to
    // the ends, Tab lands on the current one.
    function onKeydown(e: KeyboardEvent) {
        const group = e.currentTarget as HTMLElement
        const cards = [...group.querySelectorAll<HTMLElement>('[data-item]')]
        const top = cards[0]?.offsetTop
        const columns = Math.max(1, cards.filter((card) => card.offsetTop === top).length)
        const current = visible.findIndex(isSelected)
        const last = visible.length - 1
        const moves: Record<string, number> = {
            ArrowRight: current + 1,
            ArrowLeft: current - 1,
            ArrowDown: current + columns,
            ArrowUp: current - columns,
            Home: 0,
            End: last
        }
        const next = moves[e.key]
        if (next === undefined) return
        e.preventDefault()
        if (next < 0 || next > last) return
        const item = visible[next]
        select(item)
        group.querySelector<HTMLElement>(`[data-item="${item.id}"]`)?.focus()
    }

    // ---- the menu ----

    async function duplicate(item: Item) {
        menuFor = null
        if (item.kind === 'palette') {
            // A palette's remix is a new look built on it.
            openLookEditor(
                newLook({
                    name: looksStore.uniqueName(label(item.id).replace(' (default)', '')),
                    palette: { kind: 'builtin', name: item.id as ThemeName }
                }),
                true
            )
            return
        }
        // A remix (or a duplicate) opens as an unsaved draft, like New look: Save creates it.
        const source = findLook($looksStore, item.id)
        if (!source) return
        const name = looksStore.uniqueName(source.builtIn ? source.name : `${source.name} copy`)
        openLookEditor(await remixForEditing(source, name), true)
    }

    async function setHidden(item: Item, value: boolean) {
        menuFor = null
        await looksStore.setHidden(item.id, value)
    }

    async function remove(item: Item) {
        menuFor = null
        confirmDelete = null
        const wasActive = $settingsStore.theme.look === item.id
        await looksStore.deleteLook(item.id)
        if (wasActive) {
            await settingsStore.updateSettings({ theme: { ...$settingsStore.theme, look: null } })
        }
        toast.success(`“${item.label}” deleted.`)
    }

    async function exportItem(item: Item) {
        menuFor = null
        try {
            const file = await looksStore.exportLook(item.id, extensionVersion())
            if (!file) return
            saveTextFile(file.name, file.text)
            toast.success(`“${item.label}” saved to your downloads.`)
        } catch (error) {
            console.error('[chorus] look export:', error)
            toast.error('Could not save that look.')
        }
    }

    async function onLookFileChosen(event: Event) {
        const input = event.currentTarget as HTMLInputElement
        const file = input.files?.[0]
        // Clear the input so the same file can be chosen again after a cancel.
        input.value = ''
        if (!file) return
        importing = true
        try {
            const parsed = parseLookFile(await file.text())
            const saved = await looksStore.importLook(parsed)
            await settingsStore.updateSettings({
                theme: { ...$settingsStore.theme, look: saved.id },
                ui: { ...$settingsStore.ui, theme: true }
            })
            if (parsed.missingPicture) {
                toast.message(`Imported “${saved.name}” without its picture.`, {
                    description: 'The file did not carry it; add one in the editor.'
                })
            } else toast.success(`Imported “${saved.name}”.`)
        } catch (error) {
            toast.error(
                error instanceof LookFileError ? error.message : 'Could not read that file.'
            )
        } finally {
            importing = false
        }
    }

    // ---- the editor (a drawer over the live page; this page steps aside) ----

    function startNew() {
        openLookEditor(
            newLook({
                name: looksStore.uniqueName('New look'),
                // The palette reads itself from whatever backdrop the new look gets.
                palette: { kind: 'backdrop' }
            }),
            true
        )
    }

    function editItem(item: Item) {
        menuFor = null
        const look = $looksStore.looks[item.id]
        if (look) openLookEditor(structuredClone(look), false)
    }

    const RAIL_BUTTON =
        'flex h-[34px] w-full items-center justify-between rounded-md px-2.5 text-left text-[13px] text-ink-fg-2 hover:bg-surface-2 hover:text-ink-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal aria-pressed:bg-surface-2 aria-pressed:text-ink-fg'
    const MENU_ITEM =
        'flex w-full items-center rounded-sm px-2 py-1.5 text-left text-xs text-ink-fg-2 hover:bg-surface-2 hover:text-ink-fg focus-visible:outline-none focus-visible:bg-surface-2'
    const HINT = 'text-[11px] leading-snug text-ink-muted'
</script>

<div
    id="chorus-theme-page-root"
    class="chorus-theme-page dark absolute inset-0 z-[9] flex flex-col text-ink-fg"
    role="region"
    aria-label="Theme"
>
    <!-- Floats over the content, outside the scroller, so it is at hand however far down the grid is. -->
    <button
        type="button"
        id="chorus-theme-page-close"
        aria-label="Close the theme page"
        title="Close"
        onclick={closeThemePage}
        class="absolute right-6 top-5 z-10 inline-flex size-10 items-center justify-center rounded-full bg-ink-fg text-ink shadow-float ring-1 ring-ink/10 transition hover:scale-105 hover:bg-ink-fg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal motion-reduce:transition-none"
    >
        <X class="size-5" strokeWidth={2.5} />
    </button>

    <div class="chorus-scroll min-h-0 flex-1 overflow-y-auto">
        <div class="mx-auto flex w-full max-w-[1480px] flex-col gap-y-5 px-8 pb-20 pt-6">
            <div class="flex items-center gap-x-4 pr-16">
                <span
                    class="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface text-ink-fg shadow-float"
                >
                    <Palette class="size-6" />
                </span>
                <div class="flex min-w-0 flex-col gap-y-1">
                    <h1 class="text-[28px] font-bold leading-none tracking-tight text-ink-fg">
                        Theme
                    </h1>
                    <p class="text-sm text-ink-muted">
                        Looks and palettes for the Spotify web player. Everything you pick shows on
                        this page as you pick it.
                    </p>
                </div>
                <span class="flex-1"></span>
                <Button
                    variant="outline"
                    size="sm"
                    onclick={() => fileInput?.click()}
                    disabled={importing}
                    title="Add a look from a chorus-look file"
                >
                    <Upload class="size-3.5" />
                    Import
                </Button>
                <Button size="sm" onclick={startNew}>
                    <Plus class="size-3.5" strokeWidth={2.5} />
                    New look
                </Button>
                <input
                    bind:this={fileInput}
                    type="file"
                    accept=".json,application/json"
                    class="hidden"
                    tabindex="-1"
                    aria-hidden="true"
                    onchange={onLookFileChosen}
                />
            </div>

            <div class="flex items-start gap-x-6">
                <!-- A frosted card, bordered like Spotify's own panels, so the rail stays
                     legible over whatever the backdrop and the grid put behind it. Under
                     the glass setting it takes the rack's glass material (.chorus-float). -->
                <aside
                    class="chorus-float sticky top-4 flex w-[228px] shrink-0 flex-col gap-y-1 self-start rounded-xl border border-hairline-strong bg-ink/80 p-2 shadow-float backdrop-blur-xl backdrop-saturate-150"
                >
                    <div class="relative mb-1.5">
                        <Search
                            class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted"
                        />
                        <Input
                            type="search"
                            bind:value={query}
                            placeholder="Search looks"
                            aria-label="Search looks"
                            class="h-[34px] pl-8 text-[13px]"
                        />
                    </div>
                    {#each filters as f (f.id)}
                        <button
                            type="button"
                            class={RAIL_BUTTON}
                            aria-pressed={filter === f.id}
                            onclick={() => (filter = f.id)}
                        >
                            <span>{f.label}</span>
                            <span class="font-mono text-[11px] text-ink-muted">{f.count}</span>
                        </button>
                    {/each}
                    <span class="mx-1 my-2 border-t border-hairline"></span>
                    <button
                        type="button"
                        class={RAIL_BUTTON}
                        aria-pressed={showHidden}
                        onclick={() => (showHidden = !showHidden)}
                        disabled={hiddenCount === 0}
                    >
                        <span>Show hidden</span>
                        <span class="font-mono text-[11px] text-ink-muted">{hiddenCount}</span>
                    </button>
                    <span class="mx-1 my-2 border-t border-hairline"></span>
                    <div class="flex flex-col gap-y-2 px-2.5 py-1">
                        <label class="flex h-6 items-center gap-x-2 text-xs text-ink-fg-2">
                            <Switch
                                checked={$settingsStore.ui.theme}
                                onCheckedChange={toggleApply}
                                aria-label="Apply theme"
                            />
                            Apply theme
                        </label>
                        <span class={HINT}>Off, Spotify wears its own colours again.</span>
                    </div>
                    <div class="flex flex-col gap-y-2 px-2.5 py-2">
                        <div class="flex items-center justify-between">
                            <span class="rack-label">Show-through</span>
                            <span class="font-mono text-[11px] text-ink-fg-2">{showThrough} %</span>
                        </div>
                        <CustomSlider
                            type="single"
                            min={0}
                            max={SHOW_THROUGH_MAX}
                            step={5}
                            value={showThrough}
                            label="Default show-through"
                            onValueChange={(v) => setShowThrough(v as number)}
                        />
                        <span class={HINT}>
                            How much of a backdrop shows through the panels, for every look without
                            a value of its own; the editor can set one per look.
                        </span>
                    </div>
                    <div class="flex flex-col gap-y-2 px-2.5 py-2">
                        <span class="rack-label">Appearance</span>
                        <SegmentedControl
                            size="xs"
                            ariaLabel="Appearance"
                            value={$settingsStore.theme.appearance}
                            onValueChange={setAppearance}
                            options={[
                                { label: 'Dark', value: 'dark' },
                                {
                                    label: 'Light',
                                    value: 'light',
                                    title: 'A pale version of any look'
                                },
                                { label: 'System', value: 'system', title: 'Follow the OS setting' }
                            ]}
                        />
                        <span class={HINT}>
                            Light makes a pale version of any look; System follows your OS.
                        </span>
                    </div>
                    <div class="flex flex-col gap-y-1 px-2.5 py-2">
                        <span class="rack-label">Shortcuts</span>
                        <span class={HINT}>
                            Alt+Shift+] and Alt+Shift+[ step through what is not hidden. The popup
                            and glass settings stay in Chorus settings › Theme.
                        </span>
                    </div>
                </aside>

                <div class="min-w-0 flex-1">
                    <div
                        class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-4 gap-y-5"
                        role="radiogroup"
                        aria-label="Theme"
                        tabindex="-1"
                        onkeydown={onKeydown}
                    >
                        <button
                            type="button"
                            onclick={startNew}
                            class="group flex flex-col gap-y-2 text-left focus-visible:outline-none"
                            aria-label="New look"
                        >
                            <span
                                class="flex h-[132px] w-full items-center justify-center rounded-lg border border-dashed border-hairline-strong bg-panel transition-colors group-hover:border-ink-dim group-focus-visible:ring-2 group-focus-visible:ring-signal"
                            >
                                <span
                                    class="inline-flex size-8 items-center justify-center rounded-full bg-surface-2 text-ink-fg"
                                >
                                    <Plus class="size-4" strokeWidth={2.5} />
                                </span>
                            </span>
                            <span class="text-[13px] text-ink-fg-2">New look</span>
                        </button>

                        {#each visible as item (item.kind + ':' + item.id)}
                            {@const selected = isSelected(item)}
                            <div class="group relative flex flex-col gap-y-2">
                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    tabindex={selected ? 0 : -1}
                                    data-item={item.id}
                                    onclick={() => select(item)}
                                    class="flex flex-col gap-y-2 text-left focus-visible:outline-none [&:focus-visible>span:first-child]:ring-2 [&:focus-visible>span:first-child]:ring-signal"
                                >
                                    <LookSketch
                                        sketch={item.sketch}
                                        {selected}
                                        class={cn(
                                            'h-[132px] group-hover:border-hairline-strong',
                                            item.hidden && 'opacity-60'
                                        )}
                                    />
                                    <span
                                        class="flex items-center gap-x-1.5 text-[13px] {selected
                                            ? 'text-ink-fg'
                                            : 'text-ink-fg-2'}"
                                    >
                                        <span class="truncate">{item.label}</span>
                                        {#if item.mine}
                                            <span
                                                class="rounded-sm border border-hairline px-1 font-mono text-[9px] uppercase tracking-wider text-ink-muted"
                                                >Mine</span
                                            >
                                        {/if}
                                        {#if item.hidden}
                                            <span
                                                class="rounded-sm border border-hairline px-1 font-mono text-[9px] uppercase tracking-wider text-ink-muted"
                                                >Hidden</span
                                            >
                                        {/if}
                                    </span>
                                </button>

                                {#if selected}
                                    <span
                                        class="pointer-events-none absolute right-2 top-2 inline-flex size-5 items-center justify-center rounded-full bg-signal text-signal-fg"
                                    >
                                        <Check class="size-3" strokeWidth={3} />
                                    </span>
                                {/if}

                                <Popover.Root
                                    open={menuFor === item.id}
                                    onOpenChange={(open) => {
                                        menuFor = open ? item.id : null
                                        if (!open) confirmDelete = null
                                    }}
                                >
                                    <Popover.Trigger
                                        class={cn(
                                            'absolute left-2 top-2 inline-flex size-6 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity hover:bg-black/75 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal group-focus-within:opacity-100 group-hover:opacity-100',
                                            menuFor === item.id && 'opacity-100'
                                        )}
                                        aria-label={`Options for ${item.label}`}
                                    >
                                        <Ellipsis class="size-3.5" />
                                    </Popover.Trigger>
                                    <Popover.Content align="start" sideOffset={2} class="w-48 p-1">
                                        {#if confirmDelete === item.id}
                                            <div class="flex flex-col gap-y-1.5 px-2 py-1.5">
                                                <span class="text-xs text-ink-fg"
                                                    >Delete “{item.label}”?</span
                                                >
                                                <div class="flex items-center gap-x-1.5">
                                                    <Button
                                                        variant="destructive"
                                                        size="xs"
                                                        onclick={() => remove(item)}>Delete</Button
                                                    >
                                                    <Button
                                                        variant="ghost"
                                                        size="xs"
                                                        onclick={() => (confirmDelete = null)}
                                                        >Keep</Button
                                                    >
                                                </div>
                                            </div>
                                        {:else}
                                            {#if item.mine}
                                                <button
                                                    type="button"
                                                    class={MENU_ITEM}
                                                    onclick={() => editItem(item)}>Edit</button
                                                >
                                            {/if}
                                            <button
                                                type="button"
                                                class={MENU_ITEM}
                                                onclick={() => duplicate(item)}
                                            >
                                                {item.builtIn ? 'Remix as a new look' : 'Duplicate'}
                                            </button>
                                            {#if item.kind === 'look'}
                                                <button
                                                    type="button"
                                                    class={MENU_ITEM}
                                                    onclick={() => exportItem(item)}
                                                    title="Save this look as a file to share or keep"
                                                    >Export…</button
                                                >
                                            {/if}
                                            {#if item.builtIn}
                                                <button
                                                    type="button"
                                                    class={MENU_ITEM}
                                                    onclick={() => setHidden(item, !item.hidden)}
                                                >
                                                    {item.hidden ? 'Show' : 'Hide'}
                                                </button>
                                            {/if}
                                            {#if item.mine}
                                                <button
                                                    type="button"
                                                    class="{MENU_ITEM} text-alarm hover:text-alarm"
                                                    onclick={() => (confirmDelete = item.id)}
                                                    >Delete…</button
                                                >
                                            {/if}
                                        {/if}
                                    </Popover.Content>
                                </Popover.Root>
                            </div>
                        {/each}
                    </div>

                    {#if visible.length === 0}
                        <span class="text-xs text-ink-muted">
                            Nothing matches. {filter === 'mine'
                                ? 'Make a look with New look, or remix a built-in from its menu.'
                                : ''}
                        </span>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    /* Spotify's own main background, themed by Chorus when a theme is on; under a
       backdrop theme.css makes it one of the translucent panels. */
    .chorus-theme-page {
        background: var(--background-base, #121212);
    }
</style>
