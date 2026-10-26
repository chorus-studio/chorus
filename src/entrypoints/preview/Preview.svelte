<script lang="ts">
    import '../../app.css'
    import { onMount } from 'svelte'
    import { get } from 'svelte/store'
    import TabsList from '$lib/components/TabsList.svelte'
    import PopUp from '$lib/components/views/PopUp.svelte'
    import PowerOffOverlay from '$lib/components/PowerOffOverlay.svelte'
    import VocalRemovalToggle from '$lib/components/VocalRemovalToggle.svelte'
    import ChorusConfigDialog from '$lib/components/ChorusConfigDialog.svelte'
    import BlockedTracksDialog from '$lib/components/BlockedTracksDialog.svelte'
    import { storage } from '@wxt-dev/storage'
    import { dataStore } from '$lib/stores/data'
    import TimeProgress from '$lib/components/TimeProgress.svelte'
    import VolumeSlider from '$lib/components/VolumeSlider.svelte'
    import LoopButton from '$lib/components/LoopButton.svelte'
    import SeekButton from '$lib/components/SeekButton.svelte'
    import HeartButton from '$lib/components/HeartButton.svelte'
    import SkipButton from '$lib/components/SkipButton.svelte'
    import SettingsPopover from '$lib/components/SettingsPopover.svelte'
    import { applyPalette } from '$lib/utils/vibrant-colors'
    import {
        STATIC_THEMES,
        SPOTIFY_PALETTE,
        applyThemeVariables,
        applyGlass,
        applyThemePopupPalette,
        type ThemeName,
        type Mode
    } from '$lib/utils/theming'
    import { invertPalette } from '$lib/utils/theme-surfaces'
    import { DEFAULT_GLASS, settingsStore } from '$lib/stores/settings'

    const params = new URLSearchParams(location.search)
    const scene = params.get('scene') ?? 'tabs'
    const tab = params.get('tab') ?? 'snip'
    const dialog = params.get('dialog') ?? ''
    // ?theme=hot_pink tints the rack and paints the page in that theme's chrome;
    // ?mode=light shows the light version of it (of Spotify's own palette when none).
    const mode: Mode = params.get('mode') === 'light' ? 'light' : 'dark'
    const staticTheme = STATIC_THEMES[(params.get('theme') ?? 'spotify') as ThemeName]
    const themeConfig =
        mode === 'light' ? invertPalette(staticTheme ?? SPOTIFY_PALETTE) : staticTheme
    const chrome = themeConfig?.player ?? '#000000'
    // ?glass=1 switches the glass surfaces on and paints a busy backdrop (album-like
    // colour fields and text) behind the frame so the blur has something to show.
    // ?popup=theme makes the popup wear the theme instead of the album palette.
    const glass = params.get('glass') === '1'
    const popupColours = params.get('popup') === 'theme' ? 'theme' : 'album'
    const backdrop = glass
        ? `radial-gradient(circle at 18% 28%, #ff6b6b 0, transparent 34%), radial-gradient(circle at 72% 58%, #4d96ff 0, transparent 38%), radial-gradient(circle at 48% 92%, #ffd93d 0, transparent 30%), radial-gradient(circle at 88% 12%, #6bcb77 0, transparent 26%), ${chrome}`
        : chrome

    onMount(async () => {
        document.documentElement.classList.add('dark')
        document.documentElement.setAttribute('data-mode', mode)
        applyPalette(document.documentElement, { bg_colour: '#1b6b63', text_colour: '#eafff9' })
        if (themeConfig) applyThemeVariables(themeConfig, mode)
        if (popupColours === 'theme') applyThemePopupPalette(document.documentElement)
        // Components read glass and the popup colour source from the settings
        // store; the preview shim's storage never fires change events, so seed
        // the store directly (it writes storage too).
        const current = get(settingsStore)
        await settingsStore.updateSettings({
            ui: { ...current.ui, glass },
            theme: { ...current.theme, appearance: mode, popup: popupColours, glass: DEFAULT_GLASS }
        })
        applyGlass(get(settingsStore))
    })

    // ?dialog=blocked&view=grid seeds a few blocked tracks (solid-colour covers) and
    // the view preference before the dialog mounts, so both views can be shot.
    const DAY = 24 * 60 * 60 * 1000
    const swatch = (hex: string) =>
        `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' fill='${hex.replace('#', '%23')}'/></svg>`
    const SAMPLE_BLOCKED = [
        ['Easier Said Than Done by Thee Sacred Souls', '#6b5a3e', 2 * DAY],
        ['Red Room by Hiatus Kaiyote', '#2b2b2b', 5 * DAY],
        ['rwm by the booyah! kids', '#8fb36b', 3 * 60 * 60 * 1000],
        ['Can I Call You Rose? by Thee Sacred Souls', '#7a4a52', 12 * DAY],
        ['Nakamarra by Hiatus Kaiyote', '#3f5b73', 40 * DAY],
        ['Lady Love by Thee Sacred Souls', '#5c4a6b', 0],
        ['Get Sun by Hiatus Kaiyote', '#b3833a', 90 * DAY]
    ] as const
    let ready = $state(dialog !== 'blocked')

    onMount(async () => {
        if (dialog !== 'blocked') return
        const view = params.get('view')
        if (view === 'grid' || view === 'list')
            await storage.setItem('local:chorus_blocked_view', view)
        for (const [song_id, hex, age] of SAMPLE_BLOCKED) {
            const track_id = song_id.toLowerCase().replace(/[^a-z0-9]+/g, '-')
            await dataStore.updateTrack({
                track_id,
                value: {
                    track_id,
                    song_id,
                    cover: swatch(hex),
                    blocked: true,
                    blocked_at: age ? Date.now() - age : null
                }
            })
        }
        ready = true
    })
