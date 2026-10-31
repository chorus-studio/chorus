<script lang="ts">
    import ArrowRight from '@lucide/svelte/icons/arrow-right'
    import Plus from '@lucide/svelte/icons/plus'
    import { Switch } from '$lib/components/ui/switch'
    import { Button } from '$lib/components/ui/button'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'
    import LookSketch from './theming/LookSketch.svelte'
    import { settingsStore, type Appearance, type PopupColours } from '$lib/stores/settings'
    import { looksStore } from '$lib/stores/looks'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { openLookEditor, remixForEditing } from '$lib/stores/look-editor'
    import { applyLook, lookById, resolveMode } from '$lib/utils/theming'
    import { get } from 'svelte/store'
    import { lookSketch, paletteSketch } from '$lib/utils/look-preview'
    import { playingPalette } from '$lib/utils/cover-palette'
    import { openThemePage } from '$lib/utils/theme-route'
    import { SHOW_THROUGH_MAX, newLook } from '$lib/types/look'

    // The Theme tab of Chorus settings: the quick controls (Apply, Appearance,
    // Popup colours) and a strip showing the current look, with the
    // way to the theme page, where the looks, the palettes and the editor
    // live. Every control here only writes settings: App.svelte re-applies
    // the look (page re-skin, backdrop, rack tokens, glass) whenever they
    // change, so the popup and PiP follow the same path as this dialog.

    let { onNavigate }: { onNavigate?: () => void } = $props()

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

    // The default show-through, for looks without their own: live paint, persisted a beat later.
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

    // ---- the current look ----

    const label = (theme: string) =>
        theme === 'spotify'
            ? 'Spotify (default)'
            : theme === 'artic'
              ? 'Arctic'
              : theme
                    .split('_')
                    .join(' ')
                    .replace(/^\w/, (c) => c.toUpperCase())

    const mode = $derived(resolveMode($settingsStore.theme.appearance))
    const current = $derived(lookById($looksStore, $settingsStore.theme.look))
    const currentName = $derived(current ? current.name : label($settingsStore.theme.name))
    const currentSketch = $derived.by(() => {
        void $playingPalette
        return current
            ? lookSketch(current, mode, $nowPlaying.cover, $settingsStore.theme.showThrough)
            : paletteSketch($settingsStore.theme.name, mode)
    })
    const backdropWord = (kind: string) =>
        kind === 'cover' ? 'album art' : kind === 'image' ? 'picture' : kind
    const currentMeta = $derived.by(() => {
        if (!current) return 'Built-in palette'
        const kind = current.builtIn ? 'Built-in look' : 'Your look'
        const backdrop = current.backdrop ? backdropWord(current.backdrop.kind) : 'no backdrop'
        const through =
            current.panels.showThrough === null
                ? `the default (${$settingsStore.theme.showThrough} %)`
                : `${current.panels.showThrough} %`
        const panels = current.backdrop
            ? ` · show-through ${through} · glass ${current.panels.glass ? 'on' : 'off'}`
            : ''
        return `${kind} · ${backdrop}${panels}`
    })

    function goToPage() {
        onNavigate?.()
        openThemePage()
    }

    /** Edit the current look where it can be seen: your own as it is, a built-in as a remix. */
    async function editCurrent() {
        if (!current) return
        onNavigate?.()
        if (current.builtIn) {
            // A remix opens as an unsaved draft; Save creates it.
            const copy = await remixForEditing(current, looksStore.uniqueName(current.name))
            openLookEditor(copy, true)
        } else {
            openLookEditor(structuredClone(current), false)
        }
    }

    function startNew() {
        onNavigate?.()
        openLookEditor(
            newLook({
                name: looksStore.uniqueName('New look'),
                // The palette reads itself from whatever backdrop the new look gets.
                palette: { kind: 'backdrop' }
            }),
            true
        )
    }

    // The three cards share one shell: label on top, the control, then a hint.
    const CARD = 'flex flex-col gap-y-2 rounded-md border border-hairline bg-panel px-2.5 py-2'
    const SWITCH_ROW = 'flex h-6 items-center gap-x-2 text-xs text-ink-fg-2'
    const HINT = 'text-xs leading-snug text-ink-muted'
</script>

<div class="flex flex-col gap-y-3">
    <div class="flex flex-col gap-y-0.5">
        <span class="text-[13px] font-medium text-ink-fg">Recolour the Spotify web player</span>
        <span class="text-xs text-ink-muted">
            The looks, the palettes and the editor live on the theme page, where the page itself is
            the preview. The quick controls stay here.
        </span>
    </div>

    <div class="flex items-center gap-x-4 rounded-md border border-hairline bg-panel px-3 py-2.5">
        <div class="w-[136px] shrink-0">
            <LookSketch sketch={currentSketch} />
        </div>
        <div class="flex min-w-0 flex-1 flex-col gap-y-1">
            <span class="rack-label">Current look</span>
            <span class="truncate text-[15px] font-semibold text-ink-fg">{currentName}</span>
            <span class="font-mono text-[11px] text-ink-muted">{currentMeta}</span>
            <span class={HINT}>
                {$settingsStore.ui.theme
                    ? 'On the page now.'
                    : 'Apply theme is off, so Spotify wears its own colours.'}
            </span>
        </div>
        <div class="flex shrink-0 flex-col items-stretch gap-y-1.5">
            <Button size="sm" onclick={goToPage}>
                Open theme page
                <ArrowRight class="size-3.5" strokeWidth={2.5} />
            </Button>
            {#if current}
                <Button variant="outline" size="sm" onclick={editCurrent}>
                    {current.builtIn ? 'Remix this look' : 'Edit this look'}
                </Button>
            {:else}
                <Button variant="outline" size="sm" onclick={startNew}>
                    <Plus class="size-3.5" strokeWidth={2.5} />
                    New look
                </Button>
            {/if}
        </div>
    </div>

    <div class="grid grid-cols-3 gap-3">
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
            <span class={HINT}>Recolour Spotify with the current look.</span>
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
            <span class={HINT}>Light makes a pale version of any look; System follows your OS.</span
            >
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
            <span class={HINT}
                >Where the toolbar popup takes its colours from; the PiP player follows the theme.</span
            >
        </div>
    </div>

    <div class="flex items-center gap-x-4 rounded-md border border-hairline bg-panel px-3 py-2">
        <div class="flex w-[190px] shrink-0 flex-col gap-y-0.5">
            <span class="rack-label">Default show-through</span>
            <span class={HINT}>For looks without a value of their own.</span>
        </div>
        <div class="flex-1">
            <CustomSlider
                type="single"
                min={0}
                max={SHOW_THROUGH_MAX}
                step={5}
                value={showThrough}
                label="Default show-through"
                onValueChange={(v) => setShowThrough(v as number)}
            />
        </div>
        <span class="w-10 text-right font-mono text-[11px] text-ink-fg-2">{showThrough} %</span>
    </div>

    <span class={HINT}>
        Alt+Shift+] and Alt+Shift+[ step through the looks and palettes you have not hidden; change
        them under Shortcuts.
    </span>
</div>
