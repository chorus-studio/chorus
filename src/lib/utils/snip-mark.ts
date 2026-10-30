import { get } from 'svelte/store'
import { toast } from 'svelte-sonner'
import { snipStore } from '$lib/stores/snip'
import { nowPlaying } from '$lib/stores/now-playing'
import { playback } from '$lib/utils/playback'
import { saveSnipDraft } from '$lib/utils/snip-save'
import { MIN_SECTION_LENGTH, type SnipRange } from '$lib/utils/snip-ranges'
import { formatRulerTime, round1 } from '$lib/utils/snip-time'

/**
 * The `snip-mark` keyboard command, a looper's one button: press it where a
 * section should start and again where it should end, and the snip is saved
 * and heard. A press after a section was closed opens another, so a chorus
 * and a later verse take four presses. The sections take the mode of the
 * track's snip (play, or skip), play when it has none.
 *
 * In play mode the open section goes into the editor's draft at once, running
 * to the next section or the track end, because the engine only lets playback
 * run inside the draft's sections; the Snip tab shows it live when open. In
 * skip mode only the start is remembered, since a draft skip section would be
 * skipped as soon as it existed.
 */

type Pending = { track_id: string; start: number; owns_draft: boolean }
let pending: Pending | null = null

/** When the track's length is unknown an open section runs this far. */
const OPEN_SECTION_SECONDS = 3600

/** What a press means, given the open mark and where playback is. */
export function nextMark(
    open: Pending | null,
    track_id: string,
    playhead: number
): 'start' | 'end' {
    if (!open || open.track_id !== track_id) return 'start'
    return playhead >= open.start + MIN_SECTION_LENGTH ? 'end' : 'start'
}

export function pendingMark(): Pending | null {
    return pending
}

function insertRange(range: SnipRange) {
    snipStore.update((draft) => {
        if (!draft) return draft
        // A draft seeded without a known length holds one zero-length section; drop such husks.
        const kept = draft.ranges.filter((r) => r.end - r.start >= MIN_SECTION_LENGTH)
        const ranges = [...kept, range].sort((a, b) => a.start - b.start)
        return { ...draft, ranges, selected: ranges.indexOf(range), last_updated: null }
    })
}

/** Open a play section at `at`: the section around it starts here, else a new one runs on to the next. */
function openPlaySection(at: number, duration: number): SnipRange | null {
    const draft = get(snipStore)
    if (!draft) return null
    const inside = draft.ranges.findIndex((range) => at >= range.start && at < range.end)
    if (inside >= 0) {
        snipStore.select(inside)
        return snipStore.setBound('start', at, duration)
    }
    const next = draft.ranges.find((range) => range.start > at)
    const end = next ? next.start : duration > 0 ? duration : at + OPEN_SECTION_SECONDS
    if (end - at < MIN_SECTION_LENGTH) return null
    const range = { start: at, end: round1(end) }
    insertRange(range)
    return range
}

/** Close the open section at `at` and return it; the draft may have been re-seeded meanwhile. */
function closeSection(open: Pending, at: number, duration: number): SnipRange | null {
    const draft = get(snipStore)
    if (!draft) return null
    const index = draft.ranges.findIndex((range) => range.start === open.start && range.end > at)
    if (draft.mode === 'play' && index >= 0) {
        snipStore.select(index)
        return snipStore.setBound('end', at, duration)
    }
    const range = { start: open.start, end: at }
    insertRange(range)
    return range
}

export async function markSnip(): Promise<void> {
    const state = get(nowPlaying)
    const track_id = state.track_id
    const playhead = playback.current() ?? state.current
    if (!track_id || playhead == null) {
        toast.error('Nothing is playing to snip')
        return
    }
    const duration = state.duration ?? 0
    const at = round1(playhead)

    if (nextMark(pending, track_id, at) === 'end') {
        const open = pending!
        pending = null
        const section = closeSection(open, at, duration)
        const saved = section ? await saveSnipDraft() : null
        // A draft the shortcut made is let go once saved, so the engine follows
        // the saved snip and nothing stale can reach the next track.
        if (open.owns_draft) snipStore.reset()
        if (!saved || !section) {
            toast.error('Could not save the snip')
            return
        }
        const verb = saved.mode === 'skip' ? 'skips' : 'plays'
        toast.success(
            `Snip saved · ${verb} ${formatRulerTime(section.start)}–${formatRulerTime(section.end)}`
        )
        return
    }

    const owns_draft = !get(snipStore)
    if (owns_draft) snipStore.seed(state.snip, duration)
    const draft = get(snipStore)!
    let start = at
    if (draft.mode === 'play') {
        const section = openPlaySection(at, duration)
        if (!section) {
            if (owns_draft) snipStore.reset()
            toast.error('No room for a section here')
            return
        }
        start = section.start
    }
    pending = { track_id, start, owns_draft }
    toast(`Snip starts ${formatRulerTime(start)} · press again at the end`, { duration: 4000 })
}

/**
 * Forget an open mark when the track changes, and with it any draft the
 * shortcut made, which the engine would otherwise apply to the next track.
 * Returns the unsubscribe.
 */
export function watchMarks(): () => void {
    return nowPlaying.subscribe((state) => {
        if (!pending || pending.track_id === state.track_id) return
        if (pending.owns_draft) snipStore.reset()
        pending = null
    })
}
