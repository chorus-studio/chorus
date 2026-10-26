<script lang="ts">
    import type { ThemeName } from '$lib/utils/theming'
    import {
        settingsStore,
        DEFAULT_GLASS,
        type Appearance,
        type PopupColours,
        type GlassSettings
    } from '$lib/stores/settings'
    import { applyGlass, THEME_NAMES, STATIC_THEMES } from '$lib/utils/theming'

    import Check from '@lucide/svelte/icons/check'
    import { Switch } from '$lib/components/ui/switch'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'
    import { cn } from '$lib/utils.js'

    // Every control here only writes settings: App.svelte re-applies the look
    // (page re-skin, rack tokens, glass) whenever they change, so the popup and
    // PiP follow the same path as this dialog.
    async function updateTheme(theme: ThemeName) {
        if (theme === $settingsStore.theme.name) return

        // Picking a palette applies it, and the "Apply theme" switch follows.
        await settingsStore.updateSettings({
            theme: { ...$settingsStore.theme, name: theme },
            ui: { ...$settingsStore.ui, theme: theme !== 'spotify' }
        })
    }

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

    // Radio-group keyboard pattern: arrows move within the 5-column grid and
    // select as they go, Home/End jump to the ends, Tab lands on the current one.
    const COLUMNS = 5
    function onKeydown(e: KeyboardEvent) {
        const current = THEME_NAMES.indexOf($settingsStore.theme.name)
        const last = THEME_NAMES.length - 1
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
        const theme = THEME_NAMES[next]
        updateTheme(theme)
        const group = e.currentTarget as HTMLElement
        group.querySelector<HTMLElement>(`[data-theme="${theme}"]`)?.focus()
    }

    // The four look cards share one shell: label on top, the control, then a hint.
    const CARD = 'flex flex-col gap-y-2 rounded-md border border-hairline bg-panel px-2.5 py-2'
    const SWITCH_ROW = 'flex h-6 items-center gap-x-2 text-xs text-ink-fg-2'
    const HINT = 'text-xs leading-snug text-ink-muted'

    const SPOTIFY_PREVIEW = {
        main: '#121212',
        sidebar: '#121212',
        shadow: '#000000',
        text: '#ffffff',
        subtext: '#b3b3b3',
        button: '#1ed760'
    }

    function preview(theme: ThemeName) {
        return STATIC_THEMES[theme] ?? SPOTIFY_PREVIEW
    }

    const label = (theme: string) =>
        theme === 'spotify'
            ? 'Spotify (default)'
            : theme === 'artic'
              ? 'Arctic'
              : theme
                    .split('_')
                    .join(' ')
                    .replace(/^\w/, (c) => c.toUpperCase())
</script>

<div class="flex flex-col gap-y-3">
    <div class="flex flex-col gap-y-0.5">
        <span class="text-[13px] font-medium text-ink-fg">Recolour the Spotify web player</span>
        <span class="text-xs text-ink-muted">
            Pick a palette for the sidebar, main view and player bar. Chorus's own panels take the
            same tint, a step apart from the page, and its controls use the palette's accent.
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
            <span class={HINT}>Recolour Spotify with the palette below.</span>
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
                Light makes a pale version of any palette; System follows your OS.
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
                    { label: 'Theme', value: 'theme', title: 'The same colours as these panels' }
                ]}
            />
            <span class={HINT}>Where the toolbar popup and PiP player take their colours from.</span
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
                Translucent panels over a blurred page; the popup blurs its cover art.
            </span>
        </div>
    </div>

    {#if $settingsStore.ui.glass}
        <div class="grid grid-cols-3 gap-x-4 rounded-md border border-hairline bg-panel px-3 py-2">
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
                    min={8}
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

    <div
        class="grid grid-cols-5 gap-3"
        role="radiogroup"
        aria-label="Theme"
        tabindex="-1"
        onkeydown={onKeydown}
    >
        {#each THEME_NAMES as theme (theme)}
            {@const p = preview(theme)}
            {@const selected = $settingsStore.theme.name === theme}
            <button
                type="button"
                role="radio"
                aria-checked={selected}
                tabindex={selected ? 0 : -1}
                data-theme={theme}
                onclick={() => updateTheme(theme)}
                class="group flex flex-col gap-y-1.5 text-left focus-visible:outline-none"
            >
                <span
                    class={cn(
                        'relative block h-[84px] w-full overflow-hidden rounded-lg border border-hairline transition-shadow group-hover:border-hairline-strong group-focus-visible:ring-2 group-focus-visible:ring-signal',
                        selected && 'ring-2 ring-signal'
                    )}
                    style="background: {p.shadow}"
                >
                    <span
                        class="absolute bottom-[18px] left-1.5 top-1.5 w-[22px] rounded"
                        style="background: {p.sidebar}"
                    ></span>
                    <span
                        class="absolute bottom-[18px] left-8 right-1.5 top-1.5 rounded"
                        style="background: {p.main}"
                    ></span>
                    <span
                        class="absolute left-[38px] top-3 h-[3px] w-[34px] rounded-sm"
                        style="background: {p.text}"
                    ></span>
                    <span
                        class="absolute left-[38px] top-[19px] h-[3px] w-[22px] rounded-sm opacity-60"
                        style="background: {p.subtext}"
                    ></span>
                    <span
                        class="absolute bottom-1.5 left-1.5 right-1.5 h-2 rounded-sm"
                        style="background: {p.sidebar}"
                    ></span>
                    <span
                        class="absolute bottom-5 right-3 size-2.5 rounded-full"
                        style="background: {p.button}"
                    ></span>
                    {#if selected}
                        <span
                            class="absolute right-1.5 top-1.5 inline-flex size-4 items-center justify-center rounded-full bg-signal text-ink"
                        >
                            <Check class="size-2.5" strokeWidth={3} />
                        </span>
                    {/if}
                </span>
                <span class={cn('text-xs', selected ? 'text-ink-fg' : 'text-ink-fg-2')}
                    >{label(theme)}</span
                >
            </button>
        {/each}
    </div>
</div>
