<script lang="ts">
    import { get } from 'svelte/store'
    import { toast } from 'svelte-sonner'
    import type { ThemeName } from '$lib/utils/theming'
    import {
        settingsStore,
        DEFAULT_GLASS,
        type Appearance,
        type PopupColours,
        type GlassSettings
    } from '$lib/stores/settings'
    import { looksStore, ownLooks } from '$lib/stores/looks'
    import { nowPlaying } from '$lib/stores/now-playing'
    import {
        applyGlass,
        applyLook,
        GLASS_BLUR_MIN,
        THEME_NAMES,
        lookById,
        resolveMode
    } from '$lib/utils/theming'
    import { lookSketch, paletteSketch, type Sketch } from '$lib/utils/look-preview'
    import { BUILTIN_LOOKS, newLook, type Look } from '$lib/types/look'

    import Check from '@lucide/svelte/icons/check'
    import Plus from '@lucide/svelte/icons/plus'
    import Search from '@lucide/svelte/icons/search'
    import Ellipsis from '@lucide/svelte/icons/ellipsis'
    import { Switch } from '$lib/components/ui/switch'
    import { Button } from '$lib/components/ui/button'
    import { Input } from '$lib/components/ui/input'
    import * as Popover from '$lib/components/ui/popover'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'
    import LookSketch from './theming/LookSketch.svelte'
    import LookEditor from './theming/LookEditor.svelte'
    import { cn } from '$lib/utils.js'

    // Every control here only writes settings (or the looks store): App.svelte
    // re-applies the look (page re-skin, backdrop, rack tokens, glass) whenever
    // they change, so the popup and PiP follow the same path as this dialog.

    async function toggleApply(enabled: boolean) {
        await settingsStore.updateSettings({ ui: { ...$settingsStore.ui, theme: enabled } })
    }

    async function setAppearance(value: string) {
        await settingsStore.updateSettings({
            theme: { ...$settingsStore.theme, appearance: value as Appearance }
        })
    }

    async function setPopupColours(value: string) {
        await settingsStore.updateSettings({
            theme: { ...$settingsStore.theme, popup: value as PopupColours }
        })
    }

    async function toggleGlass(enabled: boolean) {
        await settingsStore.updateSettings({ ui: { ...$settingsStore.ui, glass: enabled } })
    }

    // The glass sliders paint live and persist a beat later, so a drag doesn't
    // write storage (and re-run the look in every window) on every pixel.
    let glass = $state<GlassSettings>({ ...($settingsStore.theme.glass ?? DEFAULT_GLASS) })
    let persistTimer: ReturnType<typeof setTimeout> | null = null

    function setGlass(key: keyof GlassSettings, value: number) {
        glass = { ...glass, [key]: value }
        applyGlass({ ...$settingsStore, theme: { ...$settingsStore.theme, glass } })
        if (persistTimer) clearTimeout(persistTimer)
        persistTimer = setTimeout(() => {
            persistTimer = null
            settingsStore.updateSettings({ theme: { ...$settingsStore.theme, glass } })
        }, 200)
    }

    // ---- the cards ----

    type Item = {
        id: string
        kind: 'palette' | 'look'
        label: string
        sketch: Sketch
        mine: boolean
        builtIn: boolean
        hidden: boolean
    }
    type Filter = 'all' | 'palettes' | 'looks' | 'mine'

    let filter = $state<Filter>('all')
    let query = $state('')
    let showHidden = $state(false)
    let menuFor = $state<string | null>(null)
    let confirmDelete = $state<string | null>(null)
    // Raw: the editor clones the look, and a reactive proxy cannot be cloned.
    let editing = $state.raw<{ look: Look; isNew: boolean } | null>(null)

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
        const mine = ownLooks($looksStore).map((look) => ({
            id: look.id,
            kind: 'look' as const,
            label: look.name,
            sketch: lookSketch(look, mode, cover),
            mine: true,
            builtIn: false,
            hidden: false
        }))
        const builtin = BUILTIN_LOOKS.map((look) => ({
            id: look.id,
            kind: 'look' as const,
            label: look.name,
            sketch: lookSketch(look, mode, cover),
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
    const visible = $derived.by(() => {
        const q = query.trim().toLowerCase()
        return items.filter((item) => {
            if (item.hidden && !showHidden) return false
            if (filter === 'palettes' && item.kind !== 'palette') return false
            if (filter === 'looks' && item.kind !== 'look') return false
            if (filter === 'mine' && !item.mine) return false
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

    // Radio-group keyboard pattern: arrows move within the 5-column grid and
    // select as they go, Home/End jump to the ends, Tab lands on the current one.
    const COLUMNS = 5
    function onKeydown(e: KeyboardEvent) {
        const current = visible.findIndex(isSelected)
        const last = visible.length - 1
        const moves: Record<string, number> = {
            ArrowRight: current + 1,
            ArrowLeft: current - 1,
            ArrowDown: current + COLUMNS,
            ArrowUp: current - COLUMNS,
            Home: 0,
            End: last
        }
        const next = moves[e.key]
        if (next === undefined) return
        e.preventDefault()
        if (next < 0 || next > last) return
        const item = visible[next]
        select(item)
        const group = e.currentTarget as HTMLElement
        group.querySelector<HTMLElement>(`[data-item="${item.id}"]`)?.focus()
    }

    // ---- the menu ----

    async function duplicate(item: Item) {
        menuFor = null
        if (item.kind === 'palette') {
            // A palette's remix is a new look built on it.
            openEditor(
                newLook({
                    name: looksStore.uniqueName(label(item.id).replace(' (default)', '')),
                    palette: { kind: 'builtin', name: item.id as ThemeName }
                }),
                true
            )
            return
        }
        const copy = await looksStore.duplicateLook(item.id)
        if (copy) openEditor(copy, false)
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

    // ---- the editor ----

    function openEditor(look: Look, isNew: boolean) {
        editing = { look, isNew }
    }

    function startNew() {
        // A new look starts from whatever is on now, backdrop aside.
        const current = lookById($looksStore, $settingsStore.theme.look)
        openEditor(
            newLook({
                name: looksStore.uniqueName('New look'),
                palette: current
                    ? structuredClone(current.palette)
                    : { kind: 'builtin', name: $settingsStore.theme.name }
            }),
            true
        )
    }

    function editItem(item: Item) {
        menuFor = null
        const look = $looksStore.looks[item.id]
        if (look) openEditor(structuredClone(look), false)
    }

    function preview(look: Look | null) {
        void applyLook(get(settingsStore), get(looksStore), look)
    }

    async function saveEdited(look: Look) {
        const saved = await looksStore.saveLook(look)
        editing = null
        await settingsStore.updateSettings({
            theme: { ...$settingsStore.theme, look: saved.id },
            ui: { ...$settingsStore.ui, theme: true }
        })
        preview(null)
    }

    function cancelEdit() {
        editing = null
        preview(null)
    }

    // The four look cards share one shell: label on top, the control, then a hint.
    const CARD = 'flex flex-col gap-y-2 rounded-md border border-hairline bg-panel px-2.5 py-2'
    const SWITCH_ROW = 'flex h-6 items-center gap-x-2 text-xs text-ink-fg-2'
    const HINT = 'text-xs leading-snug text-ink-muted'
    const MENU_ITEM =
        'flex w-full items-center rounded-sm px-2 py-1.5 text-left text-xs text-ink-fg-2 hover:bg-surface-2 hover:text-ink-fg focus-visible:outline-none focus-visible:bg-surface-2'
</script>

{#if editing}
    <LookEditor
        look={editing.look}
        isNew={editing.isNew}
        onSave={saveEdited}
        onCancel={cancelEdit}
        onPreview={preview}
    />
{:else}
    <div class="flex flex-col gap-y-3">
        <div class="flex flex-col gap-y-0.5">
            <span class="text-[13px] font-medium text-ink-fg">Recolour the Spotify web player</span>
            <span class="text-xs text-ink-muted">
                Pick a palette, or a look: a palette plus a backdrop (a gradient, a picture or the
                playing cover) that Spotify's panels float on. Chorus's own panels take the same
                tint, a step apart from the page.
            </span>
        </div>

        <div class="grid grid-cols-4 gap-3">
            <div class={CARD}>
                <span class="rack-label">Apply theme</span>
                <label class={SWITCH_ROW}>
                    <Switch
                        checked={$settingsStore.ui.theme}
                        onCheckedChange={toggleApply}
                        aria-label="Apply theme"
                    />
                    {$settingsStore.ui.theme ? 'On' : 'Off'}
                </label>
                <span class={HINT}>Recolour Spotify with the look below.</span>
            </div>

            <div class={CARD}>
                <span class="rack-label">Appearance</span>
                <SegmentedControl
                    size="xs"
                    ariaLabel="Appearance"
                    value={$settingsStore.theme.appearance}
                    onValueChange={setAppearance}
                    options={[
                        { label: 'Dark', value: 'dark' },
                        { label: 'Light', value: 'light', title: 'A light version of the palette' },
                        { label: 'System', value: 'system', title: 'Follow the OS setting' }
                    ]}
                />
                <span class={HINT}>
                    Light makes a pale version of any look; System follows your OS.
                </span>
            </div>

            <div class={CARD}>
                <span class="rack-label">Popup</span>
                <SegmentedControl
                    size="xs"
                    ariaLabel="Popup colours"
                    value={$settingsStore.theme.popup}
                    onValueChange={setPopupColours}
                    options={[
                        { label: 'Album art', value: 'album', title: 'Colours from the cover' },
                        {
                            label: 'Theme',
                            value: 'theme',
                            title: 'The same colours as these panels'
                        }
                    ]}
                />
                <span class={HINT}
                    >Where the toolbar popup takes its colours from; the PiP player follows the
                    theme.</span
                >
            </div>

            <div class={CARD}>
                <span class="rack-label">Glass</span>
                <label
                    class={SWITCH_ROW}
                    title="Chorus panels go translucent over a blurred view of what sits behind them"
                >
                    <Switch
                        checked={$settingsStore.ui.glass}
                        onCheckedChange={toggleGlass}
                        aria-label="Glass surfaces"
                    />
                    {$settingsStore.ui.glass ? 'On' : 'Off'}
                </label>
                <span class={HINT}>
                    Translucent Chorus panels over a blurred page; the popup blurs its cover art.
                </span>
            </div>
        </div>

        {#if $settingsStore.ui.glass}
            <div
                class="grid grid-cols-3 gap-x-4 rounded-md border border-hairline bg-panel px-3 py-2"
            >
                <div class="flex flex-col gap-y-1.5">
                    <div class="flex items-center justify-between">
                        <span class="rack-label">Opacity</span>
                        <span class="font-mono text-[11px] text-ink-fg-2"
                            >{Math.round(glass.opacity * 100)}%</span
                        >
                    </div>
                    <CustomSlider
                        type="single"
                        min={20}
                        max={85}
                        step={5}
                        value={Math.round(glass.opacity * 100)}
                        label="Glass opacity"
                        onValueChange={(v) => setGlass('opacity', (v as number) / 100)}
                    />
                </div>
                <div class="flex flex-col gap-y-1.5">
                    <div class="flex items-center justify-between">
                        <span class="rack-label">Blur</span>
                        <span class="font-mono text-[11px] text-ink-fg-2">{glass.blur} px</span>
                    </div>
                    <CustomSlider
                        type="single"
                        min={GLASS_BLUR_MIN}
                        max={64}
                        step={4}
                        value={glass.blur}
                        label="Glass blur"
                        onValueChange={(v) => setGlass('blur', v as number)}
                    />
                </div>
                <div class="flex flex-col gap-y-1.5">
                    <div class="flex items-center justify-between">
                        <span
                            class="rack-label"
                            title="Bends the page behind the panel like thick glass. Chrome only; other browsers keep the plain blur."
                            >Refraction · Chrome</span
                        >
                        <span class="font-mono text-[11px] text-ink-fg-2"
                            >{glass.refraction === 0 ? 'off' : glass.refraction}</span
                        >
                    </div>
                    <CustomSlider
                        type="single"
                        min={0}
                        max={40}
                        step={2}
                        value={glass.refraction}
                        label="Glass refraction"
                        onValueChange={(v) => setGlass('refraction', v as number)}
                    />
                </div>
            </div>
        {/if}

        <div class="flex items-center gap-x-2.5">
            <SegmentedControl
                size="xs"
                ariaLabel="Filter"
                value={filter}
                onValueChange={(v) => (filter = v as Filter)}
                options={[
                    { label: 'All', value: 'all' },
                    { label: 'Palettes', value: 'palettes' },
                    { label: 'Looks', value: 'looks', title: 'Palettes with a backdrop' },
                    { label: 'Mine', value: 'mine' }
                ]}
            />
            <div class="relative min-w-0 flex-1">
                <Search
                    class="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted"
                />
                <Input
                    type="search"
                    bind:value={query}
                    placeholder="Search looks"
                    aria-label="Search looks"
                    class="h-7 pl-7 text-xs"
                />
            </div>
            {#if hiddenCount > 0}
                <button
                    type="button"
                    class="text-xs text-ink-muted hover:text-ink-fg"
                    aria-pressed={showHidden}
                    onclick={() => (showHidden = !showHidden)}
                >
                    {showHidden ? 'Hide hidden' : `Show hidden · ${hiddenCount}`}
                </button>
            {/if}
            <Button size="sm" onclick={startNew}>
                <Plus class="size-3.5" strokeWidth={2.5} />
                New look
            </Button>
        </div>

        <div
            class="grid grid-cols-5 gap-3"
            role="radiogroup"
            aria-label="Theme"
            tabindex="-1"
            onkeydown={onKeydown}
        >
            <button
                type="button"
                onclick={startNew}
                class="group flex flex-col gap-y-1.5 text-left focus-visible:outline-none"
                aria-label="New look"
            >
                <span
                    class="flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-hairline-strong bg-panel transition-colors group-hover:border-ink-dim group-focus-visible:ring-2 group-focus-visible:ring-signal"
                >
                    <span
                        class="inline-flex size-7 items-center justify-center rounded-full bg-surface-2 text-ink-fg"
                    >
                        <Plus class="size-3.5" strokeWidth={2.5} />
                    </span>
                </span>
                <span class="text-xs text-ink-fg-2">New look</span>
            </button>

            {#each visible as item (item.kind + ':' + item.id)}
                {@const selected = isSelected(item)}
                <div class="group relative flex flex-col gap-y-1.5">
                    <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        tabindex={selected ? 0 : -1}
                        data-item={item.id}
                        onclick={() => select(item)}
                        class="flex flex-col gap-y-1.5 text-left focus-visible:outline-none [&:focus-visible>span:first-child]:ring-2 [&:focus-visible>span:first-child]:ring-signal"
                    >
                        <LookSketch
                            sketch={item.sketch}
                            {selected}
                            class={cn(
                                'group-hover:border-hairline-strong',
                                item.hidden && 'opacity-60'
                            )}
                        />
                        <span
                            class="flex items-center gap-x-1.5 text-xs {selected
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
                            class="pointer-events-none absolute right-1.5 top-1.5 inline-flex size-4 items-center justify-center rounded-full bg-signal text-signal-fg"
                        >
                            <Check class="size-2.5" strokeWidth={3} />
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
                                'absolute left-1.5 top-1.5 inline-flex size-5 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity hover:bg-black/75 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal group-focus-within:opacity-100 group-hover:opacity-100',
                                menuFor === item.id && 'opacity-100'
                            )}
                            aria-label={`Options for ${item.label}`}
                        >
                            <Ellipsis class="size-3" />
                        </Popover.Trigger>
                        <Popover.Content align="start" sideOffset={2} class="w-44 p-1">
                            {#if confirmDelete === item.id}
                                <div class="flex flex-col gap-y-1.5 px-2 py-1.5">
                                    <span class="text-xs text-ink-fg">Delete “{item.label}”?</span>
                                    <div class="flex items-center gap-x-1.5">
                                        <Button
                                            variant="destructive"
                                            size="xs"
                                            onclick={() => remove(item)}>Delete</Button
                                        >
                                        <Button
                                            variant="ghost"
                                            size="xs"
                                            onclick={() => (confirmDelete = null)}>Keep</Button
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
                                        onclick={() => (confirmDelete = item.id)}>Delete…</button
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
{/if}
