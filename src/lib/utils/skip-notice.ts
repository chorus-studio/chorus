import { get } from 'svelte/store'
import { toast } from 'svelte-sonner'
import { configStore, type AutoSkip } from '$lib/stores/config'
import { dataStore } from '$lib/stores/data'
import { getPlayerService } from '$lib/api/services/player'
import { artistsOf, matchesBlockedArtist, skipReason, type TrackFacts } from '$lib/utils/auto-skip'

/**
 * The "Skipped …" notice: when a block or an auto-skip rule moves past a track,
 * a toast says which track and why, with one action to hear it anyway. A
 * silent skip is confusing, and an undo takes the fear out of blocking.
 */
export type SkippedTrack = TrackFacts & {
    track_id?: string | null
    blocked?: boolean | null
}

/** How long the same track is not announced again (ms). */
export const ANNOUNCE_AGAIN_AFTER_MS = 15_000
export const NOTICE_DURATION_MS = 8000

let lastAnnounced: { id: string; at: number } | null = null
/** The one track the person asked to hear despite a block or a rule. */
let allowedId: string | null = null

/** True while the track is the one the person chose to hear anyway. */
export const isAllowedOnce = (track_id?: string | null): boolean =>
    Boolean(track_id) && track_id === allowedId

export function allowOnce(track_id: string): void {
    allowedId = track_id
}

/** Another track started: the allowance was for the one before it. */
export function noteTrackStarted(track_id?: string | null): void {
    if (allowedId && allowedId !== track_id) allowedId = null
}

/** Why the track is skipped, for the notice; null when it would not be. */
export function describeSkip(track: SkippedTrack, rules: AutoSkip): string | null {
    if (track.blocked) return 'blocked'
    const reason = skipReason(rules, track)
    if (reason === 'artist') {
        const name = artistsOf(track.artist).find((a) => matchesBlockedArtist(rules.artists, a))
        return name ? `blocked artist ${name}` : 'blocked artist'
    }
    if (reason === 'short') return `shorter than ${rules.min_seconds} s`
    if (reason === 'keyword') {
        const facts = { title: track.title, artist: track.artist }
        const hit =
            rules.title_keywords.find((k) =>
                skipReason(
                    { ...rules, artist_keywords: [], title_keywords: [k], min_seconds: 0 },
                    facts
                )
            ) ??
            rules.artist_keywords.find((k) =>
                skipReason(
                    { ...rules, title_keywords: [], artist_keywords: [k], min_seconds: 0 },
                    facts
                )
            )
        return hit ? `matches “${hit}”` : 'matches a keyword'
    }
    return null
}

async function playAnyway(track: SkippedTrack): Promise<void> {
    const track_id = track.track_id
    if (!track_id) return
    allowOnce(track_id)
    if (track.blocked) {
        await dataStore.updateTrack({ track_id, value: { blocked: null, blocked_at: null } })
        document.dispatchEvent(new CustomEvent('chorus:track-unblocked', { detail: { track_id } }))
    }
    try {
        await getPlayerService().playRelease(`spotify:track:${track_id}`)
    } catch (error) {
        console.error('Could not play the skipped track:', error)
        toast.error('Could not start that track')
    }
}

/** Show the notice for a skip, once per track, unless it was just announced. */
export function announceSkip(track: SkippedTrack, now = Date.now()): boolean {
    const id = track.track_id || `${track.title ?? ''} by ${track.artist ?? ''}`
    if (
        lastAnnounced &&
        lastAnnounced.id === id &&
        now - lastAnnounced.at < ANNOUNCE_AGAIN_AFTER_MS
    ) {
        return false
    }
    lastAnnounced = { id, at: now }
    const why = describeSkip(track, get(configStore).auto_skip)
    const title = track.title || 'a track'
    toast(`Skipped ${title}`, {
        description: [track.artist, why].filter(Boolean).join(' · '),
        duration: NOTICE_DURATION_MS,
        ...(track.track_id
            ? {
                  action: {
                      label: track.blocked ? 'Unblock & play' : 'Play anyway',
                      onClick: () => void playAnyway(track)
                  }
              }
            : {})
    })
    return true
}
