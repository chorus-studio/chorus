import { describe, expect, it } from 'vitest'
import { THEME_HASH, isThemeRoute } from './theme-route'

describe('theme route', () => {
    it('matches its own hash, with or without a query', () => {
        expect(THEME_HASH).toBe('#chorus/theme')
        expect(isThemeRoute('#chorus/theme')).toBe(true)
        expect(isThemeRoute('#chorus/theme?edit=abc')).toBe(true)
        expect(isThemeRoute('#chorus/themes')).toBe(false)
        expect(isThemeRoute('#chorus/releases')).toBe(false)
        expect(isThemeRoute('')).toBe(false)
    })
})
