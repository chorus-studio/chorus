/**
 * Colours for the toolbar popup and the PiP player when they wear the cover
 * art ("Popup: Album" in the Theme tab).
 *
 * One swatch of the album palette gives the hue and the appearance setting
 * gives the lightness, so the popup reads dark or light like the rest of
 * Chorus while keeping the record's tint, and every result clears WCAG
 * contrast: text at 4.5:1, the accent at 3:1. A cover without a usable
 * colour yields nothing, and the popup wears the theme's rack tokens instead
 * (vibrant-colors.ts). Pure maths; vibrant-colors.ts feeds it swatches and
 * paints the result.
 */
import type { Mode } from '$lib/utils/theme-surfaces'

export type Swatch = { hex: string; population: number }

export type PopupPalette = {
    /** Panel background. */
    bg: string
    /** Primary text and icons, at least 4.5:1 on `bg`. */
    text: string
    /** Secondary text (artist, times). */
    text2: string
    /** Active states (snip ranges, loop), at least 3:1 on `bg`. */
    accent: string
}

type Rgb = [number, number, number]
/** Hue in degrees, saturation and lightness in percent. */
type Hsl = [number, number, number]

const TEXT_CONTRAST = 4.5
const ACCENT_CONTRAST = 3
/** Swatches this grey or greyer carry no hue the popup could wear. */
const GREY_SATURATION_MAX = 18
/** A colour has to cover this share of the sampled pixels to tint the popup. */
const TINT_SHARE_MIN = 0.05
/** How much of the text shows in the secondary text colour. */
const TEXT2_MIX = 0.72
const LIGHTNESS_STEP = 1

const BG: Record<Mode, { lightness: number; saturationMax: number }> = {
    dark: { lightness: 12, saturationMax: 45 },
    light: { lightness: 95, saturationMax: 55 }
}
const TEXT: Record<Mode, { lightness: number; saturationMax: number }> = {
    dark: { lightness: 92, saturationMax: 35 },
    light: { lightness: 14, saturationMax: 40 }
}
/** Pastel accents at full saturation go neon on a light panel. */
const ACCENT_SATURATION_MAX: Record<Mode, number> = { dark: 100, light: 80 }

/** Accepts 3- and 6-digit hex; node-vibrant hands out `#fff` / `#000`. */
export function hexToRgb(hex: string): Rgb {
    const h = hex.trim().replace('#', '')
    const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h.slice(0, 6)
    const n = parseInt(full, 16)
    if (Number.isNaN(n)) return [0, 0, 0]
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex([r, g, b]: Rgb): string {
    return (
        '#' +
        [r, g, b]
            .map((v) =>
                Math.round(Math.min(255, Math.max(0, v)))
                    .toString(16)
                    .padStart(2, '0')
            )
            .join('')
    )
}

export function hexToHsl(hex: string): Hsl {
    const [r, g, b] = hexToRgb(hex).map((c) => c / 255)
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2
    if (max === min) return [0, 0, l * 100]
    const d = max - min
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    let h: number
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    return [h * 60, s * 100, l * 100]
}

function hslToRgb(h: number, s: number, l: number): Rgb {
    const sat = Math.min(100, Math.max(0, s)) / 100
    const light = Math.min(100, Math.max(0, l)) / 100
    const c = (1 - Math.abs(2 * light - 1)) * sat
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = light - c / 2
    const sector = Math.floor((((h % 360) + 360) % 360) / 60) % 6
    const [r, g, b] = [
        [c, x, 0],
        [x, c, 0],
        [0, c, x],
        [0, x, c],
        [x, 0, c],
        [c, 0, x]
    ][sector]
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

export function hslToHex(h: number, s: number, l: number): string {
    return rgbToHex(hslToRgb(h, s, l))
}

function channel(c: number) {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(hex: string): number {
    const [r, g, b] = hexToRgb(hex)
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG contrast ratio between two hex colours (1..21). */
export function contrastRatio(a: string, b: string): number {
    const la = relativeLuminance(a)
    const lb = relativeLuminance(b)
    const [hi, lo] = la > lb ? [la, lb] : [lb, la]
    return (hi + 0.05) / (lo + 0.05)
}

/** `candidate` when it clears 4.5:1 on `bg`, else white or near-black, whichever reads better. */
export function readableText(bg: string, candidate: string | null | undefined): string {
    if (candidate && contrastRatio(bg, candidate) >= TEXT_CONTRAST) return candidate
    return contrastRatio(bg, '#ffffff') >= contrastRatio(bg, '#121212') ? '#ffffff' : '#121212'
}

/** `fg` at `alpha` over `bg`, as a hex colour. */
export function mixHex(fg: string, bg: string, alpha: number): string {
    const f = hexToRgb(fg)
    const b = hexToRgb(bg)
    return rgbToHex(f.map((c, i) => c * alpha + b[i] * (1 - alpha)) as Rgb)
}

/**
 * The swatch that gives the popup its hue: the most populous coloured one
 * that covers enough of the image. Null for a grey cover or a speck of colour.
 */
export function pickSwatch(swatches: Swatch[]): Swatch | null {
    if (!swatches.length) return null
    const byPopulation = [...swatches].sort((a, b) => b.population - a.population)
    const total = swatches.reduce((sum, s) => sum + s.population, 0)
    return (
        byPopulation.find(
            (s) =>
                hexToHsl(s.hex)[1] > GREY_SATURATION_MAX && s.population >= total * TINT_SHARE_MIN
        ) ?? null
    )
}

/** Walks a colour's lightness, up on a dark panel and down on a light one, until it clears `wanted` on `bg`. */
function fitLightness([h, s, l]: Hsl, bg: string, wanted: number, mode: Mode): string {
    const step = mode === 'light' ? -LIGHTNESS_STEP : LIGHTNESS_STEP
    let lightness = l
    let hex = hslToHex(h, s, lightness)
    while (contrastRatio(bg, hex) < wanted && lightness > 0 && lightness < 100) {
        lightness += step
        hex = hslToHex(h, s, lightness)
    }
    return hex
}

/** The popup palette for a cover, or null when the cover has no colour to wear. */
export function derivePopupPalette(swatches: Swatch[], mode: Mode): PopupPalette | null {
    const key = pickSwatch(swatches)
    if (!key) return null
    const [hue, saturation, lightness] = hexToHsl(key.hex)

    const bg = hslToHex(hue, Math.min(saturation, BG[mode].saturationMax), BG[mode].lightness)

    let text = hslToHex(hue, Math.min(saturation, TEXT[mode].saturationMax), TEXT[mode].lightness)
    if (contrastRatio(bg, text) < TEXT_CONTRAST) text = readableText(bg, null)

    const text2 = mixHex(text, bg, TEXT2_MIX)

    // The cover's own colour marks active states, walked in lightness until it reads on the panel.
    let accent = fitLightness(
        [hue, Math.min(saturation, ACCENT_SATURATION_MAX[mode]), lightness],
        bg,
        ACCENT_CONTRAST,
        mode
    )
    if (contrastRatio(bg, accent) < ACCENT_CONTRAST) accent = text

    return { bg, text, text2, accent }
}
