import { describe, expect, it } from 'vitest'
import { isReleasesRoute, releasesQuery, releasesRoute } from './releases-route'

describe('releases route', () => {
    it('matches its own hash, with or without a search', () => {
        expect(isReleasesRoute('#chorus/releases')).toBe(true)
        expect(isReleasesRoute('#chorus/releases?q=m83')).toBe(true)
        expect(isReleasesRoute('#chorus/releasesx')).toBe(false)
        expect(isReleasesRoute('')).toBe(false)
        expect(isReleasesRoute('#other')).toBe(false)
    })

    it('carries the search in the hash and reads it back', () => {
        expect(releasesRoute()).toBe('#chorus/releases')
        expect(releasesRoute('  ')).toBe('#chorus/releases')
        expect(releasesRoute('Thee Sacred Souls')).toBe('#chorus/releases?q=Thee%20Sacred%20Souls')
        expect(releasesQuery('#chorus/releases?q=Thee%20Sacred%20Souls')).toBe('Thee Sacred Souls')
        expect(releasesQuery('#chorus/releases')).toBe('')
        expect(releasesQuery('#elsewhere?q=x')).toBe('')
    })
})
