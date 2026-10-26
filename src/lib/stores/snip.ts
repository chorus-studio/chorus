import { get, writable } from 'svelte/store'
import { round1 } from '$lib/utils/snip-time'
import {
    defaultSnip,
    migrateSnip,
    placeNewRange,
    MIN_SECTION_LENGTH,
    type Snip,
    type SnipMode,
    type SnipRange
} from '$lib/utils/snip-ranges'

export type Bound = 'start' | 'end'

/**
 * The snip editor's working copy: the snip being edited plus which section the
 * handles and inputs are on. While it exists the playback engine follows it
 * instead of the saved snip, so edits are heard as they are made.
 */
export type SnipDraft = Snip & {
    selected: number
    /** The bound moved last. When it is where playback jumps, the engine lets
     *  playback run a few seconds past it so the join can be heard. */
    last_updated: Bound | null
}

function createSnipStore() {
    const store = writable<SnipDraft | null>(null)
    const { subscribe, set, update } = store

    /**
     * Start editing from the saved snip, or from the whole track when there is
     * none. `keepSelection` holds on to the selected section when the same
     * track is re-seeded (after a save, or once its duration becomes known).
     */
    function seed(saved: Snip | null | undefined, duration: number, keepSelection = false) {
        const safe = migrateSnip(saved)
        const base = safe && safe.ranges.length > 0 ? safe : defaultSnip(duration)
        const current = get(store)
        const selected =
            keepSelection && current ? Math.min(current.selected, base.ranges.length - 1) : 0
        set({
            mode: base.mode,
            ranges: base.ranges.map((range) => ({ ...range })),
            selected: Math.max(0, selected),
            last_updated: null
        })
    }

    function reset() {
        set(null)
    }

    /**
     * Switch what the sections mean. A fresh draft (one section spanning the
     * whole track) switched to skip would mean "skip everything", so it
     * becomes a short cut at the playhead instead.
     */
    function setMode(mode: SnipMode, duration: number, playhead: number) {
        update((draft) => {
            if (!draft || draft.mode === mode) return draft
            const whole =
                draft.ranges.length === 1 &&
                draft.ranges[0].start <= 0 &&
                duration > 0 &&
                draft.ranges[0].end >= duration
            const ranges = whole
                ? [placeNewRange([], playhead, duration) ?? { ...draft.ranges[0] }]
                : draft.ranges
            return { ...draft, mode, ranges, selected: 0, last_updated: null }
        })
    }

    function select(index: number) {
        update((draft) =>
            draft && index >= 0 && index < draft.ranges.length
                ? { ...draft, selected: index, last_updated: null }
                : draft
        )
    }

    /**
     * Move one bound of the selected section. The bound stays inside the
     * neighbouring sections (or the track) and keeps the section at least
     * MIN_SECTION_LENGTH long; the other bound never moves. Returns the
     * section as it ended up.
     */
    function setBound(which: Bound, value: number, duration: number): SnipRange | null {
        let result: SnipRange | null = null
        update((draft) => {
            if (!draft) return draft
            const ranges = draft.ranges.map((range) => ({ ...range }))
            const range = ranges[draft.selected]
            if (!range) return draft
            const prev = ranges[draft.selected - 1]
            const next = ranges[draft.selected + 1]
            const min = prev ? prev.end : 0
            const max = next ? next.start : duration > 0 ? duration : Infinity

            if (which === 'start') {
                const hi = Math.max(min, round1(range.end - MIN_SECTION_LENGTH))
                range.start = round1(Math.min(Math.max(value, min), hi))
            } else {
                const lo = Math.min(max, round1(range.start + MIN_SECTION_LENGTH))
                range.end = round1(Math.max(Math.min(value, max), lo))
            }
            result = { ...range }
            return { ...draft, ranges, last_updated: which }
        })
        return result
    }

    /** Add a section at the playhead (see placeNewRange) and select it. */
    function addAt(playhead: number, duration: number): boolean {
        let added = false
        update((draft) => {
            if (!draft) return draft
            const range = placeNewRange(draft.ranges, playhead, duration)
            if (!range) return draft
            const ranges = [...draft.ranges, range].sort((a, b) => a.start - b.start)
            added = true
            return { ...draft, ranges, selected: ranges.indexOf(range), last_updated: null }
        })
        return added
    }

    /** Drop the selected section. The last one can't be removed — that is Delete. */
    function removeSelected() {
        update((draft) => {
            if (!draft || draft.ranges.length <= 1) return draft
            const ranges = draft.ranges.filter((_, i) => i !== draft.selected)
            return {
                ...draft,
                ranges,
                selected: Math.min(draft.selected, ranges.length - 1),
                last_updated: null
            }
        })
    }

    /** Forget the last-moved bound so the engine enforces every jump again. */
    function clearGrace() {
        update((draft) => (draft ? { ...draft, last_updated: null } : draft))
    }

    return {
        subscribe,
        set,
        update,
        reset,
        seed,
        setMode,
        select,
        setBound,
        addAt,
        removeSelected,
        clearGrace
    }
}

export const snipStore = createSnipStore()
