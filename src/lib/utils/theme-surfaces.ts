// Derives the Chorus "studio rack" tokens from a Spotify theme palette.
//
// The rack keeps its own lightness ladder (ink → panel → surface → surface-2,
// inset below) so hover, inset and panel steps stay distinguishable on dark and
// bright themes alike, and only borrows the theme's hue and saturation. Spotify
// green stays the signal colour on rack surfaces, where it always clears 9:1.
// The controls grafted into Spotify's player bar sit on the theme's own colour,
// so they read a separate `--bar-signal` that falls back to the theme's accent
// when green can't reach 3:1 there.
//
// Pure module: theming.ts is imported by the background worker, so no DOM or
// store imports here.

export type ThemeSurfaceSource = {
    main: string
    player: string
    text: string
    button: string
}

const SIGNAL_GREEN = '#1ed760'

/** Lightness (%) of each rack surface; mirrors the defaults in app.css. */
const SURFACE_LIGHTNESS: Record<string, number> = {
    ink: 7,
    panel: 9.4,
    surface: 12.2,
    'surface-2': 16.5,
    inset: 3.9
}

/** Lightness of the secondary text greys. `--ink-fg` stays pure white. */
const TEXT_LIGHTNESS: Record<string, number> = {
    'ink-fg-2': 86.3,
    'ink-muted': 70.2,
    'ink-dim': 49.8
}

/** Saturation caps: loud themes should tint the rack, not turn it neon. */
const SURFACE_SATURATION_MAX = 50
const TEXT_SATURATION_MAX = 12

function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '')
    const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h
    const n = parseInt(full, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Hue in degrees, saturation and lightness in percent. */
function hexToHsl(hex: string): [number, number, number] {
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

function channel(c: number) {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

function luminance(hex: string): number {
    const [r, g, b] = hexToRgb(hex)
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a: string, b: string): number {
    const la = luminance(a)
    const lb = luminance(b)
    const [hi, lo] = la > lb ? [la, lb] : [lb, la]
    return (hi + 0.05) / (lo + 0.05)
}

/** `h s% l%`, the triplet form app.css consumes via hsl(var(--x) / a). */
function triplet(h: number, s: number, l: number): string {
    const r1 = (n: number) => Math.round(n * 10) / 10
    return `${Math.round(h)} ${r1(s)}% ${r1(l)}%`
}

function hexToTriplet(hex: string): string {
    return triplet(...hexToHsl(hex))
}

/**
 * Colour for active states on the themed player bar: green when it clears 3:1,
 * else the theme's own accent, else whichever of white / near-black reads best.
 */
export function barSignal({ player, text, button }: ThemeSurfaceSource): string {
    if (contrast(player, SIGNAL_GREEN) >= 3) return SIGNAL_GREEN
    if (contrast(player, button) >= 3) return button
    if (contrast(player, text) >= 3) return text
    return contrast(player, '#ffffff') >= contrast(player, '#121212') ? '#ffffff' : '#121212'
}

/** Token name (without the leading `--`) → HSL triplet. */
export function deriveThemeSurfaces(theme: ThemeSurfaceSource): Record<string, string> {
    const [hue, saturation] = hexToHsl(theme.main)
    const surfaceSat = Math.min(saturation, SURFACE_SATURATION_MAX)
    const textSat = Math.min(saturation, TEXT_SATURATION_MAX)

    const vars: Record<string, string> = {}
    for (const [name, l] of Object.entries(SURFACE_LIGHTNESS)) {
        vars[name] = triplet(hue, surfaceSat, l)
    }
    for (const [name, l] of Object.entries(TEXT_LIGHTNESS)) {
        vars[name] = triplet(hue, textSat, l)
    }
    // Hairline borders sit at the surface-2 step, like the default.
    vars.border = vars['surface-2']
    vars['bar-signal'] = hexToTriplet(barSignal(theme))
    return vars
}

export function applyThemeSurfaces(root: HTMLElement, theme: ThemeSurfaceSource): void {
    for (const [name, value] of Object.entries(deriveThemeSurfaces(theme))) {
        root.style.setProperty(`--${name}`, value)
    }
}
