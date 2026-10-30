import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'

vi.mock('@wxt-dev/storage', () => ({
    storage: {
        getItem: vi.fn(async () => null),
        setItem: vi.fn(async () => {}),
        removeItem: vi.fn(async () => {}),
        watch: vi.fn(() => () => {})
    }
}))
vi.mock('svelte-sonner', () => ({
    toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
}))
vi.mock('$lib/stores/now-playing', async () => {
    const { writable } = await import('svelte/store')
    const store = writable<Record<string, unknown>>({})
    return { nowPlaying: { ...store, updateState: vi.fn(), setCurrentTime: vi.fn() } }
})
vi.mock('$lib/utils/playback', () => ({ playback: { current: vi.fn(() => null) } }))
vi.mock('$lib/utils/snip-save', async () => {
    const { get } = await import('svelte/store')
    const { snipStore } = await import('$lib/stores/snip')
    return {
        saveSnipDraft: vi.fn(async () => {
            const draft = get(snipStore)
            return draft ? { mode: draft.mode, ranges: draft.ranges.map((r) => ({ ...r })) } : null
        })
    }
})

import { toast } from 'svelte-sonner'
import { snipStore } from '$lib/stores/snip'
import { nowPlaying } from '$lib/stores/now-playing'
import { playback } from '$lib/utils/playback'
import { saveSnipDraft } from '$lib/utils/snip-save'
import { markSnip, nextMark, pendingMark, watchMarks } from './snip-mark'

const np = nowPlaying as unknown as {
    set: (v: Record<string, unknown>) => void
    update: (fn: (v: Record<string, unknown>) => Record<string, unknown>) => void
}
const current = playback.current as unknown as ReturnType<typeof vi.fn>

function playing(track_id: string, snip: unknown = null, duration = 200) {
    np.set({ track_id, id: `${track_id} by someone`, snip, duration, current: 0, cover: null })
}

async function press(at: number) {
    current.mockReturnValue(at)
    await markSnip()
}

beforeEach(() => {
    vi.clearAllMocks()
    snipStore.reset()
    playing('t1')
    // Drop any open mark from the previous test by "changing track" under the watcher.
    const stop = watchMarks()
    np.update((s) => ({ ...s, track_id: 'other' }))
    stop()
    playing('t1')
})

describe('nextMark', () => {
    it('is a start without an open mark, on another track, or too soon after the start', () => {
        expect(nextMark(null, 't1', 10)).toBe('start')
        expect(nextMark({ track_id: 't2', start: 5, owns_draft: true }, 't1', 10)).toBe('start')
        expect(nextMark({ track_id: 't1', start: 9.5, owns_draft: true }, 't1', 10)).toBe('start')
        expect(nextMark({ track_id: 't1', start: 5, owns_draft: true }, 't1', 10)).toBe('end')
    })
})

describe('markSnip', () => {
    it('refuses without a track', async () => {
        np.set({ track_id: '', duration: 0, current: 0 })
        await press(10)
        expect(toast.error).toHaveBeenCalledWith('Nothing is playing to snip')
        expect(get(snipStore)).toBeNull()
    })

    it('opens a play section to the end on a fresh track, then closes and saves it', async () => {
        await press(42.4)
        expect(get(snipStore)?.ranges).toEqual([{ start: 42.4, end: 200 }])
        expect(pendingMark()).toEqual({ track_id: 't1', start: 42.4, owns_draft: true })
        expect(toast).toHaveBeenCalledWith(
            'Snip starts 0:42 · press again at the end',
            expect.objectContaining({ duration: 4000 })
        )

        await press(71)
        expect(saveSnipDraft).toHaveBeenCalledTimes(1)
        expect(toast.success).toHaveBeenCalledWith('Snip saved · plays 0:42–1:11')
        expect(pendingMark()).toBeNull()
        // The shortcut made the draft, so it lets it go once saved.
        expect(get(snipStore)).toBeNull()
    })

    it('adds a section next to saved ones, running on to the next section until closed', async () => {
        playing('t1', { mode: 'play', ranges: [{ start: 120, end: 150 }] })
        await press(60)
        expect(get(snipStore)?.ranges).toEqual([
            { start: 60, end: 120 },
            { start: 120, end: 150 }
        ])
        await press(90)
        expect(get(snipStore)).toBeNull()
        const saved = await (saveSnipDraft as ReturnType<typeof vi.fn>).mock.results[0].value
        expect(saved.ranges).toEqual([
            { start: 60, end: 90 },
            { start: 120, end: 150 }
        ])
    })

    it('moves the start of the section playback is inside', async () => {
        playing('t1', { mode: 'play', ranges: [{ start: 30, end: 90 }] })
        await press(45)
        expect(get(snipStore)?.ranges).toEqual([{ start: 45, end: 90 }])
        await press(80)
        expect(toast.success).toHaveBeenCalledWith('Snip saved · plays 0:45–1:20')
    })

    it('in skip mode leaves the draft alone until the end press', async () => {
        playing('t1', { mode: 'skip', ranges: [{ start: 0, end: 10 }] })
        await press(50)
        expect(get(snipStore)?.ranges).toEqual([{ start: 0, end: 10 }])
        await press(65)
        expect(toast.success).toHaveBeenCalledWith('Snip saved · skips 0:50–1:05')
        const saved = await (saveSnipDraft as ReturnType<typeof vi.fn>).mock.results[0].value
        expect(saved.ranges).toEqual([
            { start: 0, end: 10 },
            { start: 50, end: 65 }
        ])
    })

    it('treats a press within a second of the start as a new start', async () => {
        await press(42)
        await press(42.5)
        expect(saveSnipDraft).not.toHaveBeenCalled()
        expect(pendingMark()?.start).toBe(42.5)
        expect(get(snipStore)?.ranges).toEqual([{ start: 42.5, end: 200 }])
    })

    it('keeps the editor’s own draft after saving', async () => {
        snipStore.seed(null, 200)
        await press(10)
        expect(pendingMark()?.owns_draft).toBe(false)
        await press(20)
        expect(get(snipStore)?.ranges).toEqual([{ start: 10, end: 20 }])
    })

    it('reports when the section cannot be saved', async () => {
        await press(10)
        ;(saveSnipDraft as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
        await press(20)
        expect(toast.error).toHaveBeenCalledWith('Could not save the snip')
        expect(pendingMark()).toBeNull()
    })

    it('runs the open section an hour when the length is unknown', async () => {
        playing('t1', null, 0)
        await press(30)
        expect(get(snipStore)?.ranges).toEqual([{ start: 30, end: 3630 }])
    })
})

describe('watchMarks', () => {
    it('drops the open mark and its draft when the track changes', async () => {
        const stop = watchMarks()
        await press(42)
        expect(get(snipStore)).not.toBeNull()
        playing('t2')
        expect(pendingMark()).toBeNull()
        expect(get(snipStore)).toBeNull()
        stop()
    })

    it('leaves a draft the editor owns', async () => {
        const stop = watchMarks()
        snipStore.seed(null, 200)
        await press(42)
        playing('t2')
        expect(pendingMark()).toBeNull()
        expect(get(snipStore)).not.toBeNull()
        stop()
    })
})
