/**
 * Palettes for a person's own looks.
 *
 * `derivePalette` turns two colours (a base and an accent, plus an optional
 * text colour) into the fifteen slots theming.ts writes as `--chorus-*`, with
 * the same shape the built-in palettes have: the base is the main surface,
 * the sidebar a touch darker, the card and hover steps lighter, the frame
 * (the `shadow` slot) a clear step above the card so the controls on it still
 * read, and every colour that carries text or marks a control walked in
 * lightness until it clears WCAG contrast on the surface it sits on. A base
 * lighter than mid-grey runs the ladder the other way, so a light look works
 * in the dark appearance too; the light appearance still inverts whatever
 * comes out, as it does for the built-ins.
 *
 * The fifteen slot names are Spicetify's colour-scheme keys one for one, so a
 * community `color.ini` pastes straight in and a look exports back out as one.
 *
 * Pure maths; no DOM, no stores.
 */
import type { CSSVariable } from '$lib/utils/theming'
import { contrastRatio, hexToHsl, hslToHex, mixHex, pickSwatch, type Swatch } from './popup-palette'
import type { Mode } from './theme-surfaces'

export type ColourSeed = { base: string; accent: string; text?: string }

const TEXT_CONTRAST = 4.5
const CONTROL_CONTRAST = 3
/** A base at or below this lightness is a dark page; above it, a light one. */
const DARK_BASE_LIGHTNESS_MAX = 50
/** Grey text takes a hint of the base's hue, not the full tint. */
const TEXT_SATURATION_MAX = 12
const TEXT_LIGHTNESS = { dark: 96, light: 12 }
/** Secondary text: how much of the text colour shows over the base. */
const SUBTEXT_MIX = 0.7
const LIGHTNESS_STEP = 0.5
/** Steps from the base, in lightness points: towards white on a dark base, towards black on a light one. */
const DARK_LADDER = { sidebar: -2, card: 8, hover: 16, frame: 13 }
/** The light ladder darkens the panels and lightens the frame, as invertPalette does. */
const LIGHT_LADDER = { sidebar: -4, card: -10, hover: -16, frame: 6 }
const ACTIVE_ACCENT_STEP = 4
const ERROR_RED = '#e22134'

/** `#abc`, `abc`, `#aabbcc` or `aabbcc` → `#aabbcc`; null for anything else. */
export function normaliseHex(input: string | null | undefined): string | null {
    if (!input) return null
    const hex = input.trim().replace(/^#/, '').toLowerCase()
    if (/^[0-9a-f]{6}$/.test(hex)) return `#${hex}`
    if (/^[0-9a-f]{3}$/.test(hex)) return `#${hex.replace(/./g, (c) => c + c)}`
    return null
}

const clamp = (value: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, value))

/**
 * Walks a colour's lightness away from the surface, up on a dark one and down
 * on a light one, until it clears the wanted contrast there.
 */
function fit(hex: string, on: string, wanted: number, dark: boolean): string {
    const [h, s, l] = hexToHsl(hex)
    let lightness = l
    let out = hslToHex(h, s, lightness)
    const step = dark ? LIGHTNESS_STEP : -LIGHTNESS_STEP
    // Room to move: up on a dark surface, down on a light one (a pure white
    // accent on a white base still has to walk down).
    while (contrastRatio(on, out) < wanted && (dark ? lightness < 100 : lightness > 0)) {
        lightness = clamp(lightness + step)
        out = hslToHex(h, s, lightness)
    }
    return out
}

function shift(hex: string, delta: number): string {
    const [h, s, l] = hexToHsl(hex)
    return hslToHex(h, s, clamp(l + delta))
}

export function derivePalette(seed: ColourSeed): Record<CSSVariable, string> {
    const main = normaliseHex(seed.base) ?? '#121212'
    const accent = normaliseHex(seed.accent) ?? '#1ed760'
    const [h, s, l] = hexToHsl(main)
    const dark = l <= DARK_BASE_LIGHTNESS_MAX
    const ladder = dark ? DARK_LADDER : LIGHT_LADDER

    const sidebar = shift(main, ladder.sidebar)
    const card = shift(main, ladder.card)
    const hover = shift(main, ladder.hover)
    const frame = shift(main, ladder.frame)

    // Text: the given colour, else a near-white (or near-black) in the base's
    // hue, and in either case lifted until it reads on the hover colour, the
    // brightest surface a row's text sits on.
    const textSeed =
        normaliseHex(seed.text) ??
        hslToHex(
            h,
            Math.min(s, TEXT_SATURATION_MAX),
            dark ? TEXT_LIGHTNESS.dark : TEXT_LIGHTNESS.light
        )
    const text = fit(textSeed, hover, TEXT_CONTRAST, dark)
    const subtext = fit(mixHex(text, main, SUBTEXT_MIX), hover, TEXT_CONTRAST, dark)

    // The accent marks controls on a dark page (3:1) and doubles as text on a
    // light one (4.5:1), as invertPalette treats it.
    const button = fit(accent, main, dark ? CONTROL_CONTRAST : TEXT_CONTRAST, dark)
    const buttonActive = shift(button, dark ? ACTIVE_ACCENT_STEP : -ACTIVE_ACCENT_STEP)

    return {
        text,
        subtext,
        main,
        sidebar,
        player: main,
        card,
        // The frame and the text on accent fills; theme-surfaces keeps it clear of the card.
        shadow: frame,
        selected_row: button,
        button,
        button_active: buttonActive,
        button_disabled: hover,
        tab_active: fit(accent, main, CONTROL_CONTRAST, dark),
        notification: card,
        notification_error: fit(ERROR_RED, main, CONTROL_CONTRAST, dark),
        misc: main
    }
}

