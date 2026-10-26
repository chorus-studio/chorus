<script lang="ts">
    import { onMount } from 'svelte'
    import { getActiveTab } from '$lib/utils/messaging'

    import { volumeStore } from '$lib/stores/volume'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { setEnabled } from '$lib/stores/enabled'
    import { settingsStore, type ThemeVibrancy, type PopupColours } from '$lib/stores/settings'
    import { applyThemePopupPalette } from '$lib/utils/theming'

    import Bell from '@lucide/svelte/icons/bell'
    import BellOff from '@lucide/svelte/icons/bell-off'
    import BellPlus from '@lucide/svelte/icons/bell-plus'
    import BellRing from '@lucide/svelte/icons/bell-ring'
    import Power from '@lucide/svelte/icons/power'
    import AudioLines from '@lucide/svelte/icons/audio-lines'
    import ExternalLink from '@lucide/svelte/icons/external-link'

    import Logo from '$lib/components/Logo.svelte'
    import TrackInfo from '$lib/components/TrackInfo.svelte'
    import CoverImage from '$lib/components/CoverImage.svelte'
    import VolumeSlider from '$lib/components/VolumeSlider.svelte'
    import TimeProgress from '$lib/components/TimeProgress.svelte'
    import MediaControls from '$lib/components/MediaControls.svelte'
    import SelectVibrancy from '$lib/components/SelectVibrancy.svelte'
    import { formatRulerTime } from '$lib/utils/snip-time'

    import { getColours, applyPalette } from '$lib/utils/vibrant-colors'
    import { getCheckPermissionsService } from '$lib/utils/check-permissions'
    import { cn } from '$lib/utils.js'

    // onVoice is passed only from the toolbar popup, so the vocal-separation
    // entry icon never shows in the in-page player tab or PiP.
    let { pip = false, onVoice }: { pip?: boolean; onVoice?: () => void } = $props()

    let port = $state<chrome.runtime.Port | null>(null)

    let isSpotifyTabOpen = $state(true)

    function setupPort() {
        port = chrome.runtime.connect({ name: 'popup' })
        port.onMessage.addListener(async ({ type }: { type: string; data: any }) => {
            if (!['enabled', 'controls'].includes(type)) return
        })
    }

    let currentCover = $state($nowPlaying.cover)
    let currentVibrancy = $state<ThemeVibrancy>($settingsStore.theme.vibrancy ?? 'Auto')
    let currentPopupColours: PopupColours = $settingsStore.theme.popup ?? 'album'

    const glassOn = $derived(Boolean($settingsStore.ui.glass))
    // Quoted so a cover URL (or a data: URI) with spaces, quotes or
    // parentheses still parses inside url().
    const coverBackdrop = $derived(
        $nowPlaying.cover
            ? `background-image: url("${$nowPlaying.cover.replace(/["\\\n]/g, (c) => '%' + c.charCodeAt(0).toString(16))}")`
            : ''
    )

    function notificationState() {
        if ($settingsStore.notifications.enabled) {
            if ($settingsStore.notifications.on_track_change) return 3
            return 2
        }
        return 1
    }

    async function toggleNotifications() {
        const currentState = notificationState()
        await settingsStore.updateSettings({
            notifications: {
                ...$settingsStore.notifications,
                enabled: currentState === 3 ? false : true,
                on_track_change: currentState === 2 ? true : false
            }
        })
    }

    async function grantNotificationPermission() {
        const checkPermissionsService = getCheckPermissionsService()
        let granted = await checkPermissionsService.verifyPermission('notifications')
        if (import.meta.env.FIREFOX) granted = true

        await settingsStore.updateSettings({
            notifications: { ...$settingsStore.notifications, granted, enabled: granted }
        })
    }

    function getVibrancy(): ThemeVibrancy {
        return $settingsStore.theme.vibrancy
    }

    async function loadColours() {
        // "Popup: Theme" wears the rack tokens instead of the cover's palette.
        if ($settingsStore.theme.popup === 'theme') {
            applyThemePopupPalette(document.documentElement)
            return
        }
        if ($nowPlaying.cover) {
            const vibrancy = getVibrancy()
            const { bg_colour = '#121212', text_colour = '#ffffff' } = await getColours({
                url: $nowPlaying.cover,
                vibrancy
            })
            applyPalette(document.documentElement, { bg_colour, text_colour })
        }
    }

    function openSpotify() {
        try {
            chrome.tabs.create({ url: 'https://open.spotify.com' })
            isSpotifyTabOpen = true
        } catch (error) {
            console.error(error)
        }
    }

    async function getSpotifyTabStatus() {
        const activeTab = await getActiveTab()
        isSpotifyTabOpen = activeTab?.url?.includes('open.spotify.com') ?? false
    }

    onMount(() => {
        ;(async () => {
            if (pip) await getSpotifyTabStatus()
            // Load persisted volume from chrome.storage so the popup icon
            // reflects the actual muted/volume state instead of store defaults.
            await volumeStore.loadFromStorage()
        })()
        setupPort()
        loadColours()

        const unsubscribeCover = nowPlaying.subscribe(async (state) => {
            if (state.cover !== currentCover) {
                currentCover = state.cover
                await loadColours()
            }
        })

        const unsubscribeVibrancy = settingsStore.subscribe(async (state) => {
            if (
                state.theme.vibrancy !== currentVibrancy ||
                state.theme.popup !== currentPopupColours
            ) {
                currentVibrancy = state.theme.vibrancy
                currentPopupColours = state.theme.popup
                await loadColours()
            }
        })

        return () => {
            unsubscribeCover()
            unsubscribeVibrancy()
        }
    })

    const notificationLabel = $derived(
        !$settingsStore.notifications.enabled
            ? 'Notifications off — click to enable'
            : $settingsStore.notifications.on_track_change
              ? 'Notifying on every track change — click to turn off'
              : 'Notifications on — click to also notify on track change'
    )

    // Palette-aware icon button for the popup header.
    const iconBtn =
        'inline-flex size-6 shrink-0 items-center justify-center rounded-md text-[color:var(--text)] opacity-75 transition-[opacity,background-color] hover:bg-[color:color-mix(in_srgb,var(--text)_12%,transparent)] hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--text)] [&_svg]:size-[15px]'
