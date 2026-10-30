// Derives the Chorus "studio rack" tokens from a Spotify theme palette.
//
// Surfaces take the theme's hue and saturation and sit a step apart from the
// page so a popover always separates from what it floats over: lighter on dark
// pages (as Spotify's own elevated surfaces are), darker on brighter ones, and
// capped by luminance so white text keeps reading. The other surfaces keep
// their fixed steps around `ink` (panel → surface → surface-2 above, inset
// below). The signal colour becomes the palette's own accent, the colour
// Spotify's play and like controls take under that theme, lifted until it
// reads as a control and as text on the rack; the player-bar controls read the
// same accent through `--bar-signal`, checked against the bar's own colour.
// Text and secondary accent tokens start from the app.css defaults and are
// lifted until they clear WCAG contrast on the surface they usually sit on.
//
// Light mode runs the same ladder upward: a near-white `ink` tinted with the
// palette's hue, panels stepping darker, near-black text, and every accent
// DARKENED until it clears contrast instead of lifted. `invertPalette` builds
// the matching light page palette so the Spotify re-skin and the rack agree.
//
// Pure module: theming.ts is imported by the background worker, so no DOM or
// store imports here.

export type ThemeSurfaceSource = {
    main: string
    player: string
    card: string
    shadow: string
    text: string
    button: string
}

export type Mode = 'dark' | 'light'

/** The page palette keys theming.ts writes as `--chorus-*`; all hex colours. */
export type PagePalette = {
    text: string
    subtext: string
    main: string
    sidebar: string
    player: string
    card: string
    shadow: string
    selected_row: string
    button: string
    button_active: string
    button_disabled: string
    tab_active: string
    notification: string
    notification_error: string
    misc: string
}

/** Lightness of each rack surface relative to `ink`; mirrors the defaults in app.css. */
const SURFACE_STEP: Record<string, number> = {
    ink: 0,
    panel: 2.4,
    surface: 5.2,
    'surface-2': 9.5,
    inset: -3.1
}

/** Light mode mirrors the ladder: panels step darker than `ink`, inset lighter. */
const LIGHT_SURFACE_STEP: Record<string, number> = {
    ink: 0,
    panel: -2.4,
    surface: -5.2,
    'surface-2': -9.5,
    inset: 3
}

/**
 * Secondary text greys: default lightness (app.css), the surface they must
 * read on and the contrast they need there. `--ink-fg` stays pure white.
 */
const TEXT_TOKENS: Record<string, { lightness: number; on: string; contrast: number }> = {
    'ink-fg-2': { lightness: 86.3, on: 'surface-2', contrast: 4.5 },
    'ink-muted': { lightness: 70.2, on: 'surface', contrast: 4.5 },
    // disabled / placeholder text and quiet icons: non-text contrast
    'ink-dim': { lightness: 49.8, on: 'surface-2', contrast: 3 }
}

/** Light-mode greys start dark and are darkened further if they must. */
const LIGHT_TEXT_TOKENS: Record<string, { lightness: number; on: string; contrast: number }> = {
    'ink-fg-2': { lightness: 28, on: 'surface-2', contrast: 4.5 },
    'ink-muted': { lightness: 42, on: 'surface', contrast: 4.5 },
    'ink-dim': { lightness: 60, on: 'surface-2', contrast: 3 }
}

/** Secondary accents used as small text (app.css defaults), lifted until they read on `surface`. */
const ACCENT_TOKENS: Record<string, [number, number, number]> = {
    amber: [34, 100, 58],
    alarm: [354, 84, 66]
}
const TEXT_CONTRAST = 4.5
/** Non-text contrast for controls, icons and focus rings. */
const CONTROL_CONTRAST = 3
/** Pressed state of the accent sits this much below it. */
const SIGNAL_DARK_DROP = 10

/** Grey text takes a hint of the theme's hue, not the full tint. */
const TEXT_SATURATION_MAX = 12

