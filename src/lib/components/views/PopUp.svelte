<script lang="ts">
    import { onMount } from 'svelte'
    import { getActiveTab } from '$lib/utils/messaging'

    import { volumeStore } from '$lib/stores/volume'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { setEnabled } from '$lib/stores/enabled'
    import { settingsStore } from '$lib/stores/settings'
    import { applyThemePopupPalette, watchSystemMode } from '$lib/utils/theming'

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
    import SleepTimerButton from '$lib/components/SleepTimerButton.svelte'
    import { formatRulerTime } from '$lib/utils/snip-time'

    import { paintPopup, popupLookKey } from '$lib/utils/vibrant-colors'
    import {
        requestNotificationPermission,
        setTrackNotifications,
        syncNotificationPermission
    } from '$lib/utils/notification-permission'
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
    // Colour source and appearance: a change to either repaints the popup.
    let currentLook = popupLookKey($settingsStore)

    const glassOn = $derived(Boolean($settingsStore.ui.glass))
    // Quoted so a cover URL (or a data: URI) with spaces, quotes or
    // parentheses still parses inside url().
    const coverBackdrop = $derived(
        $nowPlaying.cover
            ? `background-image: url("${$nowPlaying.cover.replace(/["\\\n]/g, (c) => '%' + c.charCodeAt(0).toString(16))}")`
            : ''
    )

    // The toolbar popup wears the cover's colour in the current appearance, or
    // the rack tokens when the Theme tab says "Popup: Theme". The PiP always
    // wears the theme: its variables land on the page root and pip.ts mirrors
    // them into the PiP document.
    async function loadColours() {
        if (pip) {
            applyThemePopupPalette(document.documentElement)
            return
        }
        await paintPopup(document.documentElement, $settingsStore, $nowPlaying.cover)
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

        const unsubscribeLook = settingsStore.subscribe(async (state) => {
            const look = popupLookKey(state)
            if (look !== currentLook) {
                currentLook = look
                await loadColours()
            }
        })
        // "System" appearance follows the OS; repaint when it flips.
        const unwatchSystem = watchSystemMode(() => loadColours())

        return () => {
            unsubscribeCover()
            unsubscribeLook()
            unwatchSystem()
        }
    })

    // Track notifications: Allow (permission missing), off, or on. The one
    // notification Chorus sends is on track change, so both legacy flags move
    // together and there is no in-between state.
    const notificationsOn = $derived(
        $settingsStore.notifications.granted &&
            $settingsStore.notifications.enabled &&
            $settingsStore.notifications.on_track_change
    )
    const notificationLabel = $derived(
        notificationsOn
            ? 'Notifying on track change — click to turn off'
            : 'Track notifications off — click to turn on'
    )
    let askingPermission = $state(false)
    let sleepOpen = $state(false)

    async function allowNotifications() {
        askingPermission = true
        try {
            // Chrome's prompt usually closes the popup; App.svelte reads the
            // answer back on the next open. If it stays open, record it now.
            await requestNotificationPermission()
            await syncNotificationPermission()
        } finally {
            askingPermission = false
        }
    }

    // Palette-aware icon button for the popup header.
    const iconBtn =
        'inline-flex size-6 shrink-0 items-center justify-center rounded-md text-[color:var(--text)] opacity-75 transition-[opacity,background-color] hover:bg-[color:color-mix(in_srgb,var(--text)_12%,transparent)] hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--text)] [&_svg]:size-[15px]'
</script>

<main
    class={cn(
        'relative isolate flex flex-col',
        glassOn && 'overflow-hidden',
        // In PiP the player fills the tab's content area (negative margins undo
        // the tab padding) and wears the popup palette like the toolbar popup.
        pip
            ? '-mx-4 -mb-2 -mt-3 flex-1 gap-y-2 bg-[color:var(--bg)] px-4 pb-2.5 pt-3 text-[color:var(--text)]'
            : 'min-h-[176px] w-[320px] gap-y-2 bg-[color:var(--bg)] px-3 pb-2 pt-1.5 text-[color:var(--text)]'
    )}
