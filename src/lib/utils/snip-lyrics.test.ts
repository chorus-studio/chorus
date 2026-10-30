import { describe, expect, it } from 'vitest'
import { lineAt, lineSpan } from './snip-lyrics'

const lines = [
    { start: 12, text: '♪' },
    { start: 42.4, text: 'Waiting in a car' },
    { start: 55, text: 'Waiting for a ride' },
    { start: 71.2, text: 'In the dark' }
]

describe('lineSpan', () => {
    it('runs from the first line to the start of the one after the last', () => {
        expect(lineSpan(lines, 1, 2, 200)).toEqual({ start: 42.4, end: 71.2 })
        expect(lineSpan(lines, 2, 1, 200)).toEqual({ start: 42.4, end: 71.2 })
        expect(lineSpan(lines, 1, 1, 200)).toEqual({ start: 42.4, end: 55 })
    })

    it('ends at the track end after the last line, or a beat after it when the length is unknown', () => {
        expect(lineSpan(lines, 3, 3, 200)).toEqual({ start: 71.2, end: 200 })
        expect(lineSpan(lines, 3, 3, 0)).toEqual({ start: 71.2, end: 76.2 })
    })

    it('never makes a section shorter than the minimum or past the end', () => {
        const tight = [
            { start: 10, text: 'a' },
            { start: 10.3, text: 'b' }
        ]
        expect(lineSpan(tight, 0, 0, 10.5)).toBeNull()
        expect(lineSpan(tight, 0, 0, 200)).toEqual({ start: 10, end: 11 })
        expect(lineSpan(lines, 0, 9, 200)).toBeNull()
    })
})

describe('lineAt', () => {
    it('finds the last line that has started', () => {
        expect(lineAt(lines, 5)).toBe(-1)
        expect(lineAt(lines, 12)).toBe(0)
        expect(lineAt(lines, 60)).toBe(2)
        expect(lineAt(lines, 500)).toBe(3)
    })
})
