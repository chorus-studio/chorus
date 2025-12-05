<script lang="ts">
    import { onMount } from 'svelte'
    import { getActiveTab } from '$lib/utils/messaging'

    import { volumeStore } from '$lib/stores/volume'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { settingsStore, type ThemeVibrancy } from '$lib/stores/settings'

    import Bell from '@lucide/svelte/icons/bell'
    import BellOff from '@lucide/svelte/icons/bell-off'
    import BellPlus from '@lucide/svelte/icons/bell-plus'
    import BellRing from '@lucide/svelte/icons/bell-ring'

    import { Button } from '$lib/components/ui/button'
    import TrackInfo from '$lib/components/TrackInfo.svelte'
    import VolumeIcon from '$lib/components/VolumeIcon.svelte'
    import CoverImage from '$lib/components/CoverImage.svelte'
    import VolumeSlider from '$lib/components/VolumeSlider.svelte'
    import TimeProgress from '$lib/components/TimeProgress.svelte'
    import MediaControls from '$lib/components/MediaControls.svelte'
    import SelectVibrancy from '$lib/components/SelectVibrancy.svelte'

    import { getColours } from '$lib/utils/vibrant-colors'
    import { getCheckPermissionsService } from '$lib/utils/check-permissions'
    import { getVersion } from '$lib/utils/version'

    const version = getVersion()

    let { pip = false }: { pip?: boolean } = $props()

    let port = $state<chrome.runtime.Port | null>(null)

    let isSpotifyTabOpen = $state(true)

    function setupPort() {
        port = chrome.runtime.connect({ name: 'popup' })
        port.onMessage.addListener(async ({ type, data }: { type: string; data: any }) => {
            if (!['enabled', 'controls'].includes(type)) return
        })
    }

    let currentCover = $state($nowPlaying.cover)
    let currentVibrancy = $state<ThemeVibrancy>($settingsStore.theme.vibrancy ?? 'Auto')

    async function toggleVolumeMute() {
        await volumeStore.updateVolume({ muted: !$volumeStore.muted }, false)
        port?.postMessage({ type: 'volume', data: $volumeStore })
    }

    function getCurrentState() {
        if ($settingsStore.notifications.enabled) {
            if ($settingsStore.notifications.on_track_change) return 3
            return 2
        }
        return 1
    }

    async function toggleNotifications() {
        const currentState = getCurrentState()
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
        if ($nowPlaying.cover) {
            const vibrancy = getVibrancy()
            const { bg_colour = '#e3e3e3', text_colour = '#fafafa' } = await getColours({
                url: $nowPlaying.cover,
                vibrancy
            })

            document.documentElement.style.setProperty('--bg', bg_colour)
            document.documentElement.style.setProperty('--text', text_colour)
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
            if (state.theme.vibrancy !== currentVibrancy) {
                currentVibrancy = state.theme.vibrancy
                await loadColours()
            }
        })

        return () => {
            unsubscribeCover()
            unsubscribeVibrancy()
        }
    })
</script>

<main
    class="relative flex h-[170px] flex-col gap-1 {pip
        ? 'w-full'
        : 'w-[300px] bg-[var(--bg)] px-3.5 py-3'}"
>
    {#if !pip}
        <div class="absolute left-3 top-0">
            <span class="text-xs font-black text-[var(--text)] opacity-50">v{version}</span>
        </div>
    {/if}

    <div
        class="{pip
            ? 'absolute -top-1.5 right-1'
            : 'absolute right-1 top-0.5'} flex w-full items-center justify-end gap-x-0.5"
    >
        {#if !pip && !isSpotifyTabOpen}
            <Button
                variant="link"
                class="absolute -top-3 left-8 text-xs text-[var(--text)] underline"
                size="icon"
                aria-label="Open Spotify"
                onclick={openSpotify}
            >
                open spotify
            </Button>
        {/if}

        {#if $settingsStore.ui.popup}
            <SelectVibrancy />
        {/if}

        {#if !$settingsStore.notifications.granted}
            <Button
                size="sm"
                variant="outline"
                aria-label="Notifications"
                onclick={grantNotificationPermission}
                class="flex h-5 items-center gap-x-1 bg-[var(--text)] px-2 text-xs text-[var(--bg)] hover:bg-[var(--text)] hover:text-[var(--bg)]"
            >
                <BellPlus />
                grant
            </Button>
        {:else}
            <Button
                size="icon"
                variant="ghost"
                aria-label="Notifications"
                onclick={toggleNotifications}
                class="size-6 border-none bg-transparent text-[var(--text)] brightness-75 hover:bg-transparent hover:text-[var(--text)] [&_svg]:size-[1rem]"
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
            </Button>
        {/if}

        <Button
            variant={pip ? 'default' : 'ghost'}
            size="icon"
            aria-label="Volume"
            onclick={toggleVolumeMute}
            class="size-6 border-none bg-transparent text-[var(--text)] brightness-75 hover:bg-transparent hover:text-[var(--text)] [&_svg]:size-[1rem]"
        >
            <VolumeIcon />
        </Button>
    </div>

    <div class="flex h-16 w-full items-center gap-x-2 {pip ? 'mt-1' : 'mt-2'}">
        <CoverImage />
        <div class="flex h-16 flex-col justify-center gap-y-1 overflow-hidden text-[var(--text)]">
            <TrackInfo isPopup />
        </div>
    </div>

    <TimeProgress {port} {pip} />

    <MediaControls {port} {pip} />

    {#if pip}
        <div class="pt-1">
            <VolumeSlider {port} {pip} />
        </div>
    {/if}
</main>

<style>
    :root {
        --bg: #000000;
        --text: #ffffff;
    }
</style>
