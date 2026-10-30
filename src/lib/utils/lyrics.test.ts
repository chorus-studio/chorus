import { describe, expect, it, vi } from 'vitest'

vi.mock('@wxt-dev/storage', () => ({
    storage: {
        getItem: vi.fn(async () => null),
        getItems: vi.fn(async () => []),
        setItem: vi.fn(async () => {}),
        watch: vi.fn(() => () => {})
    }
}))

import { parseLyrics } from './lyrics'

describe('parseLyrics', () => {
    it('reads synced lines into seconds, sorted, blanks dropped', () => {
        const lyrics = parseLyrics({
            lyrics: {
                syncType: 'LINE_SYNCED',
                lines: [
                    { startTimeMs: '42400', words: 'Waiting in a car', endTimeMs: '0' },
                    { startTimeMs: '12000', words: '  ♪  ' },
                    { startTimeMs: '71000', words: '' },
                    { startTimeMs: 'nope', words: 'broken' },
                    null,
                    { startTimeMs: '55010', words: 'Waiting for a ride in the dark' }
                ]
            }
        })
        expect(lyrics).toEqual({
            synced: true,
            lines: [
                { start: 12, text: '♪' },
                { start: 42.4, text: 'Waiting in a car' },
                { start: 55, text: 'Waiting for a ride in the dark' }
            ]
        })
    })

    it('marks unsynced lyrics, whose lines all start at 0', () => {
        const lyrics = parseLyrics({
            lyrics: {
                syncType: 'UNSYNCED',
                lines: [
                    { startTimeMs: '0', words: 'a' },
                    { startTimeMs: '0', words: 'b' }
                ]
            }
        })
        expect(lyrics?.synced).toBe(false)
        expect(lyrics?.lines).toHaveLength(2)
    })

    it('is null for no lyrics, an error body or an empty list', () => {
        expect(parseLyrics(null)).toBeNull()
        expect(parseLyrics({ error: { status: 404 } })).toBeNull()
        expect(parseLyrics({ lyrics: { syncType: 'LINE_SYNCED', lines: [] } })).toBeNull()
    })
})
