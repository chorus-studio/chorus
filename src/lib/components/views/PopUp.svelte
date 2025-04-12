<script lang="ts">
    import { onMount } from 'svelte'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { settingsStore } from '$lib/stores/settings'
    import { supporterStore } from '$lib/stores/supporter'
    import { volumeStore } from '$lib/stores/volume'
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

    import { getColours } from '$lib/utils/vibrant-colors'
    import { getCheckPermissionsService } from '$lib/utils/check-permissions'

    let { pip = false }: { pip: boolean } = $props()

    let port = $state<chrome.runtime.Port | null>(null)
    let colours = $state<{ bg_colour: string; text_colour: string }>({
        bg_colour: $nowPlaying.bg_colour ?? '#000000',
        text_colour: $nowPlaying.text_colour ?? '#ffffff'
    })

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
            ;(async () => await loadColours())()
        }
    })

    $effect(() => {
        // Only update if values have actually changed
        if (
            colours.bg_colour !== ($nowPlaying.bg_colour ?? '#000000') ||
            colours.text_colour !== ($nowPlaying.text_colour ?? '#ffffff')
        ) {
            colours.bg_colour = $nowPlaying.bg_colour ?? '#000000'
            colours.text_colour = $nowPlaying.text_colour ?? '#ffffff'
            // Update CSS custom properties
            document.documentElement.style.setProperty('--bg', colours.bg_colour)
            document.documentElement.style.setProperty('--text', colours.text_colour)
        }
    })

    async function toggleVolumeMute() {
        await volumeStore.updateVolume({ muted: !$volumeStore.muted })
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
        const granted = await checkPermissionsService.verifyPermission('notifications')

        await settingsStore.updateSettings({
            notifications: { ...$settingsStore.notifications, granted, enabled: granted }
        })
    }

    async function loadColours() {
        if ($nowPlaying.cover) {
            await getColours($nowPlaying.cover)
            // Update colours state directly after getColours completes
            colours = {
                bg_colour: $nowPlaying.bg_colour ?? '#000000',
                text_colour: $nowPlaying.text_colour ?? '#ffffff'
            }
        }
    }

    onMount(() => {
        ;(async () => await supporterStore.sync())()
        setupPort()
        loadColours()

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
