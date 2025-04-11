<script lang="ts">
    import { onMount } from 'svelte'
    import { storage } from '@wxt-dev/storage'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { settingsStore } from '$lib/stores/settings'
    import { supporterStore } from '$lib/stores/supporter'
    import { volumeStore } from '$lib/stores/volume'
    import Bell from '@lucide/svelte/icons/bell'
    import BellOff from '@lucide/svelte/icons/bell-off'
    import BellPlus from '@lucide/svelte/icons/bell-plus'
    import BellRing from '@lucide/svelte/icons/bell-ring'

    import { getImageBackgroundAndTextColours } from '$lib/utils/image-colours'

    import { Button } from '$lib/components/ui/button'
    import TrackInfo from '$lib/components/TrackInfo.svelte'
    import VolumeIcon from '$lib/components/VolumeIcon.svelte'
    import CoverImage from '$lib/components/CoverImage.svelte'
    import VolumeSlider from '$lib/components/VolumeSlider.svelte'
    import TimeProgress from '$lib/components/TimeProgress.svelte'
    import MediaControls from '$lib/components/MediaControls.svelte'

    import { getCheckPermissionsService } from '$lib/utils/check-permissions'

    let { pip = false }: { pip: boolean } = $props()

    let port = $state<chrome.runtime.Port | null>(null)
    let colours = $state<{ backgroundColour: string; textColour: string }>({
        backgroundColour: $nowPlaying.backgroundColour ?? '#000000',
        textColour: $nowPlaying.textColour ?? '#ffffff'
    })

    function loadImage(url: string, element: HTMLImageElement): Promise<void> {
        return new Promise((resolve, reject) => {
            element.onload = () => resolve()
            element.onerror = reject
            element.src = url
            element.crossOrigin = 'anonymous'
        })
    }

    async function getColours() {
        const { cover: url } = $nowPlaying
        if (!url) {
            colours = { backgroundColour: '#000000', textColour: '#ffffff' }
            return
        }

        try {
            const img = new Image(64, 64)
            img.crossOrigin = 'anonymous'
            await loadImage(url, img)

            const canvas = document.createElement('canvas')
            if (img.complete) {
                const { textColour, backgroundColour } = getImageBackgroundAndTextColours({
                    img,
                    canvas
                })
                colours = { textColour, backgroundColour }
                await storage.setItem('local:chorus_now_playing', {
                    ...$nowPlaying,
                    ...colours
                })
            }
        } catch (error) {
            console.error('Error loading image:', error)
            colours = { backgroundColour: '#000000', textColour: '#ffffff' }
        }
    }

    function setupPort() {
        port = chrome.runtime.connect({ name: 'popup' })
        port.onMessage.addListener(async ({ type, data }: { type: string; data: any }) => {
            if (!['enabled', 'controls'].includes(type)) return
        })
    }

    let currentCover = $state('')

    $effect(() => {
        const cover = $nowPlaying.cover
        if (cover && cover !== currentCover) {
            currentCover = cover
            getColours()
        }
    })

    $effect(() => {
        // Update CSS custom properties whenever colours change
        document.documentElement.style.setProperty('--bg', colours.backgroundColour)
        document.documentElement.style.setProperty('--text', colours.textColour)
    })

    async function toggleVolumeMute() {
        await volumeStore.updateVolume({ muted: !$volumeStore.muted })
        port?.postMessage({ type: 'volume', data: $volumeStore })
    }

    function getCurrentState() {
        if ($settingsStore.notifications.enabled) {
            if ($settingsStore.notifications.on_track_change) {
                return 3
            }
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
        const granted = await checkPermissionsService.verifyPermission('notifications')

        await settingsStore.updateSettings({
            notifications: { ...$settingsStore.notifications, granted, enabled: granted }
        })
    }

    onMount(() => {
        ;(async () => await supporterStore.sync())()
        setupPort()
        getColours()

        return () => port?.disconnect()
    })
</script>

<main
    class="relative flex {pip
        ? 'h-[170px] w-full'
        : 'h-[160px] w-[300px] bg-[var(--bg)] px-3.5 py-3'} flex-col gap-1"
>
    <div
        class="absolute {pip
            ? '-top-2'
            : 'top-0'} right-2 flex w-full items-center justify-end gap-x-0.5"
    >
        {#if $supporterStore.isSupporter}
            {#if !$settingsStore.notifications.granted}
                <Button
                    size="sm"
                    variant="outline"
                    aria-label="Notifications"
                    onclick={grantNotificationPermission}
                    class="flex h-5 items-center gap-x-1 bg-[var(--text)] px-2 text-xs text-[var(--bg)]"
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
        {/if}

        {#if pip}
            <Button
                variant={pip ? 'default' : 'ghost'}
                size="icon"
                aria-label="Volume"
                onclick={toggleVolumeMute}
                class="size-6 border-none bg-transparent text-[var(--text)] brightness-75 hover:bg-transparent hover:text-[var(--text)] [&_svg]:size-[1rem]"
            >
                <VolumeIcon />
            </Button>
        {/if}
    </div>
    <div class="flex h-16 w-full items-center gap-x-2 {pip ? 'mt-1' : ''}">
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
