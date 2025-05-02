<script lang="ts">
    import { seekStore } from '$lib/stores/seek'
    import { snipStore } from '$lib/stores/snip'
    import { dataStore } from '$lib/stores/data'
    import { effectsStore } from '$lib/stores/effects'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { playbackStore, defaultPlayback } from '$lib/stores/playback'

    import { Button } from '$lib/components/ui/button'

    export let tab: string

    function getStore() {
        switch (tab) {
            case 'fx|eq':
                return effectsStore
            case 'snip':
                return snipStore
            case 'speed':
                return playbackStore
            case 'seek':
                return seekStore
            default:
                return null
        }
    }

    async function resetSpeed() {
        await playbackStore.updatePlayback({ default: defaultPlayback })
        playbackStore.dispatchPlaybackSettings(defaultPlayback)
    }

    async function deleteSpeed() {
        const track = getTrack()
        if (!track) return

        await dataStore.updateTrack({
            track_id: track.track_id!,
            value: { playback: null }
        })

        delete $nowPlaying.playback

        nowPlaying.set({ ...$nowPlaying, playback: null })
        await playbackStore.updatePlayback({ track: defaultPlayback })
        playbackStore.dispatchPlaybackSettings(defaultPlayback)
    }

    function resetSnip() {
        const defaultTimes = { start_time: 0, end_time: $nowPlaying.duration }
        snipStore.set({ is_shared: false, last_updated: 'start', ...defaultTimes })
    }

    async function deleteSnip() {
        const track = getTrack()
        if (!track) return

        await dataStore.updateTrack({
            track_id: track.track_id!,
            value: { snip: null }
        })

        delete $nowPlaying.snip
        nowPlaying.set({ ...$nowPlaying, snip: null })
    }

    function getTrack() {
        return $nowPlaying.track_id
            ? dataStore.collectionObject[$nowPlaying.track_id]
            : dataStore.collection.find((x) => x.song_id == $nowPlaying.id)
    }

    async function saveSpeed() {
        const track = getTrack()
        if (!track) return

        await dataStore.updateTrack({
            track_id: track.track_id!,
            value: {
                playback: $playbackStore.track
            }
        })

        nowPlaying.set({
            ...$nowPlaying,
            playback: $playbackStore.track
        })
    }

    async function saveSnip() {
        const track = getTrack()
        if (!track) return

        if (!$snipStore) return

        await dataStore.updateTrack({
            track_id: track.track_id!,
            value: {
                snip: {
                    start_time: $snipStore.start_time!,
                    end_time: $snipStore.end_time!
                }
            }
        })
        nowPlaying.set({
            ...$nowPlaying,
            snip: {
                start_time: $snipStore.start_time!,
                end_time: $snipStore.end_time!
            }
        })
    }

    async function handleSave() {
        if (tab === 'snip') {
            await saveSnip()
        } else if (tab === 'speed') {
            await saveSpeed()
        }
    }

    async function handleDelete() {
        if (tab === 'snip') {
            await deleteSnip()
        } else if (tab === 'speed') {
            await deleteSpeed()
        }
    }

    async function handleReset() {
        const store = getStore()
        if (!store) return

        if (tab === 'fx|eq') {
            await store?.reset()
        } else if (tab == 'snip') {
            resetSnip()
        } else if (tab == 'speed') {
            await resetSpeed()
        } else {
            await store?.reset()
        }
    }

    $: showDelete =
        (tab == 'snip' && $nowPlaying?.snip) ||
        (tab == 'speed' && $nowPlaying?.playback && !$playbackStore.is_default)
    $: showSave =
        (tab == 'snip' &&
            (($snipStore?.start_time &&
                $nowPlaying?.snip &&
                $snipStore.start_time !== $nowPlaying?.snip?.start_time) ||
                $snipStore?.start_time !== 0 ||
                ($snipStore?.end_time &&
                    $nowPlaying?.snip &&
                    $snipStore.end_time !== $nowPlaying?.snip?.end_time) ||
                $snipStore?.end_time !== $nowPlaying?.duration)) ||
        (tab == 'speed' &&
            !$playbackStore.is_default &&
            ($playbackStore.track.rate != 1 ||
                $playbackStore.track.pitch != 1 ||
                $playbackStore.track.semitone != 0))
</script>

<div class="absolute bottom-0 flex items-center gap-x-2">
    {#if ['fx|eq', 'snip', 'speed', 'seek'].includes(tab)}
        {#if !showDelete}
            <Button
                variant="outline"
                size="sm"
                class="h-5 rounded-[2px] border-none bg-amber-500 px-2 py-0 pb-[0.125rem] text-sm font-semibold text-[#fafafa] hover:bg-amber-600 hover:text-[#fafafa]"
                onclick={handleReset}
            >
                reset
            </Button>
        {/if}

        {#if showDelete}
            <Button
                variant="outline"
                size="sm"
                class="h-5 rounded-[2px] border-none bg-red-500 px-2 py-0 pb-[0.125rem] text-sm font-semibold text-[#fafafa] hover:bg-red-600 hover:text-[#fafafa]"
                onclick={handleDelete}
            >
                delete
            </Button>
        {/if}

        {#if showSave}
            <Button
                variant="outline"
                size="sm"
                onclick={handleSave}
                class="h-5 rounded-[2px] border-none bg-green-700 px-2 py-0 pb-[0.125rem] text-sm font-semibold text-[#fafafa] hover:bg-green-800 hover:text-[#fafafa]"
            >
                save
            </Button>
        {/if}
    {/if}
</div>
