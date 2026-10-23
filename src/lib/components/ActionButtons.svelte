<script lang="ts">
    import { get } from 'svelte/store'
    import { seekStore } from '$lib/stores/seek'
    import { snipStore } from '$lib/stores/snip'
    import { dataStore } from '$lib/stores/data'
    import { effectsStore } from '$lib/stores/effects'
    import { reverbParamsStore } from '$lib/stores/reverb-params'
    import { eqBandsStore } from '$lib/stores/eq-bands'
    import { eqSubView, fxSubView } from '$lib/stores/effects-ui'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { playbackStore, defaultPlayback } from '$lib/stores/playback'

    import Check from '@lucide/svelte/icons/check'
    import Power from '@lucide/svelte/icons/power'
    import Trash2 from '@lucide/svelte/icons/trash-2'
    import RotateCcw from '@lucide/svelte/icons/rotate-ccw'
    import { Button } from '$lib/components/ui/button'

    let { tab }: { tab: string } = $props()

    function getStore() {
        switch (tab) {
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

        await nowPlaying.updateState({
            playback: $playbackStore.track
        })
    }

    async function saveSnip() {
        const track = getTrack()
        if (!track) return

        if (!$snipStore) return

        // Reject malformed snips instead of persisting them: an unset bound
        // would save undefined (the ! only silences the compiler), and
        // end <= start (e.g. end_time 0 seeded from an unknown duration)
        // insta-skips the track on every play via the snip-end checks.
        const { start_time, end_time } = $snipStore
        if (typeof start_time !== 'number' || typeof end_time !== 'number') return
        // !(>) instead of (<=) so NaN in either bound is also rejected.
        if (!(end_time > start_time)) return

        const snipData = { start_time, end_time }

        await dataStore.updateTrack({
            track_id: track.track_id!,
            value: { snip: snipData }
        })

        await nowPlaying.updateState({
            snip: snipData
        })

        nowPlaying.setCurrentTime(snipData.start_time)
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
        // fx/eq share effectsStore but each tab must reset ONLY its own effect —
        // effectsStore.reset() would wipe both reverb and the equalizer at once.
        // Reset is context-sensitive: in the config sub-view it returns the sliders
        // to their "from:" starting point (keeping the effect on); in the presets
        // sub-view it turns the effect off + flattens the sliders (silently — a
        // dispatch would rebuild the node just torn down).
        if (tab === 'fx') {
            if (get(fxSubView) === 'config') return reverbParamsStore.resetToSeed()
            await effectsStore.updateEffect({ key: 'reverb', value: 'none' })
            return reverbParamsStore.resetSilent()
        }
        if (tab === 'eq') {
            if (get(eqSubView) === 'config') return eqBandsStore.resetToSeed()
            await effectsStore.updateEffect({ key: 'equalizer', value: 'none' })
            return eqBandsStore.resetSilent()
        }

        const store = getStore()
        if (!store) return

        if (tab == 'snip') {
            resetSnip()
        } else if (tab == 'speed') {
            await resetSpeed()
        } else {
            await store?.reset()
        }
    }

    const showDelete = $derived(
        Boolean(
            (tab == 'snip' && $nowPlaying?.snip) ||
                (tab == 'speed' && $nowPlaying?.playback && !$playbackStore.is_default)
        )
    )
    const showSave = $derived(
        Boolean(
            (tab == 'snip' &&
                $snipStore &&
                (($nowPlaying?.snip &&
                    ($snipStore.start_time !== $nowPlaying.snip.start_time ||
                        $snipStore.end_time !== $nowPlaying.snip.end_time)) ||
                    (!$nowPlaying?.snip &&
                        ($snipStore.start_time !== 0 ||
                            $snipStore.end_time !== $nowPlaying.duration)))) ||
                (tab == 'speed' &&
                    !$playbackStore.is_default &&
                    ($playbackStore.track.rate.value != 1 ||
                        !$playbackStore.track.rate.preserves_pitch ||
                        $playbackStore.track.pitch != 1 ||
                        $playbackStore.track.semitone != 0))
        )
    )
    const hasActions = $derived(['fx', 'eq', 'snip', 'speed', 'seek'].includes(tab))
    // fx/eq: "Turn off" in the presets view, "Reset config" while editing.
    const effectSub = $derived(tab === 'fx' ? $fxSubView : tab === 'eq' ? $eqSubView : null)
    const resetLabel = $derived(
        effectSub === null ? 'Reset' : effectSub === 'config' ? 'Reset config' : 'Turn off'
    )
    const resetTitle = $derived(
        tab === 'snip'
            ? 'Reset the bounds to the whole track'
            : tab === 'speed'
              ? 'Reset rate, pitch and key to normal'
              : tab === 'seek'
                ? 'Back to 10 s / 30 s'
                : effectSub === 'config'
                  ? 'Return the sliders to where you started'
                  : 'Switch the effect off'
    )
</script>

{#if hasActions}
    <div class="flex items-center gap-1">
        {#if !showDelete}
            <Button variant="ghost" size="sm" onclick={handleReset} title={resetTitle}>
                {#if resetLabel === 'Turn off'}
                    <Power class="size-3.5" />
                {:else}
                    <RotateCcw class="size-3.5" />
                {/if}
                {resetLabel}
            </Button>
        {/if}

        {#if showDelete}
            <Button
                variant="ghost"
                size="sm"
                onclick={handleDelete}
                class="text-alarm hover:bg-alarm/10 hover:text-alarm"
                title={tab === 'snip' ? 'Remove saved snip' : 'Remove saved track speed'}
            >
                <Trash2 class="size-3.5" />
                Delete
            </Button>
        {/if}

        {#if showSave}
            <Button size="sm" onclick={handleSave}>
                <Check class="size-3.5" />
                {showDelete ? 'Update' : 'Save'}
            </Button>
        {/if}
    </div>
{/if}
