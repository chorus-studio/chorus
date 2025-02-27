<script lang="ts">
    import { onMount } from 'svelte'
    import { ModeWatcher } from 'mode-watcher'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { QueueObserver } from '$lib/observers/queue'
    import { trackObserver } from '$lib/observers/track'
    import { PlaybackObserver } from '$lib/observers/playback'
    import { TracklistObserver } from '$lib/observers/tracklist'

    import SkipButton from '$lib/components/SkipButton.svelte'
    import HeartButton from '$lib/components/HeartButton.svelte'
    import SettingsPopover from '$lib/components/SettingsPopover.svelte'

    function removeAddToPlaylistButton() {
        const addToPlaylistButton = document.querySelector(
            '[data-testid="now-playing-widget"] > div > button[data-encore-id="buttonTertiary"]'
        ) as HTMLButtonElement
        const parent = addToPlaylistButton?.parentElement
        if (parent) {
            parent.style.margin = '0'
            parent.style.gap = '0'
        }
        if (addToPlaylistButton) {
            addToPlaylistButton.style.visibility = 'hidden'
        }
    }

    async function init() {
        removeAddToPlaylistButton()
        await nowPlaying.observe()
    }

    onMount(() => {
        init()
        const playbackObserver = new PlaybackObserver()
        playbackObserver.observe()
        const tracklistObserver = new TracklistObserver()
        tracklistObserver.observe()
        const queueObserver = new QueueObserver()
        queueObserver.observe()

        return () => {
            nowPlaying.disconnect()
            playbackObserver.disconnect()
            tracklistObserver.disconnect()
            trackObserver.disconnect()
            queueObserver.disconnect()
        }
    })
</script>

<ModeWatcher defaultMode="dark" />
<div class="flex items-center justify-between">
    <HeartButton />
    <SettingsPopover />
    <SkipButton />
</div>
