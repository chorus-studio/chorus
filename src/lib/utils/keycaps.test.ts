import { describe, expect, it } from 'vitest'
import { shortcutKeys } from './keycaps'

describe('shortcutKeys', () => {
    it('splits a plus-joined combo', () => {
        expect(shortcutKeys('Alt+Shift+1')).toEqual(['Alt', 'Shift', '1'])
        expect(shortcutKeys('Ctrl+Shift+Left')).toEqual(['Ctrl', 'Shift', 'Left'])
    })

    it('splits a macOS glyph run into modifiers and the key', () => {
        expect(shortcutKeys('⇧⌘P')).toEqual(['⇧', '⌘', 'P'])
        expect(shortcutKeys('⌥⇧1')).toEqual(['⌥', '⇧', '1'])
        expect(shortcutKeys('⌘←')).toEqual(['⌘', '←'])
    })

    it('keeps a lone or multi-letter key whole', () => {
        expect(shortcutKeys('MediaPlayPause')).toEqual(['MediaPlayPause'])
        expect(shortcutKeys('')).toEqual([])
    })
})
