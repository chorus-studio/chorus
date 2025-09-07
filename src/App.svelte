<script lang="ts">
    import { onMount } from 'svelte'
    import { ModeWatcher, setMode } from 'mode-watcher'
    import { mediaStore } from '$lib/stores/media'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { QueueObserver } from '$lib/observers/queue'
    import { trackObserver } from '$lib/observers/track'
    import { playbackObserver } from '$lib/observers/playback'
    import { TracklistObserver } from '$lib/observers/tracklist'

    import PipButton from '$lib/components/PipButton.svelte'
    import SkipButton from '$lib/components/SkipButton.svelte'
    import HeartButton from '$lib/components/HeartButton.svelte'
    import SettingsPopover from '$lib/components/SettingsPopover.svelte'

    let supportsPip = false

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

    onMount(() => {
        init()
        const tracklistObserver = new TracklistObserver()
        tracklistObserver.observe()
        const queueObserver = new QueueObserver()
        queueObserver.observe()
        checkIfPipSupported()

        return () => {
            nowPlaying.disconnect()
            mediaStore.disconnect()
            playbackObserver.disconnect()
            tracklistObserver.disconnect()
            trackObserver.disconnect()
            queueObserver.disconnect()
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
