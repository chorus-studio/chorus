import { describe, expect, it } from 'vitest'
import {
    completePalette,
    derivePalette,
    normaliseHex,
    paletteFromSwatches,
    parseSpicetifyIni,
    seedFromGradient,
    seedFromSwatches,
    swatchesFromGradient,
    toSpicetifyIni
} from './look-palette'
import { contrastRatio, hexToHsl } from './popup-palette'
import { frameColor } from './theme-surfaces'

describe('normaliseHex', () => {
    it('accepts the forms a person pastes', () => {
        expect(normaliseHex('#1ED760')).toBe('#1ed760')
        expect(normaliseHex('1ed760')).toBe('#1ed760')
        expect(normaliseHex('#abc')).toBe('#aabbcc')
        expect(normaliseHex(' abc ')).toBe('#aabbcc')
    })

    it('rejects anything else', () => {
        expect(normaliseHex('')).toBeNull()
        expect(normaliseHex('#12345')).toBeNull()
        expect(normaliseHex('rgb(1,2,3)')).toBeNull()
        expect(normaliseHex(undefined)).toBeNull()
    })
})

describe('derivePalette', () => {
    const seeds = [
        { base: '#141a2e', accent: '#ffb36b' },
        { base: '#121212', accent: '#1ed760' },
        { base: '#2b1d4f', accent: '#2b1d4f' }, // accent the same as the base
        { base: '#f3e9dc', accent: '#c2410c' }, // a light base
        { base: '#ffffff', accent: '#ffffff' }, // everything white
        { base: '#000000', accent: '#000000' } // everything black
    ]

    it.each(seeds)('keeps text and controls legible for %o', (seed) => {
        const p = derivePalette(seed)
        expect(contrastRatio(p.main, p.text)).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(p.button_disabled, p.text)).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(p.button_disabled, p.subtext)).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(p.main, p.button)).toBeGreaterThanOrEqual(3)
        expect(contrastRatio(p.main, p.notification_error)).toBeGreaterThanOrEqual(3)
    })

    it('builds the ladder the built-ins have', () => {
        const p = derivePalette({ base: '#141a2e', accent: '#ffb36b' })
        expect(p.main).toBe('#141a2e')
        expect(p.player).toBe(p.main)
        expect(p.misc).toBe(p.main)
        expect(hexToHsl(p.sidebar)[2]).toBeLessThan(hexToHsl(p.main)[2])
        expect(hexToHsl(p.card)[2]).toBeGreaterThan(hexToHsl(p.main)[2])
        expect(hexToHsl(p.button_disabled)[2]).toBeGreaterThan(hexToHsl(p.card)[2])
        // The frame keeps clear of the card, so frameColor leaves it alone.
        expect(frameColor(p)).toBe(p.shadow)
        expect(p.selected_row).toBe(p.button)
        expect(p.notification).toBe(p.card)
    })

    it('runs the ladder downward from a light base', () => {
        const p = derivePalette({ base: '#f3e9dc', accent: '#c2410c' })
        expect(hexToHsl(p.card)[2]).toBeLessThan(hexToHsl(p.main)[2])
        expect(hexToHsl(p.shadow)[2]).toBeGreaterThan(hexToHsl(p.main)[2])
        expect(hexToHsl(p.text)[2]).toBeLessThan(30)
        // On a light page the accent is also text, so it reads at text contrast.
        expect(contrastRatio(p.main, p.button)).toBeGreaterThanOrEqual(4.5)
    })

    it('keeps a text colour the person chose when it reads, and fixes one that does not', () => {
        const kept = derivePalette({ base: '#141a2e', accent: '#ffb36b', text: '#ffe9c4' })
        expect(kept.text).toBe('#ffe9c4')
        const fixed = derivePalette({ base: '#141a2e', accent: '#ffb36b', text: '#1a2238' })
        expect(contrastRatio(fixed.button_disabled, fixed.text)).toBeGreaterThanOrEqual(4.5)
    })
})