// ---- Spicetify colour schemes -----------------------------------------------

/** Spicetify's `color.ini` keys → the palette slots. Keys it has that Chorus derives itself are dropped. */
const SPICETIFY_KEYS: Record<string, CSSVariable> = {
    text: 'text',
    subtext: 'subtext',
    main: 'main',
    sidebar: 'sidebar',
    player: 'player',
    card: 'card',
    shadow: 'shadow',
    'selected-row': 'selected_row',
    button: 'button',
    'button-active': 'button_active',
    'button-disabled': 'button_disabled',
    'tab-active': 'tab_active',
    notification: 'notification',
    'notification-error': 'notification_error',
    misc: 'misc'
}

const SLOT_TO_SPICETIFY = Object.fromEntries(
    Object.entries(SPICETIFY_KEYS).map(([key, slot]) => [slot, key])
) as Record<CSSVariable, string>

export type SpicetifyScheme = { name: string; colours: Partial<Record<CSSVariable, string>> }

/**
 * Every `[Scheme]` section of a Spicetify `color.ini`, in file order. Values
 * may be bare hex (`1ed760`) or prefixed; anything else is skipped. A file
 * with keys but no section header is one unnamed scheme.
 */
export function parseSpicetifyIni(text: string): SpicetifyScheme[] {
    const schemes: SpicetifyScheme[] = []
    let current: SpicetifyScheme | null = null
    for (const raw of text.split(/\r?\n/)) {
        // Whole-line comments start with `;` or `#`; inline ones only with `;`,
        // since a value may well be written `#1ed760`.
        const line = raw
            .replace(/^\s*[;#].*$/, '')
            .replace(/\s;.*$/, '')
            .trim()
        if (!line) continue
        const section = /^\[(.+)\]$/.exec(line)
        if (section) {
            current = { name: section[1].trim(), colours: {} }
            schemes.push(current)
            continue
        }
        const pair = /^([a-z-]+)\s*=\s*(.+)$/i.exec(line)
        if (!pair) continue
        const slot = SPICETIFY_KEYS[pair[1].toLowerCase()]
        const hex = normaliseHex(pair[2])
        if (!slot || !hex) continue
        if (!current) {
            current = { name: 'Imported', colours: {} }
            schemes.push(current)
        }
        current.colours[slot] = hex
    }
    return schemes.filter((scheme) => Object.keys(scheme.colours).length > 0)
}

/**
 * A full palette from a partial one: whatever slots are missing are derived
 * from the main and button colours (or Spotify's, when those are missing too).
 */
export function completePalette(
    partial: Partial<Record<CSSVariable, string>>
): Record<CSSVariable, string> {
    const derived = derivePalette({
        base: partial.main ?? '#121212',
        accent: partial.button ?? partial.selected_row ?? '#1ed760',
        text: partial.text
    })
    const out = { ...derived }
    for (const [slot, hex] of Object.entries(partial)) {
        const clean = normaliseHex(hex)
        if (clean) out[slot as CSSVariable] = clean
    }
    return out
}

/** One `[name]` section in Spicetify's `color.ini` form, values without `#`. */
export function toSpicetifyIni(name: string, colours: Record<CSSVariable, string>): string {
    const lines = [`[${name}]`]
    for (const slot of Object.keys(SLOT_TO_SPICETIFY) as CSSVariable[]) {
        const hex = normaliseHex(colours[slot])
        if (hex) lines.push(`${SLOT_TO_SPICETIFY[slot]} = ${hex.slice(1)}`)
    }
    return lines.join('\n')
}

// ---- Seeds from an image ----------------------------------------------------

const SEED_BASE: Record<Mode, { lightness: number; saturationMax: number }> = {
    dark: { lightness: 13, saturationMax: 45 },
    light: { lightness: 86, saturationMax: 55 }
}
const SEED_ACCENT_SATURATION_MIN = 45
const SEED_ACCENT_LIGHTNESS = 62

/**
 * The palette a look whose palette follows the music takes from a cover: the
 * Match-palette seed, always as a dark page (the light appearance inverts it
 * like any other palette). Null for a cover with no swatches at all.
 */
export function paletteFromSwatches(swatches: Swatch[]): Record<CSSVariable, string> | null {
    const seed = seedFromSwatches(swatches, 'dark')
    return seed ? derivePalette(seed) : null
}

/**
 * A base and an accent from an image's swatches ("Match to backdrop"): the
 * most populous swatch gives the base its hue, deepened (or paled, in light)
 * to a surface; the most populous coloured swatch is the accent. Null when
 * the image offers no swatches at all.
 */
export function seedFromSwatches(swatches: Swatch[], mode: Mode): ColourSeed | null {
    if (!swatches.length) return null
    const dominant = [...swatches].sort((a, b) => b.population - a.population)[0]
    const [bh, bs] = hexToHsl(dominant.hex)
    const base = hslToHex(
        bh,
        Math.min(bs, SEED_BASE[mode].saturationMax),
        SEED_BASE[mode].lightness
    )
    const coloured = pickSwatch(swatches) ?? dominant
    const [ah, as, al] = hexToHsl(coloured.hex)
    const accent = hslToHex(
        ah,
        Math.max(as, SEED_ACCENT_SATURATION_MIN),
        as < SEED_ACCENT_SATURATION_MIN ? SEED_ACCENT_LIGHTNESS : al
    )
    return { base, accent }
}
