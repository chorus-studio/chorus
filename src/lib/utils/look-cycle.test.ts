import { describe, expect, it } from 'vitest'
import { cycleLook } from './look-cycle'
import { BUILTIN_LOOKS } from '$lib/types/look'
import { THEME_NAMES } from './theming'

const options = { names: ['spotify', 'ocean', 'sky'] as const, looks: BUILTIN_LOOKS.slice(0, 2) }
const opts = { names: [...options.names], looks: options.looks }

describe('cycleLook', () => {
    it('walks palettes, then looks, and wraps both ways', () => {
        expect(cycleLook({ name: 'spotify', look: null }, 'next', opts)).toEqual({
            name: 'ocean',
            look: null
        })
        expect(cycleLook({ name: 'sky', look: null }, 'next', opts)).toEqual({
            name: 'sky',
            look: 'aurora'
        })
        expect(cycleLook({ name: 'sky', look: 'aurora' }, 'next', opts)).toEqual({
            name: 'sky',
            look: 'sunset'
        })
        expect(cycleLook({ name: 'sky', look: 'sunset' }, 'next', opts)).toEqual({
            name: 'spotify',
            look: null
        })
        expect(cycleLook({ name: 'spotify', look: null }, 'previous', opts)).toEqual({
            name: 'spotify',
            look: 'sunset'
        })
    })

    it('starts from the ends when the current choice is not in the list', () => {
        expect(cycleLook({ name: 'lava', look: null }, 'next', opts)).toEqual({
            name: 'spotify',
            look: null
        })
        expect(cycleLook({ name: 'lava', look: 'gone' }, 'previous', opts)).toEqual({
            name: 'lava',
            look: 'sunset'
        })
    })

    it('built-in look ids never collide with palette names', () => {
        for (const look of BUILTIN_LOOKS) expect(THEME_NAMES).not.toContain(look.id)
    })
})
