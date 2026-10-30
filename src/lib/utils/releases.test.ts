import { describe, expect, it } from 'vitest'
import {
    DAY,
    dayLabel,
    daysAgo,
    defaultReleasesState,
    dismissedOnHand,
    groupReleases,
    isStale,
    keepSince,
    lastSynced,
    mapPool,
    migrateReleasesState,
    pruneStamped,
    releaseAge,
    releaseMeta,
    releaseTime,
    scopeCounts,
    spotifyPath,
    startOfDay,
    typeLabel,
    visibleReleases,
    withinRange,
    type Release,
    type ReleasesState
} from './releases'

// A Friday afternoon, local time.
const NOW = new Date(2026, 9, 30, 15, 0).getTime()
const today = startOfDay(NOW)
const ago = (days: number) => today - days * DAY

function release(overrides: Partial<Release> & { title: string }): Release {
    const slug = overrides.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    return {
        uri: `spotify:album:${slug}`,
        id: slug,
        type: 'ALBUM',
        artist: { uri: 'spotify:artist:a1', name: 'Hiatus Kaiyote' },
        cover: null,
        time: today,
        ...overrides
    }
}

const episode = (title: string, time: number): Release =>
    release({
        title,
        uri: `spotify:episode:${title.toLowerCase()}`,
        type: 'EPISODE',
        artist: { uri: 'spotify:show:s1', name: 'Song Exploder' },
        time,
        durationMs: 24 * 60_000
    })

function state(overrides: Partial<ReleasesState> = {}): ReleasesState {
    return { ...defaultReleasesState, ...overrides }
}

describe('releaseTime', () => {
    it('reads a dated release in the local zone and an episode at its moment', () => {
        expect(releaseTime('2026-10-30T00:00:00Z')).toBe(new Date(2026, 9, 30).getTime())
        expect(releaseTime('2026-10-30T00:00:00.000Z')).toBe(new Date(2026, 9, 30).getTime())
        expect(releaseTime('2026-10-30T13:05:00Z')).toBe(Date.parse('2026-10-30T13:05:00Z'))
        expect(releaseTime('')).toBeNull()
        expect(releaseTime('not a date')).toBeNull()
        expect(releaseTime(undefined)).toBeNull()
    })
})

describe('ranges', () => {
    it('counts calendar days, so yesterday evening is one day ago', () => {
        expect(daysAgo(NOW, NOW)).toBe(0)
        expect(daysAgo(ago(1) + 22 * 60 * 60 * 1000, NOW)).toBe(1)
        expect(daysAgo(ago(7), NOW)).toBe(7)
    })

    it('cuts each range at its day count, today included', () => {
        expect(withinRange(today, 'today', NOW)).toBe(true)
        expect(withinRange(ago(1), 'today', NOW)).toBe(false)
        expect(withinRange(ago(1), 'yesterday', NOW)).toBe(true)
        expect(withinRange(ago(2), 'yesterday', NOW)).toBe(false)
        expect(withinRange(ago(6), 'week', NOW)).toBe(true)
        expect(withinRange(ago(7), 'week', NOW)).toBe(false)
        expect(withinRange(ago(29), 'month', NOW)).toBe(true)
        expect(withinRange(ago(30), 'month', NOW)).toBe(false)
    })

    it('keeps a sync window that matches the month range', () => {
        expect(withinRange(keepSince(NOW), 'month', NOW)).toBe(true)
        expect(withinRange(keepSince(NOW) - DAY, 'month', NOW)).toBe(false)
    })
})

