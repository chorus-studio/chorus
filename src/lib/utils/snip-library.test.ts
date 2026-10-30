import { describe, expect, it } from 'vitest'
import {
    describeRanges,
    parseSongId,
    rangesLength,
    snippedTracks,
    sortSnipped
} from './snip-library'
import type { SimpleTrack } from '$lib/stores/data/cache'

const track = (song_id: string, snipped_at?: number | null): SimpleTrack => ({
    song_id,
    track_id: song_id,
    snip: { mode: 'play', ranges: [{ start: 0, end: 10 }] },
    snipped_at
})

describe('sortSnipped', () => {
    it('puts the newest first and undated ones last, by title', () => {
        const sorted = sortSnipped([
            track('b undated'),
            track('old', 100),
            track('a undated', null),
            track('new', 200)
        ])
        expect(sorted.map((t) => t.song_id)).toEqual(['new', 'old', 'a undated', 'b undated'])
    })

    it('survives an entry without its title string', () => {
        const nameless = { ...track('x'), song_id: undefined as unknown as string }
        const sorted = sortSnipped([track('b'), nameless, track('a')])
        expect(sorted.map((t) => t.song_id)).toEqual([undefined, 'a', 'b'])
    })

    it('does not touch the input', () => {
        const input = [track('b', 1), track('a', 2)]
        sortSnipped(input)
        expect(input.map((t) => t.song_id)).toEqual(['b', 'a'])
    })
})

describe('snippedTracks', () => {
    it('keeps usable snips, brings old shapes up to date and drops the rest', () => {
        const legacy = {
            song_id: 'Old by Someone',
            track_id: 'old',
            snip: { start_time: 10, end_time: 20 } as unknown as SimpleTrack['snip']
        }
        const empty = { ...track('e'), snip: { mode: 'play', ranges: [] } as SimpleTrack['snip'] }
        const plain = { song_id: 'Plain by Someone', track_id: 'p' }
        const kept = snippedTracks([
            track('a', 5),
            legacy,
            empty,
            plain,
            null as unknown as SimpleTrack
        ])
        expect(kept.map((t) => t.track_id)).toEqual(['a', 'old'])
        expect(kept[1].snip).toEqual({ mode: 'play', ranges: [{ start: 10, end: 20 }] })
    })
})

describe('describeRanges', () => {
    it('writes whole-second ranges and counts the rest', () => {
        expect(describeRanges({ mode: 'play', ranges: [{ start: 42.4, end: 71 }] })).toBe(
            '0:42–1:11'
        )
        expect(
            describeRanges({
                mode: 'skip',
                ranges: [
                    { start: 0, end: 12 },
                    { start: 60, end: 75 },
                    { start: 120, end: 130 },
                    { start: 200, end: 210 },
                    { start: 300, end: 310 }
                ]
            })
        ).toBe('0:00–0:12 · 1:00–1:15 · 2:00–2:10 +2')
    })
})

describe('rangesLength', () => {
    it('sums the sections', () => {
        expect(
            rangesLength({
                mode: 'play',
                ranges: [
                    { start: 10, end: 40 },
                    { start: 60, end: 65 }
                ]
            })
        ).toBe(35)
    })
})

describe('parseSongId', () => {
    it('gives blanks for a missing string', () => {
        expect(parseSongId(undefined)).toEqual({ title: '', artists: '' })
        expect(parseSongId(null)).toEqual({ title: '', artists: '' })
    })

    it('splits title and artists on the first " by "', () => {
        expect(parseSongId('Stand by Me by Ben E. King')).toEqual({
            title: 'Stand',
            artists: 'Me, Ben E. King'
        })
        expect(parseSongId('Nakamarra by Hiatus Kaiyote')).toEqual({
            title: 'Nakamarra',
            artists: 'Hiatus Kaiyote'
        })
    })
})
