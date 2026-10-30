import { describe, expect, it } from 'vitest'
import {
    albumSummary,
    artistSummary,
    counts,
    countedAlbums,
    defaultFilters,
    isVariant,
    kindOf,
    lastHeard,
    migratePrefs,
    nextUnheard,
    recordPlay,
    releaseLabel,
    releaseTypeOf,
    resumeTarget,
    scopeOf,
    shouldRecord,
    sortedAlbums,
    sortedArtists,
    trackAlbum,
    trackArtist,
    untrackAlbum,
    untrackArtist,
    type DiscographyState,
    type Filters,
    type Listed
} from './discography'

const tracks = (n: number, prefix = 't') =>
    Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i + 1}`, name: `Track ${i + 1}` }))
const play = (album: string, track: string, extra: Partial<{ year: string; n: number }> = {}) => ({
    artist: { id: 'a1', name: 'M83' },
    album: {
        id: album,
        name: `Album ${album}`,
        year: extra.year ?? '2011',
        cover: null,
        tracks: tracks(extra.n ?? 3, album)
    },
    track: { id: track, name: `Track ${track}` }
})
const listed = (
    id: string,
    name: string,
    kind: Listed['kind'],
    total: number,
    year = '2020'
): Listed => ({ id, name, kind, total, year, cover: null })
const all: Filters = { albums: true, singles: true, compilations: true, hide_variants: false }

describe('recordPlay', () => {
    it('adds the artist and album on first sight, counts a track once, and keeps the place', () => {
        let state: DiscographyState = {}
        state = recordPlay(state, play('x', 'x1'), 100)
        state = recordPlay(state, play('x', 'x1'), 200)
        state = recordPlay(state, play('x', 'x2'), 300)
        const artist = state.a1
        expect(artist.name).toBe('M83')
        expect(artist.albums.x.heard).toEqual(['x1', 'x2'])
        expect(artist.last).toEqual({ album_id: 'x', track_id: 'x2', track_name: 'Track x2' })
        expect(artist.updated_at).toBe(300)
    })

    it('keeps the first track list and cover it learnt', () => {
        let state = recordPlay(
            {},
            { ...play('x', 'x1'), album: { ...play('x', 'x1').album, cover: 'c1' } },
            1
        )
        state = recordPlay(
            state,
            { ...play('x', 'x2'), album: { ...play('x', 'x2').album, tracks: [], cover: null } },
            2
        )
        expect(state.a1.albums.x.tracks).toHaveLength(3)
        expect(state.a1.albums.x.cover).toBe('c1')
    })

    it('keeps the kind, listed total and tracked flag of a release it already knows', () => {
        let state = trackArtist({}, { id: 'a1', name: 'M83' }, [listed('x', 'Album x', 'single', 3)], 1)
        state = recordPlay(state, play('x', 'x1'), 2)
        expect(state.a1.albums.x.kind).toBe('single')
        expect(state.a1.albums.x.total).toBe(3)
        expect(state.a1.tracked).toBe(true)
    })
})

describe('kinds and variants', () => {
    it('labels a release by its Spotify type, else by its kind', () => {
        expect(releaseLabel({ kind: 'single', type: 'EP' })).toBe('EP')
        expect(releaseLabel({ kind: 'single', type: 'SINGLE' })).toBe('Single')
        expect(releaseLabel({ kind: 'single' })).toBe('Single')
        expect(releaseLabel({ kind: 'compilation' })).toBe('Compilation')
        expect(releaseLabel({})).toBe('Album')
        expect(releaseTypeOf('ep')).toBe('EP')
        expect(releaseTypeOf('mixtape')).toBeUndefined()
    })

    it('folds Spotify release types into album, single and compilation', () => {
        expect(kindOf('ALBUM')).toBe('album')
        expect(kindOf('SINGLE')).toBe('single')
        expect(kindOf('EP')).toBe('single')
        expect(kindOf('COMPILATION')).toBe('compilation')
        expect(kindOf(undefined)).toBe('album')
    })

    it('spots variant editions by a qualifier, not by a word in the title', () => {
        for (const name of [
            'Rose in the Dark (Deluxe)',
            'Lux (Deluxe Edition)',
            'Mother (Live at Abbey Road)',
            'Covered (Bonus Track Version)',
            'Tyrone - Remix',
            'Sunshine (Remixes)',
            'Sunshine Remixes',
            'Motomami [Anniversary Edition]',
            'Heaven: Instrumentals'
        ])
            expect(isVariant(name), name).toBe(true)
        for (const name of ['Live Through This', 'Abbey Road (Remastered)', 'Deluxe', 'Gold', 'Edition of One'])
            expect(isVariant(name), name).toBe(false)
    })
})

describe('tracking', () => {
    it('lists a discography with real denominators and keeps what was heard', () => {
        let state = recordPlay({}, play('x', 'x1'), 1)
        state = trackArtist(
            state,
            { id: 'a1', name: 'M83' },
            [listed('x', 'Album x', 'album', 3), listed('y', 'Album y', 'album', 10, '2016')],
            5
        )
        expect(scopeOf(state.a1)).toBe('discography')
        expect(state.a1.listed_at).toBe(5)
        expect(state.a1.albums.x.heard).toEqual(['x1'])
        expect(state.a1.albums.x.tracks).toHaveLength(3)
        expect(albumSummary(state.a1.albums.y)).toEqual({ heard: 0, total: 10, done: false })
        expect(artistSummary(state.a1)).toEqual({
            albums: 2,
            albumsDone: 0,
            tracksHeard: 1,
            tracksTotal: 13,
            fraction: 1 / 13
        })
    })

    it('counts singles and compilations only when asked, and hides variants on request', () => {
        const state = trackArtist(
            {},
            { id: 'a1', name: 'M83' },
            [
                listed('alb', 'Hurry Up', 'album', 12, '2012'),
                listed('ep', 'Digital Shades', 'single', 6, '2008'),
                listed('comp', 'Best Of', 'compilation', 20, '2015'),
                listed('dlx', 'Hurry Up (Deluxe)', 'album', 16, '2013')
            ],
            1
        )
        const a = state.a1
        // newest first, under each set of filters
        expect(countedAlbums(a, defaultFilters).map((x) => x.id)).toEqual(['dlx', 'alb'])
        expect(countedAlbums(a, { ...defaultFilters, singles: true }).map((x) => x.id)).toEqual([
            'dlx',
            'alb',
            'ep'
        ])
        expect(countedAlbums(a, all).map((x) => x.id)).toEqual(['comp', 'dlx', 'alb', 'ep'])
        expect(countedAlbums(a, { ...all, hide_variants: true }).map((x) => x.id)).toEqual([
            'comp',
            'alb',
            'ep'
        ])
        expect(artistSummary(a, { ...defaultFilters, hide_variants: true }).tracksTotal).toBe(12)
    })

    it('tracks one album on its own and drops it, and the artist, when untracked', () => {
        let state = trackAlbum(
            {},
            { id: 'a1', name: 'M83' },
            { id: 'x', name: 'Album x', year: '2011', cover: null, total: 3 },
            1
        )
        expect(scopeOf(state.a1)).toBe('albums')
        expect(state.a1.albums.x.tracked).toBe(true)
        // a play from another album under auto-track is stored but not counted
        state = recordPlay(state, play('y', 'y1'), 2)
        expect(counts(state.a1.albums.y, state.a1, all)).toBe(false)
        expect(artistSummary(state.a1, all).albums).toBe(1)
        state = untrackAlbum(state, 'a1', 'x')
        expect(scopeOf(state.a1)).toBe('heard')
        expect(state.a1.albums.y).toBeDefined()
        state = untrackAlbum(state, 'a1', 'y')
        expect(state.a1).toBeUndefined()
    })

    it('unpins a release under a tracked discography instead of dropping it', () => {
        let state = trackArtist({}, { id: 'a1', name: 'M83' }, [listed('x', 'Album x', 'album', 3)], 1)
        state = trackAlbum(state, { id: 'a1', name: 'M83' }, { id: 'x', name: 'Album x', year: null, cover: null }, 2)
        expect(state.a1.albums.x.tracked).toBe(true)
        state = untrackAlbum(state, 'a1', 'x')
        expect(state.a1.albums.x.tracked).toBeUndefined()
        expect(state.a1.tracked).toBe(true)
        expect(untrackArtist(state, 'a1')).toEqual({})
    })

    it('records plays for tracked discographies and albums, or for everyone under auto-track', () => {
        const off = { auto_track: false }
        let state: DiscographyState = {}
        expect(shouldRecord(state, off, 'a1', 'x')).toBe(false)
        expect(shouldRecord(state, { auto_track: true }, 'a1', 'x')).toBe(true)
        state = trackAlbum(state, { id: 'a1', name: 'M83' }, { id: 'x', name: 'x', year: null, cover: null }, 1)
        expect(shouldRecord(state, off, 'a1', 'x')).toBe(true)
        expect(shouldRecord(state, off, 'a1', 'y')).toBe(false)
        state = trackArtist(state, { id: 'a1', name: 'M83' }, [], 2)
        expect(shouldRecord(state, off, 'a1', 'y')).toBe(true)
    })
})

describe('summaries', () => {
    it('counts heard tracks against the album and the artist', () => {
        let state = recordPlay({}, play('x', 'x1'), 1)
        state = recordPlay(state, play('x', 'x2'), 2)
        state = recordPlay(state, play('x', 'x3'), 3)
        state = recordPlay(state, play('y', 'y1', { n: 4 }), 4)
        expect(albumSummary(state.a1.albums.x)).toEqual({ heard: 3, total: 3, done: true })
        expect(albumSummary(state.a1.albums.y)).toEqual({ heard: 1, total: 4, done: false })
        expect(artistSummary(state.a1)).toEqual({
            albums: 2,
            albumsDone: 1,
            tracksHeard: 4,
            tracksTotal: 7,
            fraction: 4 / 7
        })
    })

    it('ignores heard ids that are not on the known list', () => {
        const album = { ...play('x', 'x1').album, heard: ['x1', 'ghost'], updated_at: 0 }
        expect(albumSummary(album)).toEqual({ heard: 1, total: 3, done: false })
    })

    it('uses the listed count until the track list is known, and caps heard at it', () => {
        const album = { id: 'x', name: 'x', tracks: [], total: 2, heard: ['a', 'b', 'c'], updated_at: 0 }
        expect(albumSummary(album)).toEqual({ heard: 2, total: 2, done: true })
    })
})

describe('resumeTarget / ordering', () => {
    it('picks up at the last track while its album is unfinished, else the next unfinished album', () => {
        let state = recordPlay({}, play('x', 'x2'), 1)
        expect(resumeTarget(state.a1)).toEqual({ album_id: 'x', track_id: 'x2' })
        state = recordPlay(state, play('x', 'x1'), 2)
        state = recordPlay(state, play('x', 'x3'), 3)
        state = recordPlay(state, play('y', 'y1', { year: '2008' }), 4)
        state = recordPlay(state, play('y', 'y2', { year: '2008' }), 5)
        state = recordPlay(state, play('y', 'y3', { year: '2008' }), 6)
        state = recordPlay(state, play('z', 'z1', { year: '2016' }), 0.5)
        // last heard (y) is done; z (unfinished) comes next
        state = {
            ...state,
            a1: { ...state.a1, last: { album_id: 'y', track_id: 'y3', track_name: 'Track y3' } }
        }
        expect(resumeTarget(state.a1)).toEqual({ album_id: 'z', track_id: 'z2' })
        expect(nextUnheard(state.a1.albums.z)?.id).toBe('z2')
        expect(sortedAlbums(state.a1).map((a) => a.id)).toEqual(['z', 'x', 'y'])
    })

    it('starts a listed album from the top when its track list is not known yet', () => {
        const state = trackArtist(
            {},
            { id: 'a1', name: 'M83' },
            [listed('x', 'Album x', 'album', 12, '2011'), listed('y', 'Album y', 'album', 10, '2008')],
            1
        )
        expect(resumeTarget(state.a1)).toEqual({ album_id: 'x', track_id: null })
    })

    it('skips albums the filters hide, for the resume target and the last-heard line', () => {
        let state = trackArtist(
            {},
            { id: 'a1', name: 'M83' },
            [listed('ep', 'Digital Shades', 'single', 3, '2019'), listed('alb', 'Hurry Up', 'album', 3, '2011')],
            1
        )
        state = recordPlay(state, { ...play('ep', 'ep1'), album: { ...play('ep', 'ep1').album, name: 'Digital Shades' } }, 2)
        expect(lastHeard(state.a1, defaultFilters)).toBeNull()
        expect(lastHeard(state.a1, all)).toEqual({ track_name: 'Track ep1', album_name: 'Digital Shades' })
        expect(resumeTarget(state.a1, defaultFilters)).toEqual({ album_id: 'alb', track_id: null })
        expect(resumeTarget(state.a1, all)).toEqual({ album_id: 'ep', track_id: 'ep1' })
    })

    it('is null when everything is heard, and orders artists by recency', () => {
        let state = recordPlay({}, play('x', 'x1', { n: 1 }), 1)
        expect(resumeTarget(state.a1)).toBeNull()
        state = { ...state, b2: { id: 'b2', name: 'Other', albums: {}, last: null, updated_at: 9 } }
        expect(sortedArtists(state).map((a) => a.id)).toEqual(['b2', 'a1'])
    })
})

describe('migratePrefs', () => {
    it('fills missing and malformed fields from the defaults', () => {
        expect(migratePrefs(undefined)).toEqual({
            filters: { albums: true, singles: false, compilations: false, hide_variants: false },
            auto_track: false
        })
        expect(migratePrefs({ filters: { singles: true, albums: 'yes' }, auto_track: true })).toEqual({
            filters: { albums: true, singles: true, compilations: false, hide_variants: false },
            auto_track: true
        })
    })
})
