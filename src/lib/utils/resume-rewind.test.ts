import { describe, expect, it } from 'vitest'
import { RESUME_OFF, resumeRewindTarget } from './resume-rewind'

const MIN = 60_000

describe('resumeRewindTarget', () => {
    it('does nothing while off', () => {
        expect(resumeRewindTarget(600, 10 * MIN, RESUME_OFF)).toBeNull()
    })

    it('leaves a short pause alone', () => {
        expect(resumeRewindTarget(600, 30_000, { seconds: 5, after: 1 })).toBeNull()
    })

    it('jumps back once the pause is long enough', () => {
        expect(resumeRewindTarget(600, 1 * MIN, { seconds: 5, after: 1 })).toBe(595)
        expect(resumeRewindTarget(600, 20 * MIN, { seconds: 30, after: 5 })).toBe(570)
    })

    it('never goes past the start, and leaves the very start alone', () => {
        expect(resumeRewindTarget(3, 10 * MIN, { seconds: 10, after: 1 })).toBe(0)
        expect(resumeRewindTarget(0, 10 * MIN, { seconds: 10, after: 1 })).toBeNull()
    })
})
