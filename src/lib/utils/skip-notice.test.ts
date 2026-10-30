import { beforeEach, describe, expect, it, vi } from 'vitest'

const { toast, rulesRef, updateTrack, playRelease } = vi.hoisted(() => ({
    toast: Object.assign(vi.fn(), { error: vi.fn() }),
    rulesRef: { current: {} as Record<string, unknown> },
    updateTrack: vi.fn(async () => {}),
    playRelease: vi.fn(async () => {})
}))
vi.mock('svelte-sonner', () => ({ toast }))
vi.mock('$lib/stores/config', () => ({
    configStore: {
        subscribe: (run: (v: unknown) => void) => {
            run({ auto_skip: rulesRef.current })
            return () => {}
        }
    }
}))
vi.mock('$lib/stores/data', () => ({
    dataStore: { updateTrack: (...a: unknown[]) => updateTrack(...(a as [])) }
}))
vi.mock('$lib/api/services/player', () => ({ getPlayerService: () => ({ playRelease }) }))

import {
    ANNOUNCE_AGAIN_AFTER_MS,
    allowOnce,
    announceSkip,
    describeSkip,
    isAllowedOnce,
    noteTrackStarted
} from './skip-notice'
import type { AutoSkip } from '$lib/stores/config'

const rules = (over: Partial<AutoSkip> = {}): AutoSkip => ({
    enabled: true,
    title_keywords: [],
    artist_keywords: [],
    case_sensitive: false,
    match_whole_words: true,
    match_exact_words: false,
    artists: [],
    min_seconds: 0,
    ...over
})

describe('describeSkip', () => {
    it('names the block, the artist, the keyword or the length', () => {
        expect(describeSkip({ blocked: true, title: 'x', artist: 'A' }, rules())).toBe('blocked')
        expect(
            describeSkip(
                { title: 'x', artist: 'M83, Zola Jesus' },
                rules({ artists: ['zola jesus'] })
            )
        ).toBe('blocked artist Zola Jesus')
        expect(
            describeSkip(
                { title: 'Song (Remix)', artist: 'A' },
                rules({ title_keywords: ['live', 'remix'] })
            )
        ).toBe('matches “remix”')
        expect(
            describeSkip({ title: 'Song', artist: 'DJ Tiësto' }, rules({ artist_keywords: ['dj'] }))
        ).toBe('matches “dj”')
        expect(
            describeSkip({ title: 'Skit', artist: 'A', duration: 20 }, rules({ min_seconds: 60 }))
        ).toBe('shorter than 60 s')
        expect(describeSkip({ title: 'Song', artist: 'A', duration: 200 }, rules())).toBeNull()
    })
})

describe('announceSkip', () => {
    beforeEach(() => {
        toast.mockClear()
        updateTrack.mockClear()
        playRelease.mockClear()
        rulesRef.current = rules({ title_keywords: ['remix'] })
        vi.stubGlobal('document', { dispatchEvent: vi.fn() })
    })

    it('toasts once per track with the reason and a Play anyway action', () => {
        const track = { track_id: 't1', title: 'Song (Remix)', artist: 'A' }
        expect(announceSkip(track, 1000)).toBe(true)
        expect(announceSkip(track, 2000)).toBe(false)
        expect(announceSkip(track, 1000 + ANNOUNCE_AGAIN_AFTER_MS)).toBe(true)
        expect(toast).toHaveBeenCalledTimes(2)
        const [message, options] = toast.mock.calls[0] as [string, any]
        expect(message).toBe('Skipped Song (Remix)')
        expect(options.description).toBe('A · matches “remix”')
        expect(options.action.label).toBe('Play anyway')
    })

    it('Play anyway allows the track once and starts it', async () => {
        announceSkip({ track_id: 't2', title: 'Song (Remix)', artist: 'A' }, 50_000)
        const options = (toast.mock.calls.at(-1) as [string, any])[1]
        await options.action.onClick()
        expect(isAllowedOnce('t2')).toBe(true)
        expect(updateTrack).not.toHaveBeenCalled()
        expect(playRelease).toHaveBeenCalledWith('spotify:track:t2')
        noteTrackStarted('t2')
        expect(isAllowedOnce('t2')).toBe(true)
        noteTrackStarted('t3')
        expect(isAllowedOnce('t2')).toBe(false)
    })

    it('Unblock & play lifts the block first', async () => {
        announceSkip({ track_id: 't4', title: 'Song', artist: 'A', blocked: true }, 90_000)
        const options = (toast.mock.calls.at(-1) as [string, any])[1]
        expect(options.description).toBe('A · blocked')
        expect(options.action.label).toBe('Unblock & play')
        await options.action.onClick()
        expect(updateTrack).toHaveBeenCalledWith({
            track_id: 't4',
            value: { blocked: null, blocked_at: null }
        })
        expect(playRelease).toHaveBeenCalledWith('spotify:track:t4')
    })

    it('offers no action without a track id', () => {
        announceSkip({ title: 'Nameless', artist: 'A' }, 130_000)
        const options = (toast.mock.calls.at(-1) as [string, any])[1]
        expect(options.action).toBeUndefined()
        allowOnce('x')
        expect(isAllowedOnce(null)).toBe(false)
    })
})
