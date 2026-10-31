/**
 * What a Theme-tab card and the editor's preview draw for a palette or a
 * look: the page colours as the page will wear them (inverted for a light
 * appearance, with the frame colour the page derives), the backdrop as CSS
 * background layers, and the panel colour at the look's show-through.
 */
import { isVideoBackdrop, type Backdrop, type Look } from '$lib/types/look'
import {
    SPOTIFY_PALETTE,
    STATIC_THEMES,
    resolvePalette,
    type CSSVariable,
    type Mode,
    type ThemeName
} from './theming'
import { frameColor, invertPalette } from './theme-surfaces'
import { cssUrl, dimColour, gradientCss, panelAlpha } from './backdrop-css'

export type SketchColours = Record<CSSVariable, string> & { frame: string }

export type Sketch = {
    colours: SketchColours
    /** CSS background layers under the panels; null when the frame colour alone paints the gaps. */
    backdrop: string | null
    /** The panels' colour, translucent when a backdrop shows through them. */
    panel: string
    /** The picture moves: an animated file or a drifting gradient. */
    animated: boolean
}

function rgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '')
    const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h
    const n = parseInt(full, 16)
    return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${alpha})`
}

function withFrame(palette: Record<CSSVariable, string>, mode: Mode): SketchColours {
    const colours = mode === 'light' ? invertPalette(palette) : palette
    return { ...colours, frame: frameColor(colours) }
}

/** A look's page colours for the appearance, as theming.ts will write them. */
export function lookColours(look: Look, mode: Mode): SketchColours {
    return withFrame(resolvePalette(look.palette), mode)
}

export function paletteSketch(name: ThemeName, mode: Mode): Sketch {
    const colours = withFrame(STATIC_THEMES[name] ?? SPOTIFY_PALETTE, mode)
    return { colours, backdrop: null, panel: colours.main, animated: false }
}

/**
 * The backdrop as background layers for a small preview: a gradient as is;
 * an image by its thumbnail; the playing cover by its address, or two soft
 * blobs in the palette's colours while no cover is known. The wash goes on
 * top, as on the page.
 */
export function backdropPreviewCss(
    backdrop: Backdrop | null,
    colours: SketchColours,
    mode: Mode,
    cover?: string | null
): string | null {
    if (!backdrop) return null
    if (backdrop.kind === 'gradient') return gradientCss(backdrop)
    const layers: string[] = []
    if (backdrop.kind === 'image') {
        const wash = dimColour(backdrop.dim, backdrop.tint, colours.frame, mode)
        if (wash !== 'transparent') layers.push(`linear-gradient(${wash}, ${wash})`)
        if (backdrop.info?.thumb) {
            const size =
                backdrop.fit === 'contain' ? 'contain' : backdrop.fit === 'tile' ? '30%' : 'cover'
            const repeat = backdrop.fit === 'tile' ? 'repeat' : 'no-repeat'
            layers.push(`${cssUrl(backdrop.info.thumb)} ${backdrop.anchor} / ${size} ${repeat}`)
        }
        layers.push(colours.frame)
        return layers.join(', ')
    }
    const wash = dimColour(backdrop.dim, true, colours.frame, mode)
    if (wash !== 'transparent') layers.push(`linear-gradient(${wash}, ${wash})`)
    if (cover) layers.push(`${cssUrl(cover)} center / cover no-repeat`)
    else {
        layers.push(
            `radial-gradient(circle at 28% 30%, ${colours.button} 0%, transparent 58%)`,
            `radial-gradient(circle at 78% 72%, ${colours.card} 0%, transparent 55%)`
        )
    }
    layers.push(colours.frame)
    return layers.join(', ')
}

export function lookSketch(look: Look, mode: Mode, cover?: string | null): Sketch {
    const colours = lookColours(look, mode)
    const backdrop = backdropPreviewCss(look.backdrop, colours, mode, cover)
    const alpha = backdrop ? panelAlpha(look.panels.showThrough) : 1
    return {
        colours,
        backdrop,
        panel: alpha < 1 ? rgba(colours.main, alpha) : colours.main,
        animated:
            (look.backdrop?.kind === 'gradient' && look.backdrop.drift) ||
            (look.backdrop?.kind === 'image' &&
                (Boolean(look.backdrop.info?.animated) || isVideoBackdrop(look.backdrop)) &&
                look.backdrop.animate)
    }
}
