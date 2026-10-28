import { describe, expect, it } from 'vitest'
import {
    customPresets,
    EQ_BAND_Q,
    EQ_FILTERS,
    EQ_PRESET_ALIASES,
    EQ_PRESETS,
    eqPresetLabels,
    resolveEQPreset,
    spotifyPresets
} from './presets'

const rms = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0) / v.length)

describe('EQ presets', () => {
    it('every alias points at a kept preset or none', () => {
        for (const [from, to] of Object.entries(EQ_PRESET_ALIASES)) {
            expect(eqPresetLabels).not.toContain(from)
            expect(to === 'none' || eqPresetLabels.includes(to)).toBe(true)
        }
        expect(resolveEQPreset('Open Back')).toBe('Closed Back')
        expect(resolveEQPreset('Rock')).toBe('Rock')
    })

    it('keeps one preset per shape: no two curves within 0.45 dB rms', () => {
        const names = [...spotifyPresets, ...customPresets]
        for (let i = 0; i < names.length; i++) {
            for (let j = i + 1; j < names.length; j++) {
                const a = EQ_PRESETS[names[i]]
                const b = EQ_PRESETS[names[j]]
                const d = rms(a.map((x, k) => x - b[k]))
                expect(d, `${names[i]} vs ${names[j]}`).toBeGreaterThanOrEqual(0.45)
            }
        }
    })

    it('the reducers only cut their own end', () => {
        const bass = EQ_PRESETS['Bass reducer']
        const treble = EQ_PRESETS['Treble reducer']
        expect(bass.slice(0, 4).every((g) => g < 0)).toBe(true)
        expect(bass.slice(4).every((g) => g === 0)).toBe(true)
        expect(treble.slice(0, 5).every((g) => g === 0)).toBe(true)
        expect(treble.slice(5).every((g) => g < 0)).toBe(true)
    })

    it('does nothing at least 0.8 dB rms, so every preset is audible', () => {
        for (const name of eqPresetLabels)
            expect(rms(EQ_PRESETS[name]), name).toBeGreaterThanOrEqual(0.8)
    })
})

// The Web Audio peaking biquad (RBJ cookbook), so the band design can be
// checked here the way it was measured: the composite response of a preset
// should sit close to its slider values at every band centre.
const FS = 44100
function peakDb(f0: number, gainDb: number, q: number, f: number) {
    const A = 10 ** (gainDb / 40)
    const w0 = (2 * Math.PI * f0) / FS
    const alpha = Math.sin(w0) / (2 * q)
    const b = [1 + alpha * A, -2 * Math.cos(w0), 1 - alpha * A]
    const a = [1 + alpha / A, -2 * Math.cos(w0), 1 - alpha / A]
    const w = (2 * Math.PI * f) / FS
    const re = (c: number[]) => c[0] + c[1] * Math.cos(w) + c[2] * Math.cos(2 * w)
    const im = (c: number[]) => -c[1] * Math.sin(w) - c[2] * Math.sin(2 * w)
    return 20 * Math.log10(Math.hypot(re(b), im(b)) / Math.hypot(re(a), im(a)))
}
const composite = (gains: number[], f: number) =>
    EQ_FILTERS.reduce(
        (sum, band, i) => sum + (gains[i] ? peakDb(band.freq, gains[i], EQ_BAND_Q, f) : 0),
        0
    )

describe('EQ band design', () => {
    it('is ten octave-wide peaks', () => {
        expect(EQ_FILTERS.every((f) => f.type === 'peaking')).toBe(true)
        expect(EQ_BAND_Q).toBeCloseTo(Math.SQRT2, 6)
    })

    it('lands within 1 dB of every preset slider at its own band centre', () => {
        for (const name of eqPresetLabels) {
            const gains = EQ_PRESETS[name]
            EQ_FILTERS.forEach((band, i) => {
                expect(
                    Math.abs(composite(gains, band.freq) - gains[i]),
                    `${name} @ ${band.freq}`
                ).toBeLessThan(1)
            })
        }
    })
})
