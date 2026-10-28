import { describe, expect, it } from 'vitest'
import {
    customPresets,
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