describe('Spicetify colour schemes', () => {
    const ini = `
; a comment
[Dracula]
text               = f8f8f2
subtext            = 6272a4
main               = 282a36
sidebar            = 282a36
player             = 282a36
card               = 44475a
shadow             = 191a21
selected-row       = bd93f9
button             = bd93f9
button-active      = ff79c6
button-disabled    = 6272a4
tab-active         = 44475a
notification       = 8be9fd
notification-error = ff5555
misc               = 50fa7b
main-elevated      = 44475a  ; ignored: Chorus derives it

[Half]
main = #0b1f17
button = #73b489
`

    it('reads every section, maps the keys and drops the ones Chorus derives', () => {
        const schemes = parseSpicetifyIni(ini)
        expect(schemes.map((s) => s.name)).toEqual(['Dracula', 'Half'])
        expect(schemes[0].colours.selected_row).toBe('#bd93f9')
        expect(schemes[0].colours.notification_error).toBe('#ff5555')
        expect(Object.keys(schemes[0].colours)).toHaveLength(15)
        expect(schemes[1].colours).toEqual({ main: '#0b1f17', button: '#73b489' })
    })

    it('treats keys before any header as one unnamed scheme', () => {
        const schemes = parseSpicetifyIni('main = 121212\nbutton = 1ed760')
        expect(schemes).toHaveLength(1)
        expect(schemes[0].name).toBe('Imported')
    })

    it('completes a partial scheme from its main and button colours', () => {
        const full = completePalette({ main: '#0b1f17', button: '#73b489' })
        expect(full.main).toBe('#0b1f17')
        expect(full.button).toBe('#73b489')
        expect(Object.keys(full)).toHaveLength(15)
        expect(contrastRatio(full.main, full.text)).toBeGreaterThanOrEqual(4.5)
    })

    it('writes a scheme back out in Spicetify form and reads it again', () => {
        const scheme = parseSpicetifyIni(ini)[0]
        const text = toSpicetifyIni('Dracula', completePalette(scheme.colours))
        expect(text.startsWith('[Dracula]\ntext = f8f8f2\n')).toBe(true)
        expect(text).toContain('selected-row = bd93f9')
        expect(parseSpicetifyIni(text)[0].colours).toEqual(scheme.colours)
    })
})

describe('seedFromSwatches', () => {
    it('takes the hue of the dominant swatch for the base and a coloured one for the accent', () => {
        const seed = seedFromSwatches(
            [
                { hex: '#2d2d2d', population: 900 },
                { hex: '#ff6b35', population: 300 },
                { hex: '#1b3a6b', population: 100 }
            ],
            'dark'
        )
        expect(seed).not.toBeNull()
        expect(hexToHsl(seed!.base)[2]).toBeLessThan(20)
        expect(hexToHsl(seed!.accent)[0]).toBeCloseTo(hexToHsl('#ff6b35')[0], 0)
    })

    it('gives a light base in light mode and nothing for no swatches', () => {
        const seed = seedFromSwatches([{ hex: '#1b6b63', population: 10 }], 'light')
        expect(hexToHsl(seed!.base)[2]).toBeGreaterThan(80)
        expect(seedFromSwatches([], 'dark')).toBeNull()
    })
})

describe('paletteFromSwatches', () => {
    it('is the dark Match-palette seed derived, and null for no swatches', () => {
        const swatches = [
            { hex: '#2a1a4a', population: 900 },
            { hex: '#ff8c42', population: 300 }
        ]
        const seed = seedFromSwatches(swatches, 'dark')!
        expect(paletteFromSwatches(swatches)).toEqual(derivePalette(seed))
        expect(hexToHsl(paletteFromSwatches(swatches)!.main)[2]).toBeLessThan(20)
        expect(paletteFromSwatches([])).toBeNull()
    })
})

describe('seedFromGradient', () => {
    const neon = {
        kind: 'gradient' as const,
        type: 'linear' as const,
        angle: 45,
        origin: 'center' as const,
        drift: false,
        stops: [
            { color: '#0f0f0f', at: 0 },
            { color: '#ff00ff', at: 25 },
            { color: '#00ffff', at: 75 },
            { color: '#0f0f0f', at: 100 }
        ]
    }

    it('weights each stop by the span it colours', () => {
        expect(swatchesFromGradient(neon).map((s) => s.population)).toEqual([13, 38, 38, 13])
        const mesh = swatchesFromGradient({ ...neon, type: 'mesh' })
        expect(mesh[0]).toEqual({ hex: '#0f0f0f', population: 50 })
    })

    it('takes the base from the widest stop and the accent from the hue furthest away', () => {
        const seed = seedFromGradient(neon, 'dark')!
        const [baseHue, , baseLight] = hexToHsl(seed.base)
        const [accentHue] = hexToHsl(seed.accent)
        expect(Math.round(baseHue)).toBe(300)
        expect(baseLight).toBeLessThan(20)
        expect(Math.round(accentHue)).toBe(180)
        // One coloured stop: it is the accent too.
        const single = seedFromGradient(
            {
                ...neon,
                stops: [
                    { color: '#101010', at: 0 },
                    { color: '#ff8c42', at: 100 }
                ]
            },
            'dark'
        )!
        expect(Math.round(hexToHsl(single.accent)[0])).toBe(Math.round(hexToHsl('#ff8c42')[0]))
        expect(seedFromGradient({ ...neon, stops: [] }, 'dark')).toBeNull()
    })
})
