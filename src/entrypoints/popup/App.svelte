<script lang="ts">
    import '../../app.css'
    import { onMount } from 'svelte'
    import { storage } from '@wxt-dev/storage'
    import { volumeStore } from '$lib/stores/volume'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { getImageBackgroundAndTextColours } from '$lib/utils/image-colours'

    import CoverImage from './CoverImage.svelte'
    import MediaControls from './MediaControls.svelte'
    import { Button } from '$lib/components/ui/button'
    import TrackInfo from '$lib/components/TrackInfo.svelte'
    import VolumeIcon from '$lib/components/VolumeIcon.svelte'
    import TimeProgress from '$lib/components/TimeProgress.svelte'

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

    onMount(() => {
        setupPort()
        getColours()

        return () => port?.disconnect()
    })
</script>

<main class="relative flex h-[160px] w-[300px] flex-col gap-1 bg-[var(--bg)] px-3.5 py-3">
    <Button
        variant="ghost"
        size="icon"
        aria-label="Volume"
        onclick={toggleVolumeMute}
        class="absolute -top-1 right-0 size-8 border-none bg-transparent text-[var(--text)] brightness-75 hover:bg-transparent hover:text-[var(--text)] [&_svg]:size-[1rem]"
    >
        <VolumeIcon />
    </Button>
    <div class="flex h-16 w-full items-center gap-x-2">
        <CoverImage />
        <div class="flex h-16 flex-col justify-center gap-y-1 overflow-hidden text-[var(--text)]">
            <TrackInfo isPopup />
        </div>
    </div>
    <TimeProgress {port} />
    <MediaControls {port} />
</main>

<style>
    :root {
        --bg: #000000;
        --text: #ffffff;
    }
</style>
