<script lang="ts">
    import { onMount } from 'svelte'
    import { ModeWatcher } from 'mode-watcher'
    import { mediaStore } from '$lib/stores/media'
    import { Toaster } from '$lib/components/ui/sonner'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { QueueObserver } from '$lib/observers/queue'
    import { trackObserver } from '$lib/observers/track'
    import { playbackObserver } from '$lib/observers/playback'
    import { TracklistObserver } from '$lib/observers/tracklist'

    import SkipButton from '$lib/components/SkipButton.svelte'
    import HeartButton from '$lib/components/HeartButton.svelte'
    import SettingsPopover from '$lib/components/SettingsPopover.svelte'

    async function init() {
        await nowPlaying.observe()
        await mediaStore.observe()
        playbackObserver.observe()
    }

    onMount(() => {
        init()
        const tracklistObserver = new TracklistObserver()
        tracklistObserver.observe()
        const queueObserver = new QueueObserver()
        queueObserver.observe()

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

<ModeWatcher defaultMode="dark" />
<Toaster position="bottom-right" richColors />

<div id="chorus-ui" class="flex items-center justify-between">
    <HeartButton />
    <SettingsPopover />
    <SkipButton />
</div>
