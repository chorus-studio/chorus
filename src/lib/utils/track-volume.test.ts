import { beforeEach, describe, expect, it, vi } from 'vitest'

const updateTrack = vi.fn(async () => {})
const updateState = vi.fn(async () => {})
let current: { track_id: string } = { track_id: 't1' }
vi.mock('$lib/stores/data', () => ({
    dataStore: { updateTrack: (...a: unknown[]) => updateTrack(...(a as [])) }
}))
vi.mock('$lib/stores/now-playing', () => ({
    nowPlaying: {
        subscribe: (run: (v: unknown) => void) => {
            run(current)
            return () => {}
        },
        updateState: (...a: unknown[]) => updateState(...(a as []))
    }
}))

import {
    TRACK_VOLUME_MAX,
    TRACK_VOLUME_MIN,
    clampTrackVolume,
    dispatchTrackVolume,
    saveTrackVolume,
    trackGainFactor
} from './track-volume'

describe('clampTrackVolume / trackGainFactor', () => {
    it('keeps whole percents inside the range', () => {
        expect(clampTrackVolume(120.4)).toBe(120)
        expect(clampTrackVolume(5)).toBe(TRACK_VOLUME_MIN)
        expect(clampTrackVolume(900)).toBe(TRACK_VOLUME_MAX)
        expect(clampTrackVolume('abc')).toBe(100)
        expect(clampTrackVolume(null)).toBe(100)
    })

    it('turns a percent into a gain factor, 1 for none', () => {
        expect(trackGainFactor(null)).toBe(1)
        expect(trackGainFactor(undefined)).toBe(1)
        expect(trackGainFactor(100)).toBe(1)
        expect(trackGainFactor(150)).toBe(1.5)
        expect(trackGainFactor(50)).toBe(0.5)
        expect(trackGainFactor(1000)).toBe(TRACK_VOLUME_MAX / 100)
    })
})

describe('dispatchTrackVolume / saveTrackVolume', () => {
    const posted: unknown[] = []
    beforeEach(() => {
        posted.length = 0
        updateTrack.mockClear()
        updateState.mockClear()
        current = { track_id: 't1' }
        vi.stubGlobal('window', { postMessage: (m: unknown) => posted.push(m) })
    })

    it('posts the factor to the page', () => {
        dispatchTrackVolume(130)
        expect(posted).toEqual([{ type: 'FROM_TRACK_VOLUME_LISTENER', data: { factor: 1.3 } }])
    })

    it('saves a clamped percent with the track, mirrors it and applies it', async () => {
        await saveTrackVolume(123.6)
        expect(updateTrack).toHaveBeenCalledWith({ track_id: 't1', value: { volume: 124 } })
        expect(updateState).toHaveBeenCalledWith({ volume: 124 })
        expect(posted.at(-1)).toEqual({
            type: 'FROM_TRACK_VOLUME_LISTENER',
            data: { factor: 1.24 }
        })
    })

    it('treats 100 and null as "no offset"', async () => {
        await saveTrackVolume(100)
        expect(updateTrack).toHaveBeenCalledWith({ track_id: 't1', value: { volume: null } })
        await saveTrackVolume(null)
        expect(updateState).toHaveBeenLastCalledWith({ volume: null })
        expect(posted.at(-1)).toEqual({ type: 'FROM_TRACK_VOLUME_LISTENER', data: { factor: 1 } })
    })

    it('does nothing without a track', async () => {
        current = { track_id: '' }
        await saveTrackVolume(150)
        expect(updateTrack).not.toHaveBeenCalled()
    })
})