</script>

<div class="dark relative min-h-screen p-6 text-ink-fg" style="background: {backdrop}">
    {#if glass}
        <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 select-none overflow-hidden p-6 font-semibold leading-[1.1] text-white/70"
            style="font-size: 44px"
        >
            Caliphate (feat. Vince Staples) · Earl Sweatshirt · Red Room · Hiatus Kaiyote · Easier
            Said Than Done · Thee Sacred Souls · Nakamarra · Get Sun · Lady Love · Will I See You
            Again? · Molasses · Weightless · rwm · the booyah! kids
        </div>
    {/if}
    {#if scene === 'tabs'}
        <div
            id="frame"
            class="chorus-float relative h-[320px] w-[400px] overflow-hidden rounded-xl border border-hairline-strong bg-ink shadow-float"
        >
            <TabsList initialTab={tab} />
        </div>
    {:else if scene === 'pip'}
        <div
            id="frame"
            class="h-[320px] w-[440px] overflow-hidden rounded-lg border border-hairline-strong bg-ink"
        >
            <TabsList pip initialTab={tab} />
        </div>
    {:else if scene === 'popup'}
        <div id="frame" class="w-[320px] overflow-hidden rounded-lg border border-hairline-strong">
            <PopUp onVoice={() => {}} />
        </div>
    {:else if scene === 'popup-off'}
        <div id="frame" class="w-[320px] overflow-hidden rounded-lg border border-hairline-strong">
            <PowerOffOverlay onenable={() => {}} />
        </div>
    {:else if scene === 'popup-voice'}
        <div
            id="frame"
            class="flex h-[196px] w-[320px] flex-col gap-y-2.5 overflow-hidden rounded-lg border border-hairline-strong bg-ink px-3 pb-3 pt-2"
        >
            <div class="flex h-[26px] items-center justify-between">
                <span class="text-xs text-ink-fg-2">‹ Player</span><span class="rack-label"
                    >Chrome only · on-device</span
                >
            </div>
            <VocalRemovalToggle />
        </div>
    {:else if scene === 'bar'}
        <div
            id="frame"
            class="flex h-[96px] w-[1280px] items-center gap-x-6 px-4"
            style="background: {chrome}; color: {themeConfig?.text ?? '#ffffff'}"
        >
            <div class="flex items-center gap-x-3">
                <div class="size-14 rounded bg-surface-2"></div>
                <div class="flex flex-col gap-y-1">
                    <span class="text-sm font-medium">Midnight City</span><span
                        class="text-[11px] text-ink-muted">M83</span
                    >
                </div>
                <div id="chorus-ui" class="dark flex items-center gap-x-0.5">
                    <HeartButton />
                    <SettingsPopover />
                    <SkipButton />
                </div>
            </div>
            <div class="flex max-w-[620px] flex-1 flex-col items-center gap-y-1.5">
                <div class="flex items-center gap-x-1.5">
                    <SeekButton role="seek-backward" />
                    <div class="size-8 rounded-full bg-white"></div>
                    <SeekButton role="seek-forward" />
                    <LoopButton />
                </div>
                <div class="w-full"><TimeProgress id="chorus-time-progress" port={null} /></div>
            </div>
            <div class="flex w-[300px] justify-end"><VolumeSlider port={null} /></div>
        </div>
    {:else if scene === 'dialog'}
        <div id="frame" class="flex items-center gap-x-4 rounded-lg bg-ink p-4">
            {#if dialog === 'blocked'}
                {#if ready}<BlockedTracksDialog open />{/if}
            {:else}
                <ChorusConfigDialog open initialTab={dialog || 'auto-skip'} />
            {/if}
        </div>
    {/if}
</div>