describe('visibleReleases', () => {
    const music = [
        release({ title: 'Older', time: ago(10) }),
        release({ title: 'Single', type: 'SINGLE', time: ago(1) }),
        release({ title: 'Anthology', type: 'COMPILATION', time: ago(2) }),
        release({ title: 'New', time: today }),
        release({ title: 'Also new', time: today })
    ]
    const shows = [episode('Pod', NOW - 60_000)]

    it('follows the scope', () => {
        const titles = (s: ReleasesState) => visibleReleases(s, { now: NOW }).map((r) => r.title)
        expect(titles(state({ music, shows, scope: 'music' }))).toEqual([
            'Also new',
            'New',
            'Single',
            'Anthology'
        ])
        expect(titles(state({ music, shows, scope: 'podcasts' }))).toEqual(['Pod'])
        expect(titles(state({ music, shows, scope: 'all' }))).toEqual([
            'Pod',
            'Also new',
            'New',
            'Single',
            'Anthology'
        ])
    })

    it('cuts to the range and the kinds kept, drops the dismissed, and searches', () => {
        const base = state({ music, shows, scope: 'music' })
        const titles = (s: ReleasesState, query = '') =>
            visibleReleases(s, { now: NOW, query }).map((r) => r.title)
        expect(titles({ ...base, range: 'month' })).toContain('Older')
        expect(titles({ ...base, range: 'today' })).toEqual(['Also new', 'New'])
        expect(
            titles({ ...base, filters: { albums: true, singles: false, compilations: false } })
        ).toEqual(['Also new', 'New'])
        expect(
            titles({
                ...base,
                dismissed: [{ uri: 'spotify:album:new', created_at: new Date(NOW).toISOString() }]
            })
        ).not.toContain('New')
        expect(titles(base, 'anth')).toEqual(['Anthology'])
        expect(titles(base, 'hiatus')).toHaveLength(4)
    })

    it('counts the dismissed that are on hand, in range and of a kept kind', () => {
        const dismissed = [
            { uri: 'spotify:album:older', created_at: new Date(NOW).toISOString() },
            { uri: 'spotify:album:single', created_at: new Date(NOW).toISOString() },
            { uri: 'spotify:album:gone', created_at: new Date(NOW).toISOString() }
        ]
        expect(dismissedOnHand(state({ music, dismissed }), NOW)).toBe(1)
        expect(dismissedOnHand(state({ music, dismissed, range: 'month' }), NOW)).toBe(2)
    })

    it('counts per list for the badge, zero for a list outside the scope', () => {
        const s = state({ music, shows, scope: 'music' })
        expect(scopeCounts(s, NOW)).toEqual({ music_count: 4, shows_count: 0 })
        expect(scopeCounts({ ...s, scope: 'all' }, NOW)).toEqual({ music_count: 4, shows_count: 1 })
        expect(scopeCounts({ ...s, scope: 'podcasts' }, NOW)).toEqual({
            music_count: 0,
            shows_count: 1
        })
    })
})

describe('groupReleases', () => {
    const items = [
        release({ title: 'B side', type: 'SINGLE', time: ago(1) }),
        release({ title: 'A side', time: today }),
        release({
            title: 'Zed',
            time: ago(3),
            artist: { uri: 'spotify:artist:z', name: 'zz top' }
        }),
        release({ title: 'Old', type: 'COMPILATION', time: ago(40) }),
        episode('Pod', ago(1) + 3 * 60 * 60 * 1000)
    ]

    it('labels days as Today, Yesterday, a weekday, then a short date', () => {
        expect(dayLabel(today, NOW)).toBe('Today')
        expect(dayLabel(ago(1), NOW)).toBe('Yesterday')
        expect(dayLabel(ago(3), NOW)).toBe('Tuesday')
        expect(dayLabel(ago(8), NOW)).toBe('Thu, Oct 22')
        expect(dayLabel(ago(400), NOW)).toBe('Thu, Sep 25, 2025')
    })

    it('groups by day, newest first, with the items newest first inside', () => {
        const groups = groupReleases(items, 'date', NOW)
        expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday', 'Tuesday', 'Sun, Sep 20'])
        expect(groups[1].items.map((r) => r.title)).toEqual(['Pod', 'B side'])
    })

    it('groups by artist alphabetically and by type in a fixed order', () => {
        expect(groupReleases(items, 'artist', NOW).map((g) => g.label)).toEqual([
            'Hiatus Kaiyote',
            'Song Exploder',
            'zz top'
        ])
        expect(groupReleases(items, 'type', NOW).map((g) => g.label)).toEqual([
            'Albums',
            'Singles & EPs',
            'Compilations',
            'Episodes'
        ])
    })
})

describe('sync bookkeeping', () => {
    it('is stale without a stamp or after six hours', () => {
        expect(isStale(null, NOW)).toBe(true)
        expect(isStale('garbage', NOW)).toBe(true)
        expect(isStale(new Date(NOW - 5 * 60 * 60 * 1000).toISOString(), NOW)).toBe(false)
        expect(isStale(new Date(NOW - 7 * 60 * 60 * 1000).toISOString(), NOW)).toBe(true)
    })

    it("reports the scope's last sync, the older one for All", () => {
        const music = new Date(NOW - 1000).toISOString()
        const shows = new Date(NOW - 5000).toISOString()
        expect(lastSynced(state({ scope: 'music', music_updated_at: music }))).toBe(NOW - 1000)
        expect(lastSynced(state({ scope: 'podcasts', music_updated_at: music }))).toBeNull()
        expect(
            lastSynced(state({ scope: 'all', music_updated_at: music, shows_updated_at: shows }))
        ).toBe(NOW - 5000)
        expect(lastSynced(state({ scope: 'all', music_updated_at: music }))).toBeNull()
    })

    it('drops stamps older than the sync window', () => {
        const fresh = { uri: 'a', created_at: new Date(NOW - DAY).toISOString() }
        const old = { uri: 'b', created_at: new Date(NOW - 31 * DAY).toISOString() }
        expect(pruneStamped([fresh, old, { uri: 'c', created_at: 'x' }], NOW)).toEqual([fresh])
    })
})

