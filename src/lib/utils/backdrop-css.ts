/**
 * The CSS a look's backdrop becomes. theme.css paints the backdrop as two
 * fixed layers behind Spotify's page (`html::before` carries the picture,
 * `html::after` the dim wash) and reads everything variable about them from
 * `--chorus-backdrop-*` custom properties on the root, so changing a look
 * means writing a handful of properties, never a stylesheet. The panels'
 * translucency rides on `--chorus-panel-alpha` the same way.
 *
 * Pure; the tests check the strings.
 */
import {
    SHOW_THROUGH_MAX,
    SHOW_THROUGH_MAX_LIGHT,
    type Anchor,
    type Backdrop,
    type GradientBackdrop
} from '$lib/types/look'
import type { Mode } from './theme-surfaces'

/** Where a mesh gradient's colour blobs sit, in order; the last stop is the ground under them. */
const MESH_SPOTS = ['20% 30%', '80% 20%', '60% 85%', '25% 80%']
/** How far a mesh blob reaches before it fades out. */
const MESH_REACH = '55%'

/** The keyword position for an anchor; CSS accepts these in `at …` and `background-position`. */
export function anchorPosition(anchor: Anchor): string {
    return anchor
}

export function gradientCss(gradient: GradientBackdrop): string {
    const stops = [...gradient.stops]
        .sort((a, b) => a.at - b.at)
        .map((stop) => `${stop.color} ${Math.round(stop.at)}%`)
    const at = anchorPosition(gradient.origin ?? 'center')
    switch (gradient.type) {
        case 'radial':
            return `radial-gradient(ellipse at ${at}, ${stops.join(', ')})`
        case 'conic':
            return `conic-gradient(from ${Math.round(gradient.angle)}deg at ${at}, ${stops.join(', ')})`
        case 'mesh': {
            const sorted = [...gradient.stops].sort((a, b) => a.at - b.at)
            const ground = sorted[sorted.length - 1]?.color ?? '#000000'
            const blobs = sorted
                .slice(0, -1)
                .slice(0, MESH_SPOTS.length)
                .map(
                    (stop, i) =>
                        `radial-gradient(circle at ${MESH_SPOTS[i]}, ${stop.color} 0%, transparent ${MESH_REACH})`
                )
            return [...blobs, `linear-gradient(${ground}, ${ground})`].join(', ')
        }
        default:
            return `linear-gradient(${Math.round(gradient.angle)}deg, ${stops.join(', ')})`
    }
}

/** `blur(8px) saturate(1.2)`, or `none` when both sit at their neutral value. */
export function filterCss(blur: number, saturate: number): string {
    const parts: string[] = []
    if (blur > 0) parts.push(`blur(${Math.round(blur)}px)`)
    if (Math.round(saturate) !== 100) parts.push(`saturate(${(saturate / 100).toFixed(2)})`)
    return parts.length ? parts.join(' ') : 'none'
}

/** A `url()` token with the quotes and backslashes in the address escaped. */
export function cssUrl(url: string): string {
    return `url("${url.replace(/["\\]/g, '\\$&')}")`
}

function rgbOf(hex: string): [number, number, number] {
    const h = hex.replace('#', '')
    const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h
    const n = parseInt(full, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * The wash over the picture: the frame colour when tinted (so the gaps stay
 * the palette's colour, and a light look washes rather than dims), else
 * black on a dark page and white on a light one, at the dim's strength.
 */
export function dimColour(dim: number, tint: boolean, frame: string, mode: Mode): string {
    const alpha = Math.min(1, Math.max(0, dim / 100))
    if (alpha === 0) return 'transparent'
    const [r, g, b] = tint ? rgbOf(frame) : mode === 'light' ? [255, 255, 255] : [0, 0, 0]
    return `rgb(${r} ${g} ${b} / ${alpha})`
}

/** The panels' opacity for a show-through setting, capped lower on a light page. */
export function panelAlpha(showThrough: number, mode: Mode): number {
    const cap = mode === 'light' ? SHOW_THROUGH_MAX_LIGHT : SHOW_THROUGH_MAX
    const through = Math.min(cap, Math.max(0, showThrough))
    return Math.round((1 - through / 100) * 100) / 100
}

export type BackdropContext = {
    /** The palette's frame colour, which tints the wash and fills behind a `contain`ed image. */
    frame: string
    mode: Mode
    /** The address the picture loads from (an object URL, a data URL or an https link); null while it is not there yet. */
    imageUrl: string | null
}

/**
 * The custom properties for a backdrop. `--chorus-backdrop-image` is `none`
 * for an image that has no address yet, so the frame colour shows until the
 * bytes arrive instead of a broken layer.
 */
export function backdropVariables(
    backdrop: Backdrop,
    ctx: BackdropContext
): Record<string, string> {
    switch (backdrop.kind) {
        case 'gradient':
            return {
                '--chorus-backdrop-image': gradientCss(backdrop),
                '--chorus-backdrop-size': '100% 100%',
                '--chorus-backdrop-position': 'center',
                '--chorus-backdrop-repeat': 'no-repeat',
                '--chorus-backdrop-filter': 'none',
                '--chorus-backdrop-blur': '0px',
                '--chorus-backdrop-scale': '1',
                '--chorus-backdrop-dim': 'transparent'
            }
        case 'image':
            return {
                '--chorus-backdrop-image': ctx.imageUrl ? cssUrl(ctx.imageUrl) : 'none',
                '--chorus-backdrop-size':
                    backdrop.fit === 'tile'
                        ? 'auto'
                        : backdrop.fit === 'contain'
                          ? 'contain'
                          : 'cover',
                '--chorus-backdrop-position': anchorPosition(backdrop.anchor),
                '--chorus-backdrop-repeat': backdrop.fit === 'tile' ? 'repeat' : 'no-repeat',
                // A video loop cannot tile; it fills the window instead.
                '--chorus-backdrop-fit': backdrop.fit === 'contain' ? 'contain' : 'cover',
                '--chorus-backdrop-filter': filterCss(backdrop.blur, backdrop.saturate),
                '--chorus-backdrop-blur': `${Math.round(backdrop.blur)}px`,
                '--chorus-backdrop-scale': '1',
                '--chorus-backdrop-dim': dimColour(backdrop.dim, backdrop.tint, ctx.frame, ctx.mode)
            }
        case 'cover':
            return {
                '--chorus-backdrop-image': ctx.imageUrl ? cssUrl(ctx.imageUrl) : 'none',
                '--chorus-backdrop-size': 'cover',
                '--chorus-backdrop-position': 'center',
                '--chorus-backdrop-repeat': 'no-repeat',
                '--chorus-backdrop-filter': filterCss(backdrop.blur, 120),
                '--chorus-backdrop-blur': `${Math.round(backdrop.blur)}px`,
                '--chorus-backdrop-scale': (backdrop.zoom / 100).toFixed(2),
                '--chorus-backdrop-dim': dimColour(backdrop.dim, true, ctx.frame, ctx.mode)
            }
    }
}

/** Every property `backdropVariables` can write, so clearing a backdrop leaves none behind. */
export const BACKDROP_PROPERTIES = [
    '--chorus-backdrop-image',
    '--chorus-backdrop-size',
    '--chorus-backdrop-position',
    '--chorus-backdrop-repeat',
    '--chorus-backdrop-fit',
    '--chorus-backdrop-filter',
    '--chorus-backdrop-blur',
    '--chorus-backdrop-scale',
    '--chorus-backdrop-dim',
    '--chorus-panel-alpha'
] as const
