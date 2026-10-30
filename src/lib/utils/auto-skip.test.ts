import { describe, expect, it } from 'vitest'
import { artistsOf, matchesBlockedArtist, skipReason } from './auto-skip'
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

describe('artistsOf / matchesBlockedArtist', () => {
    it('splits the player bar string and ignores case and spacing', () => {
        expect(artistsOf('M83, Zola Jesus ')).toEqual(['M83', 'Zola Jesus'])
        expect(artistsOf(null)).toEqual([])
        expect(matchesBlockedArtist(['m83'], 'M83, Zola Jesus')).toBe(true)
        expect(matchesBlockedArtist([' Zola Jesus '], 'M83, Zola Jesus')).toBe(true)
        expect(matchesBlockedArtist(['M8'], 'M83')).toBe(false)
        expect(matchesBlockedArtist(undefined, 'M83')).toBe(false)
    })
})

describe('skipReason', () => {
    it('skips a blocked artist even with auto-skip off', () => {
        expect(
            skipReason(rules({ enabled: false, artists: ['Drake'] }), {
                title: 'x',
                artist: 'Drake'
            })
        ).toBe('artist')
        expect(
            skipReason(rules({ enabled: false, title_keywords: ['x'] }), {
                title: 'x',
                artist: 'Drake'
            })
        ).toBeNull()
    })

    it('matches keywords on the title and on any artist', () => {
        expect(
            skipReason(rules({ title_keywords: ['remix'] }), { title: 'Song (Remix)', artist: 'A' })
        ).toBe('keyword')
        expect(
            skipReason(rules({ artist_keywords: ['dj'] }), {
                title: 'Song',
                artist: 'A, DJ Tiësto'
            })
        ).toBe('keyword')
        expect(
            skipReason(rules({ title_keywords: ['live'] }), { title: 'Alive', artist: 'A' })
        ).toBeNull()
        expect(
            skipReason(rules({ title_keywords: ['live'], match_whole_words: false }), {
                title: 'Alive',
                artist: 'A'
            })
        ).toBe('keyword')
        expect(
            skipReason(rules({ title_keywords: ['Live'], case_sensitive: true }), {
                title: 'live',
                artist: 'A'
            })
        ).toBeNull()
        expect(
            skipReason(rules({ title_keywords: ['song'], match_exact_words: true }), {
                title: 'Song',
                artist: 'A'
            })
        ).toBe('keyword')
        expect(
            skipReason(rules({ title_keywords: ['song'], match_exact_words: true }), {
                title: 'Song 2',
                artist: 'A'
            })
        ).toBeNull()
    })

    it('treats a keyword that is not a valid pattern literally', () => {
        expect(
            skipReason(rules({ title_keywords: ['(live'], match_whole_words: false }), {
                title: 'Song (live',
                artist: 'A'
            })
        ).toBe('keyword')
    })

    it('needs both a title and an artist for keyword rules', () => {
        expect(skipReason(rules({ title_keywords: ['x'] }), { title: 'x', artist: '' })).toBeNull()
    })

    it('skips short tracks once the length is known', () => {
        const r = rules({ min_seconds: 60 })
        expect(skipReason(r, { title: 'Skit', artist: 'A', duration: 42 })).toBe('short')
        expect(skipReason(r, { title: 'Skit', artist: 'A', duration: 60 })).toBeNull()
        expect(skipReason(r, { title: 'Skit', artist: 'A', duration: 0 })).toBeNull()
        expect(skipReason(r, { title: 'Skit', artist: 'A' })).toBeNull()
        expect(
            skipReason(rules({ min_seconds: 0 }), { title: 'Skit', artist: 'A', duration: 5 })
        ).toBeNull()
    })

    it('reports the strongest reason first', () => {
        expect(
            skipReason(rules({ artists: ['A'], title_keywords: ['skit'], min_seconds: 60 }), {
                title: 'Skit',
                artist: 'A',
                duration: 10
            })
        ).toBe('artist')
        expect(
            skipReason(rules({ title_keywords: ['skit'], min_seconds: 60 }), {
                title: 'Skit',
                artist: 'A',
                duration: 10
            })
        ).toBe('keyword')
    })
})