describe('migrateReleasesState', () => {
    it('carries settings, dismissals and saves over from the pre-dialog shape, dropping its lists', () => {
        const migrated = migrateReleasesState({
            release_type: 'shows&podcasts',
            range: 'month',
            group_by: 'artist',
            filters: { albums: false, singles: true, compilations: true },
            music_data: [{ uri: 'spotify:album:x', imageUrl: 'u', type: 'ALBUM' }],
            music_releases: {},
            music_updated_at: '2026-10-01T00:00:00Z',
            dismissed: [{ uri: 'spotify:album:x', created_at: '2026-10-29T00:00:00Z' }],
            library: [{ uri: 'spotify:album:y', created_at: '2026-10-29T00:00:00Z' }],
            music_count: 3,
            shows_count: 1,
            seen_count: 4,
            release_id: null
        })
        expect(migrated.scope).toBe('podcasts')
        expect(migrated.range).toBe('month')
        expect(migrated.group_by).toBe('artist')
        expect(migrated.filters.albums).toBe(false)
        expect(migrated.music).toEqual([])
        expect(migrated.music_updated_at).toBeNull()
        expect(migrated.dismissed).toHaveLength(1)
        expect(migrated.library).toHaveLength(1)
        expect(migrated.seen_count).toBe(4)
    })

    it('keeps the current shape and falls back to defaults on garbage', () => {
        const current = state({
            scope: 'all',
            music: [release({ title: 'Kept' })],
            music_updated_at: '2026-10-30T10:00:00Z'
        })
        expect(migrateReleasesState(current)).toEqual(current)
        expect(migrateReleasesState(null)).toEqual(defaultReleasesState)
        expect(migrateReleasesState({ scope: 'nope', range: 7, music: 'x' })).toEqual(
            defaultReleasesState
        )
    })
})

describe('releaseAge', () => {
    it('counts days for a dated release and hours for an episode', () => {
        expect(releaseAge(release({ title: 'x', time: today }), NOW)).toBe('today')
        expect(releaseAge(release({ title: 'x', time: ago(1) }), NOW)).toBe('1d ago')
        expect(releaseAge(release({ title: 'x', time: ago(6) }), NOW)).toBe('6d ago')
        expect(releaseAge(release({ title: 'x', time: ago(13) }), NOW)).toBe('1w ago')
        expect(releaseAge(release({ title: 'x', time: ago(45) }), NOW)).toBe('1mo ago')
        expect(releaseAge(episode('p', NOW - 3 * 60 * 60 * 1000), NOW)).toBe('3h ago')
    })
})

describe('labels', () => {
    it('describes a release briefly', () => {
        expect(typeLabel('ALBUM')).toBe('Album')
        expect(typeLabel('EP')).toBe('EP')
        expect(typeLabel('COMPILATION')).toBe('Compilation')
        expect(releaseMeta(release({ title: 'x', trackCount: 1 }))).toBe('1 track')
        expect(releaseMeta(release({ title: 'x', trackCount: 12 }))).toBe('12 tracks')
        expect(releaseMeta(release({ title: 'x' }))).toBe('')
        expect(releaseMeta(episode('p', NOW))).toBe('24 min')
        expect(spotifyPath('spotify:episode:abc')).toBe('/episode/abc')
    })
})

describe('mapPool', () => {
    it('keeps the order and never runs more than the limit at once', async () => {
        let running = 0
        let peak = 0
        const result = await mapPool([30, 10, 20, 5, 15], 2, async (ms) => {
            running++
            peak = Math.max(peak, running)
            await new Promise((resolve) => setTimeout(resolve, ms))
            running--
            return ms * 2
        })
        expect(result).toEqual([60, 20, 40, 10, 30])
        expect(peak).toBe(2)
    })
})
