import { get } from 'svelte/store'
import { dataStore } from '$lib/stores/data'
import { snipStore } from '$lib/stores/snip'
import { nowPlaying } from '$lib/stores/now-playing'
import {
    defaultSnip,
    firstSegmentStart,
    normalizeRanges,
    snipsEqual,
    toSegments,
    type Snip
} from '$lib/utils/snip-ranges'

/** The collection entry of the playing track, if it has one yet. */
export function playingTrack() {
    const state = get(nowPlaying)
    return state.track_id
        ? dataStore.collectionObject[state.track_id]
        : dataStore.collection.find((track) => track.song_id == state.id)
}

/**
 * Persist the editor's draft as the playing track's snip, from the Save
 * button or the mark shortcut. The snip is stored clean: sorted, clamped to
 * the track, overlapping or touching sections merged, and nothing shorter
 * than a second (a zero-length section seeded from an unknown duration would
 * otherwise insta-skip the track on every play). Play mode over the whole
 * track is "no snip", so there is nothing to save. Playback then jumps to the
 * first section so the result is heard. Returns what was saved, or null.
 */
export async function saveSnipDraft(): Promise<Snip | null> {
    const track = playingTrack()
    const draft = get(snipStore)
    if (!track || !draft) return null

    const state = get(nowPlaying)
    const duration = state.duration ?? 0
    const ranges = normalizeRanges(draft.ranges, duration)
    if (ranges.length === 0) return null
    const snip: Snip = { mode: draft.mode, ranges }
    if (snipsEqual(snip, defaultSnip(duration))) return null

    // The Snips dialog lists by this stamp and shows the cover.
    await dataStore.updateTrack({
        track_id: track.track_id!,
        value: { snip, snipped_at: Date.now(), ...(state.cover ? { cover: state.cover } : {}) }
    })
    await nowPlaying.updateState({ snip })
    nowPlaying.setCurrentTime(firstSegmentStart(toSegments(snip, duration)))
    return snip
}