/** The default rack's `ink` lightness (app.css), which the text greys are tuned for. */
const DEFAULT_INK_LIGHTNESS = 7
/** Pages at or below this lightness get a lighter rack; brighter pages a darker one. */
const DARK_PAGE_LIGHTNESS_MAX = 15
const INK_LIFT_ON_DARK_PAGE = 7
const INK_DROP_ON_BRIGHT_PAGE = 9
const INK_LIGHTNESS_MIN = 5
/** Ceiling on `ink`'s relative luminance: keeps white text at 7:1 or better on the rack's base surface. */
const INK_LUMINANCE_MAX = 0.1
/** How much the text greys brighten per point of `ink` lightness above the default. */
const TEXT_LIFT_PER_POINT = 0.4
const LIGHTNESS_STEP = 0.5
const LIGHTNESS_MAX = 96
const LIGHTNESS_MIN = 0
/** Lifts aim slightly past the target so the rounded triplet still clears it. */
const CONTRAST_MARGIN = 0.05

/**
 * Light rack: a pastel base in the palette's hue, a clear step lighter than
 * the light page's panels (LIGHT_PAGE.main) so a dialog still floats, but far
 * enough from white to read as the theme (an earlier 96 / 35 read as white).
 */
const LIGHT_INK_LIGHTNESS = 91
const LIGHT_RACK_SATURATION_MAX = 60
const LIGHT_INK_FG_LIGHTNESS = 10
/** Pastel accents darkened at full saturation turn neon; rein them in first. */
const LIGHT_SIGNAL_SATURATION_MAX = 80
/** Light-mode shadows are dark and soft rather than near-black and heavy. */
const LIGHT_SHADOW = '0 0% 10%'
const LIGHT_SHADOW_ALPHA = '0.35'
const DARK_SHADOW_ALPHA = '0.9'

/**
 * Light page palette: lightness of each page surface. The page keeps the
 * palette's saturation (capped) and sits in the low 80s, so it reads as a
 * pastel of the theme (sky blue for artic, bubblegum for hot_pink) rather
 * than as white with an accent; an earlier ladder in the mid 90s did read as
 * white. The dark palettes sit at 10-40% lightness at full chroma, and this
 * ladder mirrors that from the other end: panels, then the elevated step
 * below them, then the hover step, with the frame the lightest so the panels
 * float on it.
 */
const LIGHT_PAGE = {
    saturationMax: 90,
    textSaturationMax: 70,
    subtextSaturationMax: 50,
    main: 84,
    sidebar: 80,
    /** Spotify's #181818 surfaces; the frame itself is `shadow`, see `frameColor`. */
    player: 92,
    /** Elevated controls (the search field, menus): a clear step below the panels. */
    card: 74,
    /** Hover fallback, scrollbar handle and seek-bar track: a step below that. */
    hover: 68,
    /** Paints the app frame (the lightest step, so the panels and bars float on it) and the text on accent fills. */
    shadow: 92,
    text: 13,
    subtext: 36
}

/**
 * The frame keeps at least this many lightness points from `card`, the colour
 * of the elevated controls that sit on it (the search field, the top bar's
 * buttons), so they read as insets rather than vanish.
 */
const FRAME_CARD_GAP = 5

type Rgb = [number, number, number]
type Hsl = [number, number, number]