>
    {#if glassOn && $nowPlaying.cover}
        <!-- Under glass the cover art, blurred and tinted with the popup colour,
             sits behind everything (z-index -1 inside the isolated main). -->
        <div aria-hidden="true" class="chorus-glass-backdrop" style={coverBackdrop}></div>
        <div aria-hidden="true" class="chorus-glass-tint"></div>
    {/if}
    {#if !pip}
        <header class="flex h-6 items-center gap-x-2">
            <Logo size={16} tone="current" />
            {#if !sleepOpen}
                <span class="text-xs font-semibold tracking-tight">Chorus</span>
            {/if}

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
                <SleepTimerButton bind:open={sleepOpen} class={iconBtn} />
                {#if onVoice && !sleepOpen}
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

                {#if sleepOpen}
                    <!-- the sleep chips take this room -->
                {:else if !$settingsStore.notifications.granted}
                    <button
                        type="button"
                        aria-label="Allow track notifications"
                        title="Allow track notifications: a silent system notice with Like and Block when the track changes"
                        onclick={allowNotifications}
                        disabled={askingPermission}
                        class="inline-flex h-6 items-center gap-x-1 rounded-md bg-[color:var(--text)] px-2 text-[11px] font-medium text-[color:var(--bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--text)] disabled:opacity-60"
                    >
                        <BellPlus class="size-3" />
                        Allow
                    </button>
                {:else}
                    <button
                        type="button"
                        aria-label={notificationLabel}
                        title={notificationLabel}
                        aria-pressed={notificationsOn}
                        onclick={() => setTrackNotifications(!notificationsOn)}
                        class={cn(
                            iconBtn,
                            notificationsOn && 'text-[color:var(--album-accent)] opacity-100'
                        )}
                    >
                        {#if notificationsOn}
                            <BellRing />
                        {:else}
                            <BellOff />
                        {/if}
                    </button>
                {/if}

                {#if !sleepOpen}
                    <button
                        type="button"
                        aria-label="Turn Chorus off"
                        title="Turn Chorus off (Alt+Shift+O)"
                        onclick={() => setEnabled(false)}
                        class={iconBtn}
                    >
                        <Power />
                    </button>
                {/if}
            </div>
        </header>
    {/if}

    <div class="flex items-center {pip ? 'gap-x-3.5' : 'gap-x-2.5'}">
        <CoverImage
            size={pip ? 112 : 52}
            class={pip ? 'rounded-lg shadow-[0_6px_18px_rgba(0,0,0,0.35)]' : ''}
        />
        <div class="flex min-w-0 flex-1 flex-col {pip ? 'gap-y-2' : 'gap-y-1'}">
            <TrackInfo isPopup {pip} />
            {#if $nowPlaying.snip || $nowPlaying.playback || $nowPlaying.volume}
                <div
                    class="flex items-center gap-x-1.5 font-mono leading-none {pip
                        ? 'text-[11px]'
                        : 'text-[10px]'}"
                >
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
                    {#if $nowPlaying.volume}
                        <span class="text-[color:var(--text-2)]">{$nowPlaying.volume}%</span>
                    {/if}
                </div>
            {/if}
        </div>
    </div>

    <div
        class={cn(
            'flex flex-col',
            pip ? 'gap-y-2' : 'gap-y-1.5',
            !pip && glassOn && 'chorus-glass-card -mx-1.5 rounded-lg px-1.5 py-1'
        )}
    >
        <TimeProgress {port} {pip} />

        {#if pip}
            <!-- The PiP transport rides on a card, glass or not. -->
            <div
                class={cn(
                    'rounded-xl px-1.5 py-1',
                    glassOn ? 'chorus-glass-card' : 'chorus-pip-card'
                )}
            >
                <MediaControls {port} {pip} />
            </div>
        {:else}
            <MediaControls {port} {pip} />
        {/if}
    </div>

    {#if pip}
        <div class="mt-auto">
            <VolumeSlider {port} {pip} />
        </div>
    {/if}
</main>
