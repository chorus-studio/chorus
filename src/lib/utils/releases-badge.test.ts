import { describe, expect, it } from 'vitest'
import { badgeText, unseenReleases } from './releases-badge'

describe('unseenReleases', () => {
    it('counts what arrived since the view was last opened, never below zero', () => {
        expect(unseenReleases({ music_count: 5, shows_count: 2, seen_count: 4 })).toBe(3)
        expect(unseenReleases({ music_count: 5, shows_count: 2 })).toBe(7)
        expect(unseenReleases({ music_count: 1, shows_count: 0, seen_count: 4 })).toBe(0)
        expect(unseenReleases(null)).toBe(0)
    })
})

describe('badgeText', () => {
    it('is blank at zero and caps at 99+', () => {
        expect(badgeText(0)).toBe('')
        expect(badgeText(-1)).toBe('')
        expect(badgeText(7)).toBe('7')
        expect(badgeText(99)).toBe('99')
        expect(badgeText(150)).toBe('99+')
    })
})
