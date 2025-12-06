<script lang="ts">
    import { onMount } from 'svelte'
    import { ModeWatcher, setMode } from 'mode-watcher'
    import { mediaStore } from '$lib/stores/media'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { trackObserver } from '$lib/observers/track'
    import { playbackObserver } from '$lib/observers/playback'
    import { TracklistObserver } from '$lib/observers/tracklist'
    import { setTheme, removeTheme, type ThemeName } from '$lib/utils/theming'

    import PipButton from '$lib/components/PipButton.svelte'
    import SkipButton from '$lib/components/SkipButton.svelte'
    import HeartButton from '$lib/components/HeartButton.svelte'
    import SettingsPopover from '$lib/components/SettingsPopover.svelte'

    let supportsPip = false
    let themeChangeListener: (e: Event) => void

    async function init() {
        setMode('dark')
        await nowPlaying.observe()
        await mediaStore.observe()
        playbackObserver.observe()
        await mediaStore.setActive(false)
    }

    function checkIfPipSupported() {
        if (typeof window !== 'undefined' && 'pictureInPictureEnabled' in document) {
            supportsPip = document.pictureInPictureEnabled
        }
    }

    function setupListener() {
        themeChangeListener = async (e: Event) => {
            const customEvent = e as CustomEvent<{ theme: ThemeName }>
            const theme = customEvent.detail.theme
            if (theme === 'spotify') return removeTheme()
            await setTheme(theme)
        }
        document.addEventListener('FROM_THEME_CHANGE', themeChangeListener)
    }

    function removeListener() {
        if (themeChangeListener) {
            document.removeEventListener('FROM_THEME_CHANGE', themeChangeListener)
        }
    }

    onMount(() => {
        init()
        setupListener()
        const tracklistObserver = new TracklistObserver()
        tracklistObserver.observe()
        checkIfPipSupported()

        return () => {
            nowPlaying.disconnect()
            mediaStore.disconnect()
            playbackObserver.disconnect()
            tracklistObserver.disconnect()
            trackObserver.disconnect()
            removeListener()
        }
    })
</script>

<ModeWatcher defaultMode="dark" track={false} />

<div id="chorus-ui" class="dark flex items-center justify-between">
    <HeartButton />
    <SettingsPopover />
    <SkipButton />
    {#if supportsPip}
        <PipButton />
    {/if}
</div>
