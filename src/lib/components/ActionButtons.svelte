<script lang="ts">
    import { get } from 'svelte/store'
    import { seekStore } from '$lib/stores/seek'
    import { snipStore } from '$lib/stores/snip'
    import { dataStore } from '$lib/stores/data'
    import { effectsStore } from '$lib/stores/effects'
    import { lofiStore } from '$lib/stores/lofi'
    import { reverbParamsStore } from '$lib/stores/reverb-params'
    import { eqBandsStore } from '$lib/stores/eq-bands'
    import { msParamsStore } from '$lib/stores/ms-params'
    import { eqSubView, fxSubView, msSubView, presetsSubView } from '$lib/stores/effects-ui'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { playbackStore, defaultPlayback } from '$lib/stores/playback'
    import {
        applyNormal,
        applyPresetValues,
        currentValues,
        tweakOrigin,
        updatePresetSlot
    } from '$lib/utils/quick-presets'
    import {
        defaultSnip,
        firstSegmentStart,
        normalizeRanges,
        snipsEqual,
        toSegments,
        type Snip
    } from '$lib/utils/snip-ranges'

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
        snipStore.seed(null, $nowPlaying.duration ?? 0)
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

        // Persist a clean snip: sorted, clamped to the track, overlapping or
        // touching sections merged, and nothing shorter than a second (a
        // zero-length section seeded from an unknown duration would otherwise
        // insta-skip the track on every play). Play mode over the whole track
        // is "no snip", so there is nothing to save.
        const duration = $nowPlaying.duration ?? 0
        const ranges = normalizeRanges($snipStore.ranges, duration)
        if (ranges.length === 0) return
        const snip: Snip = { mode: $snipStore.mode, ranges }
        if (snipsEqual(snip, defaultSnip(duration))) return

        await dataStore.updateTrack({
            track_id: track.track_id!,
            value: { snip }
        })

        await nowPlaying.updateState({ snip })

        nowPlaying.setCurrentTime(firstSegmentStart(toSegments(snip, duration)))
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
        // Presets: everything audio back to normal in one go; in the rack view
        // only the rack goes off, speed and the Chorus slots stay.
        if (tab === 'presets') {
            if (get(presetsSubView) === 'rack') return lofiStore.reset()
            return applyNormal()
        }

        // fx/eq/ms share effectsStore but each tab must reset ONLY its own effect —
        // effectsStore.reset() would wipe all three at once.
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
        if (tab === 'ms') {
            if (get(msSubView) === 'config') return msParamsStore.resetToSeed()
            await effectsStore.updateEffect({ key: 'msProcessor', value: 'none' })
            return msParamsStore.resetSilent()
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
    // The draft differs from what is saved — or, with nothing saved, from the
    // whole-track default it was seeded with.
    const snipDirty = $derived.by(() => {
        if (tab !== 'snip' || !$snipStore) return false
        const draft: Snip = { mode: $snipStore.mode, ranges: $snipStore.ranges }
        const baseline = $nowPlaying?.snip ?? defaultSnip($nowPlaying.duration ?? 0)
        return !snipsEqual(draft, baseline)
    })
    const showSave = $derived(
        Boolean(
            snipDirty ||
                (tab == 'speed' &&
                    !$playbackStore.is_default &&
                    ($playbackStore.track.rate.value != 1 ||
                        !$playbackStore.track.rate.preserves_pitch ||
                        $playbackStore.track.pitch != 1 ||
                        $playbackStore.track.semitone != 0))
        )
    )
    const hasActions = $derived(
        ['presets', 'fx', 'eq', 'ms', 'snip', 'speed', 'seek'].includes(tab)
    )
    // Presets: what's playing drifted from the preset it began as. Revert goes
    // back to it; Update, for one of the user's own, writes the drift into it.
    const origin = $derived(tab === 'presets' ? $tweakOrigin : null)
    const revert = () => origin && applyPresetValues(origin.preset, origin.preset.id)
    const update = () => origin?.mine && updatePresetSlot(origin.preset.id, currentValues())
    // fx/eq/ms: "Turn off" in the presets view, "Reset config" while editing.
    const effectSub = $derived(
        tab === 'fx' ? $fxSubView : tab === 'eq' ? $eqSubView : tab === 'ms' ? $msSubView : null
    )
    const inRack = $derived(tab === 'presets' && $presetsSubView === 'rack')
    const resetLabel = $derived(
        inRack
            ? 'Turn off'
            : tab === 'presets'
              ? 'Normal'
              : effectSub === null
                ? 'Reset'
                : effectSub === 'config'
                  ? 'Reset config'
                  : 'Turn off'
    )
    const resetTitle = $derived(
        inRack
            ? 'Switch every texture effect off'
            : tab === 'presets'
              ? 'Rate, pitch, key, reverb, EQ and stereo back to normal'
              : tab === 'snip'
                ? 'Reset to the whole track'
                : tab === 'speed'
                  ? 'Reset rate, pitch and key to normal'
                  : tab === 'seek'
                    ? 'Back to 10 s for music, 30 s and a 5 s jump back for podcasts'
                    : effectSub === 'config'
                      ? 'Return the sliders to where you started'
                      : 'Switch the effect off'
    )
</script>

{#if hasActions}
    <div class="flex items-center gap-1">
        {#if !showDelete}
            <Button variant="ghost" size="sm" onclick={handleReset} title={resetTitle}>
                {#if resetLabel === 'Turn off' || resetLabel === 'Normal'}
                    <Power class="size-3.5" />
                {:else}
                    <RotateCcw class="size-3.5" />
                {/if}
                {resetLabel}
            </Button>
        {/if}

        {#if origin}
            <Button
                variant="ghost"
                size="sm"
                onclick={revert}
                title={`Back to ${origin.preset.name} as it was`}
            >
                <RotateCcw class="size-3.5" />
                Revert
            </Button>
            {#if origin.mine}
                <Button
                    size="sm"
                    onclick={update}
                    title={`Save what's playing into ${origin.preset.name}`}
                >
                    <Check class="size-3.5" />
                    Update
                </Button>
            {/if}
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