</script>

<main
    class={cn(
        'relative isolate flex flex-col',
        glassOn && 'overflow-hidden',
        pip
            ? 'w-full gap-y-2.5'
            : 'min-h-[196px] w-[320px] gap-y-2 bg-[color:var(--bg)] px-3 pb-2.5 pt-1.5 text-[color:var(--text)]'
    )}
>
    {#if glassOn && $nowPlaying.cover}
        <!-- Under glass the cover art, blurred and tinted with the popup colour,
             sits behind everything (z-index -1 inside the isolated main). -->
        <div aria-hidden="true" class="chorus-glass-backdrop" style={coverBackdrop}></div>
        <div aria-hidden="true" class="chorus-glass-tint"></div>
    {/if}
    {#if !pip}
        <header class="flex h-7 items-center gap-x-2">
            <Logo size={16} tone="current" />
            <span class="text-xs font-semibold tracking-tight">Chorus</span>

            {#if !isSpotifyTabOpen}
                <button
                    type="button"
                    onclick={openSpotify}
                    class="inline-flex h-5 items-center gap-x-1 rounded-md px-1.5 text-[11px] text-[color:var(--text)] opacity-80 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--text)]"
                >
                    Open Spotify
                    <ExternalLink class="size-3" />
                </button>
            {/if}

            <div class="ml-auto flex items-center gap-x-0.5">
                {#if onVoice}
                    <button
                        type="button"
                        aria-label="Vocal separation"
                        title="Vocal separation"
                        onclick={onVoice}
                        class={iconBtn}
                    >
                        <AudioLines />
                    </button>
                {/if}

                {#if $settingsStore.ui.popup}
                    <SelectVibrancy />
                {/if}

                {#if !$settingsStore.notifications.granted}
                    <button
                        type="button"
                        aria-label="Allow notifications"
                        title="Allow track notifications"
                        onclick={grantNotificationPermission}
                        class="inline-flex h-6 items-center gap-x-1 rounded-md bg-[color:var(--text)] px-2 text-[11px] font-medium text-[color:var(--bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--text)]"
                    >
                        <BellPlus class="size-3" />
                        Allow
                    </button>
                {:else}
                    <button
                        type="button"
                        aria-label={notificationLabel}
                        title={notificationLabel}
                        onclick={toggleNotifications}
                        class={iconBtn}
                    >
                        {#if $settingsStore.notifications.enabled}
                            {#if $settingsStore.notifications.on_track_change}
                                <BellRing />
                            {:else}
                                <Bell />
                            {/if}
                        {:else}
                            <BellOff />
                        {/if}
                    </button>
                {/if}

                <button
                    type="button"
                    aria-label="Turn Chorus off"
                    title="Turn Chorus off (Alt+Shift+O)"
                    onclick={() => setEnabled(false)}
                    class={iconBtn}
                >
                    <Power />
                </button>
            </div>
        </header>
    {/if}

    <div class="flex items-center {pip ? 'gap-x-3' : 'gap-x-2.5'}">
        <CoverImage size={pip ? 56 : 52} />
        <div class="flex min-w-0 flex-1 flex-col gap-y-1">
            <TrackInfo isPopup />
            {#if $nowPlaying.snip || $nowPlaying.playback}
                <div class="flex items-center gap-x-1.5 font-mono text-[10px] leading-none">
                    {#if $nowPlaying.snip?.ranges?.length}
                        {@const first = $nowPlaying.snip.ranges[0]}
                        {@const more = $nowPlaying.snip.ranges.length - 1}
                        <span class="size-1.5 rounded-full bg-[color:var(--album-accent)]"></span>
                        <span class="text-[color:var(--album-accent)]">
                            {$nowPlaying.snip.mode === 'skip' ? 'skip' : 'snip'}
                            {formatRulerTime(first.start)}–{formatRulerTime(first.end)}{more > 0
                                ? ` +${more}`
                                : ''}
                        </span>
                    {/if}
                    {#if $nowPlaying.playback}
                        <span class="text-[color:var(--text-2)]"
                            >{$nowPlaying.playback.rate.value}×</span
                        >
                    {/if}
                </div>
            {/if}
        </div>
    </div>

    <div
        class={cn(
            'flex flex-col',
            pip ? 'gap-y-2.5' : 'gap-y-2',
            glassOn && 'chorus-glass-card -mx-1.5 rounded-lg px-1.5 py-1'
        )}
    >
        <TimeProgress {port} {pip} />

        <MediaControls {port} {pip} />
    </div>

    {#if pip}
        <div class="mt-auto">
            <VolumeSlider {port} {pip} />
        </div>
    {/if}
</main>
