import { describe, expect, it } from 'vitest'
import {
    albumSummary,
    artistSummary,
    nextUnheard,
    recordPlay,
    resumeTarget,
    sortedAlbums,
    sortedArtists,
    type DiscographyState
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

    it('is null when everything is heard, and orders artists by recency', () => {
        let state = recordPlay({}, play('x', 'x1', { n: 1 }), 1)
        expect(resumeTarget(state.a1)).toBeNull()
        state = { ...state, b2: { id: 'b2', name: 'Other', albums: {}, last: null, updated_at: 9 } }
        expect(sortedArtists(state).map((a) => a.id)).toEqual(['b2', 'a1'])
    })
})
