<script lang="ts">
    import { onMount } from 'svelte'
    import { ModeWatcher, setMode } from 'mode-watcher'
    import { mediaStore } from '$lib/stores/media'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { trackObserver } from '$lib/observers/track'
    import { playbackObserver } from '$lib/observers/playback'
    import { tracklistObserver } from '$lib/observers/tracklist'
    import { get } from 'svelte/store'
    import { applyLook, watchSystemMode } from '$lib/utils/theming'
    import { settingsStore } from '$lib/stores/settings'
    import { listenForQuickPresetCommands } from '$lib/utils/quick-presets'
    import { watchSleepTimer } from '$lib/utils/sleep-timer'

    // Import stores to ensure they're initialized and set up their listeners
    import '$lib/stores/effects'
    import '$lib/stores/playback'
    import '$lib/stores/ms-params'
    import '$lib/stores/reverb-params'
    import '$lib/stores/eq-bands'
    import '$lib/stores/volume'

    import PipButton from '$lib/components/PipButton.svelte'
    import SkipButton from '$lib/components/SkipButton.svelte'
    import HeartButton from '$lib/components/HeartButton.svelte'
    import SettingsPopover from '$lib/components/SettingsPopover.svelte'
    import SnipMarkButton from '$lib/components/SnipMarkButton.svelte'

    let supportsPip = false
    let themeChangeListener: (e: Event) => void
    let unsubscribeLook: (() => void) | undefined
    let unwatchSystem: (() => void) | undefined
    let unlistenQuickPresets: (() => void) | undefined
    let unwatchSleep: (() => void) | undefined

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
        // Palette, "Apply theme", appearance and glass all live in settings, so
        // one subscription keeps the page and rack in step whether the change
        // came from this page, the PiP window or the toolbar popup (via storage).
        themeChangeListener = () => void applyLook(get(settingsStore))
        document.addEventListener('FROM_THEME_CHANGE', themeChangeListener)
        unsubscribeLook = settingsStore.subscribe((s) => void applyLook(s))
        unwatchSystem = watchSystemMode(() => void applyLook(get(settingsStore)))
        // Preset keyboard commands (next / previous / slot N) arrive from the
        // background as window messages; applying them here keeps the stores,
        // and so every tab of the popover, in step with what is playing.
        unlistenQuickPresets = listenForQuickPresetCommands()
        // The sleep timer set in the popup fades and pauses here, where the audio is.
        unwatchSleep = watchSleepTimer()
    }

    function removeListener() {
        if (themeChangeListener) {
            document.removeEventListener('FROM_THEME_CHANGE', themeChangeListener)
        }
        unsubscribeLook?.()
        unsubscribeLook = undefined
        unwatchSystem?.()
        unwatchSystem = undefined
        unlistenQuickPresets?.()
        unlistenQuickPresets = undefined
        unwatchSleep?.()
        unwatchSleep = undefined
    }

    onMount(() => {
        init()
        setupListener()
        tracklistObserver.observe()
        checkIfPipSupported()

        // Lightweight cleanup only: this runs on every App remount (reconcile
        // re-mounts when Spotify swaps the now-playing widget), so it must NOT
        // restore Spotify's native controls or remove per-row buttons — that
        // heavy, vanilla-restoring teardown is reserved for master-OFF and is
        // driven from removeChorusUI() in the content script.
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

<div id="chorus-ui" class="dark flex items-center gap-x-0.5">
    <HeartButton />
    <SettingsPopover />
    <SkipButton />
    <SnipMarkButton />
    {#if supportsPip}
        <PipButton />
    {/if}
</div>