function hexToRgb(hex: string): Rgb {
    const h = hex.replace('#', '')
    const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h
    const n = parseInt(full, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex([r, g, b]: Rgb): string {
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

/** Hue in degrees, saturation and lightness in percent. */
function hexToHsl(hex: string): Hsl {
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
    const sat = s / 100
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

function hslToHex(h: number, s: number, l: number): string {
    return rgbToHex(hslToRgb(h, s, l))
}

function channel(c: number) {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

function luminance([r, g, b]: Rgb): number {
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrastRgb(a: Rgb, b: Rgb): number {
    const la = luminance(a)
    const lb = luminance(b)
    const [hi, lo] = la > lb ? [la, lb] : [lb, la]
    return (hi + 0.05) / (lo + 0.05)
}

function contrast(a: string, b: string): number {
    return contrastRgb(hexToRgb(a), hexToRgb(b))
}

/** `h s% l%`, the triplet form app.css consumes via hsl(var(--x) / a). */
function triplet(h: number, s: number, l: number): string {
    const r1 = (n: number) => Math.round(n * 10) / 10
    return `${Math.round(h)} ${r1(s)}% ${r1(Math.min(100, Math.max(0, l)))}%`
}

function hexToTriplet(hex: string): string {
    return triplet(...hexToHsl(hex))
}

/** Raises a colour's lightness until it reaches the wanted contrast on `against`. */
function liftLightness([h, s, l]: Hsl, against: Rgb, wanted: number): number {
    let lifted = l
    while (
        lifted < LIGHTNESS_MAX &&
        contrastRgb(hslToRgb(h, s, lifted), against) < wanted + CONTRAST_MARGIN
    ) {
        lifted += LIGHTNESS_STEP
    }
    return lifted
}

/** Lowers a colour's lightness until it reaches the wanted contrast on `against`. */
function dropLightness([h, s, l]: Hsl, against: Rgb, wanted: number): number {
    let dropped = l
    while (
        dropped > LIGHTNESS_MIN &&
        contrastRgb(hslToRgb(h, s, dropped), against) < wanted + CONTRAST_MARGIN
    ) {
        dropped -= LIGHTNESS_STEP
    }
    return dropped
}

/** Lift on a dark surface, drop on a light one. */
function fitLightness(hsl: Hsl, against: Rgb, wanted: number, mode: Mode): number {
    return mode === 'light'
        ? dropLightness(hsl, against, wanted)
        : liftLightness(hsl, against, wanted)
}

/**
 * Colour of the app frame: the page behind Spotify's panels, seen in the gaps
 * between them and around the top bar and the player bar (theme.css paints
 * those two as panels of `main`). It is the palette's `shadow`, the slot that
 * painted the frame before the rewrite split black into frame and text, so
 * the page keeps the tint each palette chose for it; where `shadow` coincides
 * with `card` (most palettes) the frame moves a half step lighter so anything
 * in the card colour still reads on it. `player` is not used: most palettes
 * set it equal to `main`, which left frame and panels one colour, and a step
 * darker than a near-black `main` reads as plain black rather than as the theme.
 */
export function frameColor({ card, shadow }: Pick<ThemeSurfaceSource, 'card' | 'shadow'>): string {
    const [h, s, l] = hexToHsl(shadow)
    const cardLightness = hexToHsl(card)[2]
    if (Math.abs(l - cardLightness) >= FRAME_CARD_GAP) return shadow
    return hslToHex(h, s, cardLightness + FRAME_CARD_GAP)
}

/**
 * Colour for active states on the themed player bar: the palette's accent,
 * lifted (or, on a light bar, darkened) if it has to be, else the theme's
 * text, else whichever of white / near-black reads best. theme.css paints the
 * bar as a panel of `main`, so that is what the accent is checked against.
 */
export function barSignal(theme: ThemeSurfaceSource, mode: Mode = 'dark'): string {
    const { text, button } = theme
    const player = theme.main
    const bar = hexToRgb(player)
    const [h, s0, l] = hexToHsl(button)
    const s = mode === 'light' ? Math.min(s0, LIGHT_SIGNAL_SATURATION_MAX) : s0
    const accent = hslToRgb(h, s, fitLightness([h, s, l], bar, CONTROL_CONTRAST, mode))
    if (contrastRgb(accent, bar) >= CONTROL_CONTRAST) return rgbToHex(accent)
    if (contrast(player, text) >= CONTROL_CONTRAST) return text
    return contrast(player, '#ffffff') >= contrast(player, '#121212') ? '#ffffff' : '#121212'
}

/**
 * Lightness of the rack's base surface for a theme: a step lighter than a dark
 * page, a step darker than a brighter one, walked down until white text clears
 * the luminance ceiling.
 */
function inkLightness(hue: number, saturation: number, pageLightness: number): number {
    const offset =
        pageLightness <= DARK_PAGE_LIGHTNESS_MAX ? INK_LIFT_ON_DARK_PAGE : -INK_DROP_ON_BRIGHT_PAGE
    let l = Math.max(INK_LIGHTNESS_MIN, pageLightness + offset)
    while (l > INK_LIGHTNESS_MIN && luminance(hslToRgb(hue, saturation, l)) > INK_LUMINANCE_MAX) {
        l -= LIGHTNESS_STEP
    }
    return l
}

/** Every token `deriveThemeSurfaces` writes, so a mode switch never leaves a stale one behind. */
export const RACK_TOKENS = [
    'ink',
    'panel',
    'surface',
    'surface-2',
    'inset',
    'ink-fg',
    'ink-fg-2',
    'ink-muted',
    'ink-dim',
    'amber',
    'alarm',
    'signal',
    'signal-bright',
    'signal-dark',
    'signal-fg',
    'border',
    'bar-signal',
    'shadow',
    'shadow-alpha'
] as const

/** Token name (without the leading `--`) → HSL triplet. */
export function deriveThemeSurfaces(
    theme: ThemeSurfaceSource,
    mode: Mode = 'dark'
): Record<string, string> {
    const [hue, saturation0, lightness] = hexToHsl(theme.main)
    const light = mode === 'light'
    const saturation = light ? Math.min(saturation0, LIGHT_RACK_SATURATION_MAX) : saturation0
    const ink = light ? LIGHT_INK_LIGHTNESS : inkLightness(hue, saturation, lightness)
    const textSat = Math.min(saturation0, TEXT_SATURATION_MAX)
    // A brighter dark rack needs brighter greys to keep the same separation from it.
    const textLift = light ? 0 : Math.max(0, ink - DEFAULT_INK_LIGHTNESS) * TEXT_LIFT_PER_POINT

    const vars: Record<string, string> = {}
    const surfaces: Record<string, Rgb> = {}
    const steps = light ? LIGHT_SURFACE_STEP : SURFACE_STEP
    for (const [name, step] of Object.entries(steps)) {
        surfaces[name] = hslToRgb(hue, saturation, ink + step)
        vars[name] = triplet(hue, saturation, ink + step)
    }
    vars['ink-fg'] = light ? triplet(hue, textSat, LIGHT_INK_FG_LIGHTNESS) : '0 0% 100%'
    const textTokens = light ? LIGHT_TEXT_TOKENS : TEXT_TOKENS
    for (const [name, { lightness: l, on, contrast: wanted }] of Object.entries(textTokens)) {
        const fitted = fitLightness([hue, textSat, l + textLift], surfaces[on], wanted, mode)
        vars[name] = triplet(hue, textSat, fitted)
    }
    for (const [name, [h, s, l]] of Object.entries(ACCENT_TOKENS)) {
        vars[name] = triplet(h, s, fitLightness([h, s, l], surfaces.surface, TEXT_CONTRAST, mode))
    }

    // The palette's accent is the signal: as a control on `surface`, as text, and pressed.
    // In light mode the control level targets text contrast too, so the rack's
    // light `ink` text keeps reading on signal-filled buttons.
    const [ah, as0, al] = hexToHsl(theme.button)
    const as = light ? Math.min(as0, LIGHT_SIGNAL_SATURATION_MAX) : as0
    const control = fitLightness(
        [ah, as, al],
        surfaces.surface,
        light ? TEXT_CONTRAST : CONTROL_CONTRAST,
        mode
    )
    // Signal fills carry `ink` text (chips, switches, primary buttons). A
    // mid-tone accent such as raisin's orchid clears 3:1 on the surface yet
    // reads neither in light nor in dark text, so the fill moves further from
    // the surface until the ink text on it reaches text contrast as well.
    const fill = fitLightness([ah, as, control], surfaces.ink, TEXT_CONTRAST, mode)
    vars.signal = triplet(ah, as, fill)
    vars['signal-bright'] = triplet(
        ah,
        as,
        fitLightness([ah, as, al], surfaces.surface, TEXT_CONTRAST, mode)
    )
    vars['signal-dark'] = triplet(ah, as, fill - SIGNAL_DARK_DROP)
    // Text and glyphs on a solid signal fill: pure white or pure black,
    // whichever reads better on it. The pairing used to be `ink`, and a light
    // rack's ink is a pastel of the fill's own hue, so a magenta button
    // carried pink text at the 4.5:1 floor and read as faded.
    const fillRgb = hslToRgb(ah, as, fill)
    vars['signal-fg'] =
        contrastRgb(fillRgb, [255, 255, 255]) >= contrastRgb(fillRgb, [0, 0, 0])
            ? '0 0% 100%'
            : '0 0% 0%'

    // Hairline borders sit at the surface-2 step, like the default.
    vars.border = vars['surface-2']
    vars['bar-signal'] = hexToTriplet(barSignal(theme, mode))
    vars.shadow = light ? LIGHT_SHADOW : vars.ink
    vars['shadow-alpha'] = light ? LIGHT_SHADOW_ALPHA : DARK_SHADOW_ALPHA
    return vars
}

export function applyThemeSurfaces(
    root: HTMLElement,
    theme: ThemeSurfaceSource,
    mode: Mode = 'dark'
): void {
    for (const [name, value] of Object.entries(deriveThemeSurfaces(theme, mode))) {
        root.style.setProperty(`--${name}`, value)
    }
}

/** Back to the app.css defaults (the dark Spotify rack). */
export function clearThemeSurfaces(root: HTMLElement): void {
    for (const name of RACK_TOKENS) root.style.removeProperty(`--${name}`)
}

/**
 * The light version of a page palette: page surfaces become pastels of the
 * palette's hue at the palette's own saturation, text goes near-black in the
 * same hue, and the accent is darkened until it reads as text on the main
 * surface (it is used for text and fills alike). `selected_row` is the accent
 * too: the re-skin tints Spotify's hover and selection overlays with it, so a
 * hovered row darkens towards the palette's colour instead of towards white.
 * `shadow` doubles as the text colour on accent fills, so it turns light, and
 * `tab_active` (which carries it in theme.css) is the accent at control contrast.
 */
export function invertPalette<T extends PagePalette>(palette: T): T {
    const [hue, saturation0] = hexToHsl(palette.main)
    const s = Math.min(saturation0, LIGHT_PAGE.saturationMax)
    const ts = Math.min(saturation0, LIGHT_PAGE.textSaturationMax)
    const ss = Math.min(saturation0, LIGHT_PAGE.subtextSaturationMax)
    const main = hslToHex(hue, s, LIGHT_PAGE.main)
    const hover = hslToHex(hue, s, LIGHT_PAGE.hover)
    const [ah, as0, al] = hexToHsl(palette.button)
    const as = Math.min(as0, LIGHT_SIGNAL_SATURATION_MAX)
    const accent = hslToHex(ah, as, dropLightness([ah, as, al], hexToRgb(main), TEXT_CONTRAST))
    const card = hslToHex(hue, s, LIGHT_PAGE.card)
    return {
        ...palette,
        main,
        sidebar: hslToHex(hue, s, LIGHT_PAGE.sidebar),
        player: hslToHex(hue, s, LIGHT_PAGE.player),
        card,
        // The app frame (frameColor) and the text on accent fills.
        shadow: hslToHex(hue, s, LIGHT_PAGE.shadow),
        text: hslToHex(hue, ts, LIGHT_PAGE.text),
        // Secondary text sits on hovered rows too, so it is checked against the hover colour.
        subtext: hslToHex(
            hue,
            ss,
            dropLightness([hue, ss, LIGHT_PAGE.subtext], hexToRgb(hover), TEXT_CONTRAST)
        ),
        button: accent,
        button_active: accent,
        selected_row: accent,
        button_disabled: hover,
        tab_active: hslToHex(ah, as, dropLightness([ah, as, al], hexToRgb(main), CONTROL_CONTRAST)),
        notification: card,
        misc: main
    }
}
