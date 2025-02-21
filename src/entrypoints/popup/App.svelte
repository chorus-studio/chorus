<script lang="ts">
    import '../../app.css'
    import { onMount } from 'svelte'
    import { setState } from '$lib/utils/state'
    import { mediaStore } from '$lib/stores/media'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { getImageBackgroundAndTextColours } from '$lib/utils/image-colours'

    import CoverImage from './CoverImage.svelte'
    import MediaControls from './MediaControls.svelte'
    import TrackInfo from '$lib/components/TrackInfo.svelte'
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
                await setState({ key: 'now-playing', values: { ...$nowPlaying, ...colours } })
            }
        } catch (error) {
            console.error('Error loading image:', error)
            colours = { backgroundColour: '#000000', textColour: '#ffffff' }
        }
    }

    function setupPort() {
        port = chrome.runtime.connect({ name: 'popup' })
        port.onMessage.addListener(async ({ type, data = {} }) => {
            if (!['enabled', 'now-playing', 'controls', 'state', 'ui-state'].includes(type)) return

            if (type == 'controls') {
                await mediaStore.updateKey([{ key: data.key, data: data.result, type }])
            }

            if (type == 'state') {
                await mediaStore.updateMedia([{ key: data.key, data: data.result, type }])
            }
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

    onMount(() => {
        setupPort()
        getColours()

        return () => port?.disconnect()
    })
</script>

<main class="flex h-[160px] w-[300px] flex-col gap-1 bg-[var(--bg)] px-3.5 py-3">
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
