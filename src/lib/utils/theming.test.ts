import { describe, expect, it } from 'vitest'
import { rewriteSpotifyCss } from './theming'
import { frameColor } from './theme-surfaces'

const overlay = (alpha: string) =>
    `rgba(var(--chorus-rgb-selected-row), calc(${alpha} * var(--chorus-overlay-gain, 1)))`

describe('rewriteSpotifyCss', () => {
    it('swaps a colour and marks the declaration important once', () => {
        expect(rewriteSpotifyCss('.a{color:#fff}')).toBe('.a{color:var(--chorus-text) !important}')
        expect(rewriteSpotifyCss('.a{color:#fff!important}')).toBe(
            '.a{color:var(--chorus-text) !important}'
        )
        expect(rewriteSpotifyCss('.a{color:#fff !important;width:1px}')).toBe(
            '.a{color:var(--chorus-text) !important;width:1px}'
        )
    })

    it('leaves declarations and selectors without a themed colour alone', () => {
        const css = 'path[fill="#1ed760"]{fill:#abcdef;width:1px}'
        expect(rewriteSpotifyCss(css)).toBe(css)
    })

    it('keeps the flag at the end when the colour sits inside a function', () => {
        expect(rewriteSpotifyCss('.a{color:var(--x,#ffffffb3)}')).toBe(
            '.a{color:var(--x,rgba(var(--chorus-rgb-text), 0.7)) !important}'
        )
        expect(
            rewriteSpotifyCss('.a{background-image:linear-gradient(90deg,#0000,#ffffff1a,#0000)}')
        ).toBe(
            `.a{background-image:linear-gradient(90deg,#0000,${overlay('0.1')},#0000) !important}`
        )
        expect(rewriteSpotifyCss('.a{filter:drop-shadow(0 0 3px #000)}')).toBe(
            '.a{filter:drop-shadow(0 0 3px var(--chorus-shadow)) !important}'
        )
    })

    it('rewrites only the selector-free side of attribute selectors', () => {
        expect(rewriteSpotifyCss('path[fill="#1ed760"]{fill:#1ed760}')).toBe(
            'path[fill="#1ed760"]{fill:var(--chorus-button-active) !important}'
        )
    })

    it('leaves url() tokens intact, semicolons and colours included', () => {
        const url = `url("data:image/svg+xml;utf8,<svg fill='#fff'/>")`
        expect(rewriteSpotifyCss(`.a{background:${url} #121212;color:#fff}`)).toBe(
            `.a{background:${url} var(--chorus-main) !important;color:var(--chorus-text) !important}`
        )
        expect(rewriteSpotifyCss(`.a{background:${url}}`)).toBe(`.a{background:${url}}`)
    })

    it('tints light overlays with the selected row and dims text with the text colour', () => {
        expect(rewriteSpotifyCss('.a{background:#ffffff40}')).toBe(
            `.a{background:${overlay('0.25')} !important}`
        )
        expect(rewriteSpotifyCss('.a{background:#ffffff4d}')).toBe(
            '.a{background:rgba(var(--chorus-rgb-text), 0.3) !important}'
        )
        expect(rewriteSpotifyCss('.a{background:#00000080}')).toBe('.a{background:#00000080}')
    })

    it('splits black between the app frame and the text on accent fills', () => {
        expect(rewriteSpotifyCss('.a{background-color:#000;color:#000}')).toBe(
            '.a{background-color:var(--chorus-frame) !important;color:var(--chorus-shadow) !important}'
        )
        expect(rewriteSpotifyCss('.a{--background-press:#000;--text-base:#000;fill:#000000}')).toBe(
            '.a{--background-press:var(--chorus-frame) !important;--text-base:var(--chorus-shadow) !important;fill:var(--chorus-shadow) !important}'
        )
        expect(rewriteSpotifyCss('.a{background:linear-gradient(#000,#121212)}')).toBe(
            '.a{background:linear-gradient(var(--chorus-frame),var(--chorus-main)) !important}'
        )
    })

    it('themes the hover and pressed greys of the white buttons', () => {
        expect(
            rewriteSpotifyCss(
                '.a{--background-base:#fff;--background-highlight:#f0f0f0;--background-press:#c7c7c7}'
            )
        ).toBe(
            '.a{--background-base:var(--chorus-text) !important;--background-highlight:var(--chorus-text) !important;--background-press:var(--chorus-subtext) !important}'
        )
    })

    it('rewrites token definitions and nested at-rules', () => {
        expect(
            rewriteSpotifyCss(
                '.encore-dark-theme{--text-subdued:#b3b3b3;--background-tinted-base:#ffffff1a}'
            )
        ).toBe(
            `.encore-dark-theme{--text-subdued:var(--chorus-subtext) !important;--background-tinted-base:${overlay('0.1')} !important}`
        )
        expect(rewriteSpotifyCss('@media (min-width:1px){.a{color:#fff}.b{color:#b3b3b3}}')).toBe(
            '@media (min-width:1px){.a{color:var(--chorus-text) !important}.b{color:var(--chorus-subtext) !important}}'
        )
    })

    it('keeps pretty-printed stylesheets readable', () => {
        expect(rewriteSpotifyCss('.a {\n    color: #fff;\n    background: #121212\n}')).toBe(
            '.a {\n    color: var(--chorus-text) !important;\n    background: var(--chorus-main) !important\n}'
        )
    })
})

describe('frameColor', () => {
    it('keeps the palette shadow as the frame when it already clears the card colour', () => {
        // cherry_blossom: a bright frame the palette chose on purpose
        expect(frameColor({ card: '#86244e', shadow: '#c94277' })).toBe('#c94277')
        // Spotify's own: black frame under #121212 panels
        expect(frameColor({ card: '#282828', shadow: '#000000' })).toBe('#000000')
    })

    it('lifts the frame a half step above the card colour when the two coincide', () => {
        // forest_green: a step darker than main would be black, not green
        expect(frameColor({ card: '#123527', shadow: '#123527' })).toBe('#184835')
        // hot_pink
        expect(frameColor({ card: '#d31589', shadow: '#d31589' })).toBe('#e81998')
    })
})
