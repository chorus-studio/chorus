import { describe, expect, it } from 'vitest'
import {
    backdropVariables,
    cssUrl,
    dimColour,
    filterCss,
    gradientCss,
    panelAlpha
} from './backdrop-css'
import {
    BUILTIN_LOOKS,
    DEFAULT_IMAGE_OPTIONS,
    GRADIENT_STOPS_MAX,
    GRADIENT_STOPS_MIN,
    isVideoBackdrop,
    type GradientBackdrop
} from '$lib/types/look'
import { THEME_NAMES } from './theming'
import { normaliseHex } from './look-palette'

const linear: GradientBackdrop = {
    kind: 'gradient',
    type: 'linear',
    angle: 135,
    origin: 'center',
    drift: false,
    stops: [
        { color: '#24243e', at: 100 },
        { color: '#0f0c29', at: 0 },
        { color: '#302b63', at: 50 }
    ]
}

describe('gradientCss', () => {
    it('sorts the stops and writes each kind', () => {
        expect(gradientCss(linear)).toBe(
            'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)'
        )
        expect(gradientCss({ ...linear, type: 'radial', origin: 'bottom left' })).toBe(
            'radial-gradient(ellipse at bottom left, #0f0c29 0%, #302b63 50%, #24243e 100%)'
        )
        expect(gradientCss({ ...linear, type: 'conic', angle: 180, origin: 'bottom' })).toBe(
            'conic-gradient(from 180deg at bottom, #0f0c29 0%, #302b63 50%, #24243e 100%)'
        )
    })

    it('repeats from the last stop when asked, and shapes a radial', () => {
        expect(gradientCss({ ...linear, repeat: true })).toMatch(
            /^repeating-linear-gradient\(135deg, /
        )
        expect(gradientCss({ ...linear, type: 'radial', shape: 'circle', origin: 'left' })).toBe(
            'radial-gradient(circle at left, #0f0c29 0%, #302b63 50%, #24243e 100%)'
        )
        expect(
            gradientCss({
                ...linear,
                type: 'radial',
                repeat: true,
                origin: 'left',
                shape: 'circle'
            })
        ).toMatch(/^repeating-radial-gradient\(circle at left, /)
        expect(gradientCss({ ...linear, type: 'conic', repeat: true })).toMatch(
            /^repeating-conic-gradient\(from 135deg at center, /
        )
        // A mesh has no period to repeat.
        expect(gradientCss({ ...linear, type: 'mesh', repeat: true })).not.toContain('repeating')
    })

    it('lays a mesh out as blobs over the last stop', () => {
        const mesh = gradientCss({
            ...linear,
            type: 'mesh',
            stops: [
                { color: '#ff6ec7', at: 0 },
                { color: '#7c4dff', at: 50 },
                { color: '#0b0620', at: 100 }
            ]
        })
        expect(mesh).toBe(
            'radial-gradient(circle at 20% 30%, #ff6ec7 0%, transparent 55%), radial-gradient(circle at 80% 20%, #7c4dff 0%, transparent 55%), linear-gradient(#0b0620, #0b0620)'
        )
    })

    it('renders every built-in look', () => {
        for (const look of BUILTIN_LOOKS) {
            expect(look.backdrop?.kind).toBe('gradient')
            expect(gradientCss(look.backdrop as GradientBackdrop)).toMatch(/gradient\(/)
        }
    })
})

describe('filters, washes and panels', () => {
    it('writes only the filters that do something', () => {
        expect(filterCss(0, 100)).toBe('none')
        expect(filterCss(12, 100)).toBe('blur(12px)')
        expect(filterCss(0, 150)).toBe('saturate(1.50)')
        expect(filterCss(8, 80)).toBe('blur(8px) saturate(0.80)')
    })

    it('tints the wash with the frame, or black / white by mode', () => {
        expect(dimColour(0, true, '#1c2440', 'dark')).toBe('transparent')
        expect(dimColour(35, true, '#1c2440', 'dark')).toBe('rgb(28 36 64 / 0.35)')
        expect(dimColour(50, false, '#1c2440', 'dark')).toBe('rgb(0 0 0 / 0.5)')
        expect(dimColour(50, false, '#1c2440', 'light')).toBe('rgb(255 255 255 / 0.5)')
    })

    it('caps show-through at 60 % dark and 40 % light', () => {
        expect(panelAlpha(0)).toBe(1)
        expect(panelAlpha(25)).toBe(0.75)
        expect(panelAlpha(90)).toBe(0.1)
        expect(panelAlpha(100)).toBe(0)
        expect(panelAlpha(140)).toBe(0)
        expect(panelAlpha(-5)).toBe(1)
    })

    it('escapes quotes in an address', () => {
        expect(cssUrl('https://x/a"b')).toBe('url("https://x/a\\"b")')
    })
})

describe('backdropVariables', () => {
    const ctx = { frame: '#1c2440', mode: 'dark' as const, imageUrl: null }

    it('writes a gradient as the picture with no wash', () => {
        const vars = backdropVariables(linear, ctx)
        expect(vars['--chorus-backdrop-image']).toMatch(/^linear-gradient/)
        expect(vars['--chorus-backdrop-dim']).toBe('transparent')
        expect(vars['--chorus-backdrop-size']).toBe('100% 100%')
    })

    it('shows no picture until an image has an address, then the file at its fit', () => {
        const image = {
            kind: 'image' as const,
            source: { type: 'file' as const, id: 'w1' },
            ...DEFAULT_IMAGE_OPTIONS,
            fit: 'tile' as const,
            blur: 6
        }
        expect(backdropVariables(image, ctx)['--chorus-backdrop-image']).toBe('none')
        const vars = backdropVariables(image, { ...ctx, imageUrl: 'blob:x' })
        expect(vars['--chorus-backdrop-image']).toBe('url("blob:x")')
        expect(vars['--chorus-backdrop-repeat']).toBe('repeat')
        expect(vars['--chorus-backdrop-size']).toBe('auto')
        // A video cannot tile; the element fills the window.
        expect(vars['--chorus-backdrop-fit']).toBe('cover')
        expect(backdropVariables({ ...image, fit: 'contain' }, ctx)['--chorus-backdrop-fit']).toBe(
            'contain'
        )
        expect(vars['--chorus-backdrop-filter']).toBe('blur(6px)')
        expect(vars['--chorus-backdrop-blur']).toBe('6px')
        expect(vars['--chorus-backdrop-dim']).toBe('rgb(28 36 64 / 0.35)')
    })

    it('scales the cover by its zoom and tints its wash', () => {
        const vars = backdropVariables(
            { kind: 'cover', blur: 40, dim: 30, zoom: 120 },
            { ...ctx, imageUrl: 'https://i.scdn.co/image/abc' }
        )
        expect(vars['--chorus-backdrop-scale']).toBe('1.20')
        expect(vars['--chorus-backdrop-filter']).toBe('blur(40px) saturate(1.20)')
        expect(vars['--chorus-backdrop-dim']).toBe('rgb(28 36 64 / 0.3)')
    })
})

describe('isVideoBackdrop', () => {
    const image = { kind: 'image' as const, ...DEFAULT_IMAGE_OPTIONS }
    const info = {
        name: 'x',
        mime: 'image/webp',
        width: 1,
        height: 1,
        bytes: 1,
        animated: false,
        thumb: 'data:image/webp;base64,AA=='
    }
    it('knows a stored video by its info and a linked one by its extension', () => {
        expect(
            isVideoBackdrop({
                ...image,
                source: { type: 'file', id: 'a' },
                info: { ...info, mime: 'video/mp4' }
            })
        ).toBe(true)
        expect(
            isVideoBackdrop({
                ...image,
                source: { type: 'file', id: 'a' },
                info: { ...info, video: true }
            })
        ).toBe(true)
        expect(isVideoBackdrop({ ...image, source: { type: 'file', id: 'a' }, info })).toBe(false)
        expect(
            isVideoBackdrop({ ...image, source: { type: 'url', url: 'https://x/loop.webm?v=2' } })
        ).toBe(true)
        expect(
            isVideoBackdrop({ ...image, source: { type: 'url', url: 'https://x/loop.MP4' } })
        ).toBe(true)
        expect(
            isVideoBackdrop({ ...image, source: { type: 'url', url: 'https://x/still.jpg' } })
        ).toBe(false)
        expect(isVideoBackdrop(BUILTIN_LOOKS[0].backdrop)).toBe(false)
        expect(isVideoBackdrop(null)).toBe(false)
    })
})

describe('BUILTIN_LOOKS', () => {
    it('has as many looks as palettes, each sound', () => {
        expect(BUILTIN_LOOKS).toHaveLength(THEME_NAMES.length)
        expect(new Set(BUILTIN_LOOKS.map((look) => look.id)).size).toBe(BUILTIN_LOOKS.length)
        expect(new Set(BUILTIN_LOOKS.map((look) => look.name.toLowerCase())).size).toBe(
            BUILTIN_LOOKS.length
        )
        for (const look of BUILTIN_LOOKS) {
            expect(look.builtIn).toBe(true)
            expect(look.palette.kind).toBe('builtin')
            if (look.palette.kind === 'builtin') expect(THEME_NAMES).toContain(look.palette.name)
            expect(look.backdrop?.kind).toBe('gradient')
            if (look.backdrop?.kind !== 'gradient') continue
            const { stops, type, repeat, shape } = look.backdrop
            expect(stops.length).toBeGreaterThanOrEqual(GRADIENT_STOPS_MIN)
            expect(stops.length).toBeLessThanOrEqual(GRADIENT_STOPS_MAX)
            for (const stop of stops) {
                expect(normaliseHex(stop.color)).toBe(stop.color)
                expect(stop.at).toBeGreaterThanOrEqual(0)
                expect(stop.at).toBeLessThanOrEqual(100)
            }
            if (repeat) expect(type).not.toBe('mesh')
            if (shape) expect(type).toBe('radial')
            // The CSS each one becomes parses as one background layer list.
            expect(gradientCss(look.backdrop)).toMatch(/gradient\(/)
        }
    })
})
