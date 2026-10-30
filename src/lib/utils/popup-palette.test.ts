import { describe, expect, it } from 'vitest'
import {
    contrastRatio,
    derivePopupPalette,
    hexToHsl,
    hexToRgb,
    hslToHex,
    mixHex,
    pickSwatch,
    readableText
} from './popup-palette'

// What node-vibrant found on a white cover with red lettering (The
// Neighbourhood, "I Love You."): the shot that produced a white-on-white popup.
const RED_ON_WHITE = [
    { hex: '#a43a40', population: 15 },
    { hex: '#7c1c24', population: 1 },
    { hex: '#fcf4f4', population: 2 },
    { hex: '#ae636a', population: 12 },
    { hex: '#4c2424', population: 2 },
    { hex: '#ceacac', population: 6 }
]
const RED_HUE = hexToHsl('#a43a40')[0]

describe('hexToRgb', () => {
    it('expands the 3-digit hexes node-vibrant returns for its text colours', () => {
        expect(hexToRgb('#fff')).toEqual([255, 255, 255])
        expect(hexToRgb('#000')).toEqual([0, 0, 0])
        expect(hexToRgb('#a43a40')).toEqual([164, 58, 64])
    })

    it('keeps white white through the legibility helpers', () => {
        // '#fff' used to parse as (0, 15, 255): white text was judged readable on
        // a "blue" panel that CSS painted white, and the mix came out lavender.
        expect(readableText('#fff', '#ffffff')).toBe('#121212')
        expect(mixHex('#ffffff', '#fff', 0.72)).toBe('#ffffff')
    })
})

describe('pickSwatch', () => {
    it('takes the most populous swatch with chroma', () => {
        expect(pickSwatch(RED_ON_WHITE)?.hex).toBe('#a43a40')
    })

    it('passes over a populous grey for a colour that covers enough of the image', () => {
        const swatches = [
            { hex: '#808080', population: 100 },
            { hex: '#a43a40', population: 10 }
        ]
        expect(pickSwatch(swatches)?.hex).toBe('#a43a40')
    })

    it('gives nothing for a grey cover, a speck of colour, or no swatches', () => {
        expect(pickSwatch([{ hex: '#777777', population: 50 }])).toBeNull()
        expect(
            pickSwatch([
                { hex: '#808080', population: 1000 },
                { hex: '#a43a40', population: 3 }
            ])
        ).toBeNull()
        expect(pickSwatch([])).toBeNull()
    })
})

describe('derivePopupPalette', () => {
    it('keeps the cover hue and sets the lightness by appearance', () => {
        const dark = derivePopupPalette(RED_ON_WHITE, 'dark')!
        const light = derivePopupPalette(RED_ON_WHITE, 'light')!
        expect(Math.abs(hexToHsl(dark.bg)[0] - RED_HUE)).toBeLessThan(4)
        expect(Math.abs(hexToHsl(light.bg)[0] - RED_HUE)).toBeLessThan(4)
        expect(hexToHsl(dark.bg)[2]).toBeLessThan(20)
        expect(hexToHsl(light.bg)[2]).toBeGreaterThan(90)
        expect(hexToHsl(dark.text)[2]).toBeGreaterThan(85)
        expect(hexToHsl(light.text)[2]).toBeLessThan(20)
    })

    it('marks active states with the cover colour, fitted to the panel', () => {
        const dark = derivePopupPalette(RED_ON_WHITE, 'dark')!
        const light = derivePopupPalette(RED_ON_WHITE, 'light')!
        expect(Math.abs(hexToHsl(dark.accent)[0] - RED_HUE)).toBeLessThan(4)
        expect(Math.abs(hexToHsl(light.accent)[0] - RED_HUE)).toBeLessThan(4)
        // #a43a40 is 2.6:1 on the dark panel, so it is lifted; it reads on the light one as is.
        expect(hexToHsl(dark.accent)[2]).toBeGreaterThan(hexToHsl('#a43a40')[2])
        expect(light.accent).toBe('#a43a40')
    })

    it('clears 4.5:1 for text and 3:1 for the accent on every hue, chroma and lightness', () => {
        for (const mode of ['dark', 'light'] as const) {
            for (let h = 0; h < 360; h += 15) {
                for (const s of [25, 50, 75, 100]) {
                    for (const l of [5, 25, 50, 75, 95]) {
                        const swatch = hslToHex(h, s, l)
                        const p = derivePopupPalette([{ hex: swatch, population: 10 }], mode)
                        const at = `${mode} ${swatch}`
                        expect(p, at).not.toBeNull()
                        expect(contrastRatio(p!.bg, p!.text), `text ${at}`).toBeGreaterThanOrEqual(
                            4.5
                        )
                        expect(
                            contrastRatio(p!.bg, p!.text2),
                            `text2 ${at}`
                        ).toBeGreaterThanOrEqual(3)
                        expect(
                            contrastRatio(p!.bg, p!.accent),
                            `accent ${at}`
                        ).toBeGreaterThanOrEqual(3)
                        expect(
                            contrastRatio(p!.accent, p!.accentFg),
                            `glyph ${at}`
                        ).toBeGreaterThanOrEqual(4.5)
                    }
                }
            }
        }
    })

    it('yields nothing for a grey cover or no cover, so the popup wears the theme', () => {
        expect(derivePopupPalette([{ hex: '#777777', population: 50 }], 'dark')).toBeNull()
        expect(derivePopupPalette([{ hex: '#e8e4e4', population: 50 }], 'light')).toBeNull()
        expect(derivePopupPalette([], 'light')).toBeNull()
    })
})
