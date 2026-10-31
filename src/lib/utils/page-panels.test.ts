import { describe, expect, it } from 'vitest'
import { paintsColour } from './page-panels'

describe('paintsColour', () => {
    it('reads opaque legacy colours as painting, whatever their last channel', () => {
        // A zero blue channel is not an alpha: the lava palette's main and frame
        // colours went unseen by the walker for exactly this.
        expect(paintsColour('rgb(122, 0, 0)')).toBe(true)
        expect(paintsColour('rgb(170, 0, 0)')).toBe(true)
        expect(paintsColour('rgb(0, 0, 0)')).toBe(true)
        expect(paintsColour('rgb(18, 18, 18)')).toBe(true)
    })

    it('reads the fourth channel as the alpha', () => {
        expect(paintsColour('rgba(0, 0, 0, 0)')).toBe(false)
        expect(paintsColour('rgba(122, 0, 0, 0)')).toBe(false)
        expect(paintsColour('rgba(122, 0, 0, 0.25)')).toBe(true)
        expect(paintsColour('rgba(0, 0, 0, 1)')).toBe(true)
    })

    it('reads modern syntaxes with a slash', () => {
        expect(paintsColour('color(srgb 0.0564 0.0249 0.048 / 0.3)')).toBe(true)
        expect(paintsColour('color(srgb 0.0564 0.0249 0.048 / 0)')).toBe(false)
        expect(paintsColour('color(srgb 0.0564 0.0249 0)')).toBe(true)
        expect(paintsColour('rgb(122 0 0 / 0%)')).toBe(false)
        expect(paintsColour('oklab(0.4 0.1 0 / 0.5)')).toBe(true)
    })

    it('treats nothing and the transparent keyword as not painting', () => {
        expect(paintsColour('')).toBe(false)
        expect(paintsColour('transparent')).toBe(false)
    })
})
