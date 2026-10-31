// ; CHORUS THEME COLORS KEYS DESCRIPTION
// ; COLORS KEYS DESCRIPTION
// ; text               = Main field text; playlist names in main field and sidebar; headings.
// ; subtext            = Text in main sidebar buttons; playlist names in sidebar; artist names and mini infos.
// ; main               = Main field background.
// ; main-elevated      = Backgrounds for objects above the main field.
// ; highlight          = Highlight background for hovering over objects.
// ; highlight-elevated = Highlight colors for objects above the main field.
// ; sidebar            = Sidebar background.
// ; player             = Player background.
// ; card               = Card background on hover; player area outline.
// ; shadow             = Card drop shadow; button background.
// ; selected row       = Color of selected song, scrollbar, caption and playlist details, download and options buttons.
// ; button             = Playlist button background in sidebar; drop-down menus; now playing song; play button background; like button.
// ; button-active      = Active play button background.
// ; button-disabled    = Seekbar and volume bar background.
// ; tab-active         = Tabbar active item background in header.
// ; notification       = Notification toast.
// ; notification-error = Error notification toast.
// ; misc               = Miscellaneous.

import {
    applyThemeSurfaces,
    clearThemeSurfaces,
    frameColor,
    invertPalette,
    type Mode
} from './theme-surfaces'
import type { Appearance, SettingsState } from '$lib/stores/settings'
import {
    SHOW_THROUGH_DEFAULT,
    builtinLook,
    isVideoBackdrop,
    resolveShowThrough,
    type Look,
    type LooksState,
    type PaletteSource
} from '$lib/types/look'
import { completePalette, derivePalette } from './look-palette'
import { BACKDROP_PROPERTIES, backdropVariables, panelAlpha } from './backdrop-css'
import { wallpaperStill, wallpaperUrl } from './wallpapers'
import { unwatchPagePanels, watchPagePanels } from './page-panels'

export type { Mode }

export const THEME_NAMES: ThemeName[] = [
    'spotify',
    'forest_green',
    'matcha',
    'artic',
    'ocean',
    'sky',
    'cherry_blossom',
    'hot_pink',
    'raisin',
    'ubuntu',
    'regal',
    'imperial',
    'citrus',
    'lava',
    'mars',
    'desert',
    'midnight',
    'slate',
    'graphite',
    'espresso',
    'olive',
    'lagoon',
    'wine',
    'synthwave'
]

export type ThemeName =
    | 'spotify'
    | 'forest_green'
    | 'matcha'
    | 'artic'
    | 'ocean'
    | 'sky'
    | 'cherry_blossom'
    | 'hot_pink'
    | 'ubuntu'
    | 'regal'
    | 'imperial'
    | 'raisin'
    | 'lava'
    | 'mars'
    | 'citrus'
    | 'desert'
    | 'midnight'
    | 'slate'
    | 'graphite'
    | 'espresso'
    | 'olive'
    | 'lagoon'
    | 'wine'
    | 'synthwave'

export type CSSVariable =
    | 'text'
    | 'subtext'
    | 'main'
    | 'sidebar'
    | 'player'
    | 'card'
    | 'shadow'
    | 'selected_row'
    | 'button'
    | 'button_active'
    | 'button_disabled'
    | 'tab_active'
    | 'notification'
    | 'notification_error'
    | 'misc'

/**
 * Spotify's own colours in palette form. The dark default is never written to
 * the page (the `spotify` theme means "leave Spotify alone"), but light mode
 * inverts this to re-skin the page, and the rack derives from it either way.
 */
export const SPOTIFY_PALETTE: Record<CSSVariable, string> = {
    text: '#ffffff',
    subtext: '#b3b3b3',
    main: '#121212',
    sidebar: '#121212',
    player: '#181818',
    card: '#282828',
    shadow: '#000000',
    selected_row: '#1ed760',
    button: '#1ed760',
    button_active: '#1fdf64',
    button_disabled: '#535353',
    tab_active: '#333333',
    notification: '#4687d6',
    notification_error: '#e22134',
    misc: '#7f7f7f'
}

const LIGHT_QUERY = '(prefers-color-scheme: light)'

/** `system` resolves against the OS preference; everything else is literal. */
export function resolveMode(appearance: Appearance | undefined): Mode {
    if (appearance === 'light') return 'light'
    if (appearance === 'system' && typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia(LIGHT_QUERY).matches ? 'light' : 'dark'
    }
    return 'dark'
}

/** Calls back when the OS switches between light and dark; returns the unsubscribe. */
export function watchSystemMode(onChange: () => void): () => void {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {}
    const query = window.matchMedia(LIGHT_QUERY)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
}

/** What the settings ask the page and rack to look like. */
export type PageLook = {
    mode: Mode
    /** The palette the rack (and, when recoloured, the page) derives from, already inverted for light. */
    palette: Record<CSSVariable, string>
    /** The rack carries theme tokens (a palette other than Spotify's, or light mode). */
    themedRack: boolean
    /** Spotify's own page is re-skinned with `palette`. */
    recolourPage: boolean
    /** The saved look in force (a built-in or the person's own); null for a bare palette. */
    look: Look | null
    /** The default show-through (settings), for a look without its own. */
    showThrough: number
}

/** The fifteen page colours a look's palette source stands for, before any light inversion. */
export function resolvePalette(source: PaletteSource): Record<CSSVariable, string> {
    switch (source.kind) {
        case 'builtin':
            return STATIC_THEMES[source.name] ?? SPOTIFY_PALETTE
        case 'colours':
            return derivePalette(source)
        case 'slots':
            return completePalette(source.colours)
        case 'cover':
            // The playing cover's palette once read (setPlayingCover); Spotify's stands in before.
            return coverPalette ?? SPOTIFY_PALETTE
    }
}

/** A saved look by id: one of the person's own from `looks`, else a built-in. */
export function lookById(
    looks: LooksState | null | undefined,
    id: string | null | undefined
): Look | null {
    if (!id) return null
    return looks?.looks[id] ?? builtinLook(id) ?? null
}

/**
 * `settings.theme.look` names a saved look; without one, `settings.theme.name`
 * is a bare built-in palette. `override` previews a look the editor has not
 * saved yet.
 */
export function lookFromSettings(
    settings: SettingsState,
    looks?: LooksState | null,
    override?: Look | null
): PageLook {
    const mode = resolveMode(settings.theme?.appearance)
    const applied = Boolean(settings.ui?.theme)
    const look = applied ? (override ?? lookById(looks, settings.theme?.look)) : null
    const name: ThemeName = applied ? (settings.theme?.name ?? 'spotify') : 'spotify'
    const base = look ? resolvePalette(look.palette) : (STATIC_THEMES[name] ?? SPOTIFY_PALETTE)
    const light = mode === 'light'
    const palette = light ? invertPalette(base) : base
    const spotifyPalette = look
        ? look.palette.kind === 'builtin' && look.palette.name === 'spotify'
        : name === 'spotify'
    const themed = applied && !spotifyPalette
    return {
        mode,
        palette,
        themedRack: themed || light,
        recolourPage: applied && (themed || light || Boolean(look?.backdrop)),
        look,
        showThrough: settings.theme?.showThrough ?? SHOW_THROUGH_DEFAULT
    }
}

export const STATIC_THEMES: Record<ThemeName, null | Record<CSSVariable, string>> = {
    spotify: null,
    desert: {
        text: '#fddc95',
        subtext: '#fff4dc',
        main: '#5a2e0c',
        sidebar: '#5a2e0c',
        player: '#5a2e0c',
        card: '#874219',
        shadow: '#874219',
        selected_row: '#fbb74a',
        button: '#fbb74a',
        button_active: '#fbb74a',
        button_disabled: '#b6541d',
        tab_active: '#fddc95',
        notification: '#5a2e0c',
        notification_error: '#db6d22',
        misc: '#5a2e0c'
    },
    ocean: {
        text: '#c8faf3',
        subtext: '#e8fffc',
        main: '#00587a',
        sidebar: '#00587a',
        player: '#00587a',
        card: '#00698f',
        shadow: '#007baa',
        selected_row: '#9bf3f3',
        button: '#9bf3f3',
        button_active: '#9bf3f3',
        button_disabled: '#00aedd',
        tab_active: '#2fd4f4',
        notification: '#00587a',
        notification_error: '#66eaf7',
        misc: '#00587a'
    },
    sky: {
        text: '#badbff',
        subtext: '#e5f2ff',
        main: '#002e99',
        sidebar: '#002e99',
        player: '#002e99',
        card: '#0047cc',
        shadow: '#0047cc',
        selected_row: '#8ac1ff',
        button: '#8ac1ff',
        button_active: '#8ac1ff',
        button_disabled: '#1867f2',
        tab_active: '#3a86ff',
        notification: '#002e99',
        notification_error: '#5fa2ff',
        misc: '#002e99'
    },
    regal: {
        text: '#cba3e8',
        subtext: '#f2e6fa',
        main: '#1a0826',
        sidebar: '#1a0826',
        player: '#1a0826',
        card: '#2e0c44',
        shadow: '#2e0c44',
        selected_row: '#a964d1',
        button: '#a964d1',
        button_active: '#a964d1',
        button_disabled: '#471464',
        tab_active: '#651c8c',
        notification: '#1a0826',
        notification_error: '#8531b2',
        misc: '#1a0826'
    },
    forest_green: {
        text: '#a3d4b1',
        subtext: '#d9f0e1',
        main: '#0b1f17',
        sidebar: '#0b1f17',
        player: '#0b1f17',
        card: '#123527',
        shadow: '#123527',
        selected_row: '#73b489',
        button: '#73b489',
        button_active: '#73b489',
        button_disabled: '#1e4d32',
        tab_active: '#a3d4b1',
        notification: '#2f6843',
        notification_error: '#1e4d32',
        misc: '#0b1f17'
    },
    artic: {
        text: '#d2f4fa',
        subtext: '#f1fcfe',
        main: '#0b2c3a',
        sidebar: '#0b2c3a',
        player: '#0b2c3a',
        card: '#13475c',
        shadow: '#13475c',
        selected_row: '#a4e4f5',
        button: '#a4e4f5',
        button_active: '#a4e4f5',
        button_disabled: '#1f6d89',
        tab_active: '#d2f4fa',
        notification: '#0b2c3a',
        notification_error: '#2e96b5',
        misc: '#0b2c3a'
    },
    cherry_blossom: {
        text: '#ffe8ee',
        subtext: '#fff7f9',
        main: '#a22c5f',
        sidebar: '#a22c5f',
        player: '#a22c5f',
        card: '#86244e',
        shadow: '#c94277',
        selected_row: '#ffd4de',
        button: '#ffd4de',
        button_active: '#ffd4de',
        button_disabled: '#e85a8a',
        tab_active: '#ffe8ee',
        notification: '#c94277',
        notification_error: '#ffb5c9',
        misc: '#a22c5f'
    },
    matcha: {
        text: '#f3fce5',
        subtext: '#e0f9ca',
        main: '#3b7b2f',
        sidebar: '#3b7b2f',
        player: '#3b7b2f',
        card: '#2f6326',
        shadow: '#51a140',
        selected_row: '#c5f6a3',
        button: '#c5f6a3',
        button_active: '#c5f6a3',
        button_disabled: '#66c24d',
        tab_active: '#f3fce5',
        notification: '#3b7b2f',
        notification_error: '#a1f177',
        misc: '#3b7b2f'
    },
    raisin: {
        text: '#d6b8d6',
        subtext: '#ad79a6',
        main: '#1a0e17',
        sidebar: '#1a0e17',
        player: '#1a0e17',
        card: '#241221',
        shadow: '#241221',
        selected_row: '#9a4b8a',
        button: '#9a4b8a',
        button_active: '#9a4b8a',
        button_disabled: '#331a2e',
        tab_active: '#d6b8d6',
        notification: '#241221',
        notification_error: '#331a2e',
        misc: '#1a0e17'
    },
    lava: {
        text: '#ffa18a',
        subtext: '#ffd6cc',
        main: '#7a0000',
        sidebar: '#7a0000',
        player: '#7a0000',
        card: '#900000',
        shadow: '#a00000',
        selected_row: '#ff6b47',
        button: '#ff6b47',
        button_active: '#ff6b47',
        button_disabled: '#c21807',
        tab_active: '#ffa18a',
        notification: '#ff3e10',
        notification_error: '#ff6b47',
        misc: '#a00000'
    },
    citrus: {
        text: '#ffffff',
        subtext: '#fffcf5',
        main: '#c64e00',
        sidebar: '#c64e00',
        player: '#c64e00',
        card: '#a84200',
        shadow: '#ff6b00',
        selected_row: '#ffde98',
        button: '#ffde98',
        button_active: '#ffde98',
        button_disabled: '#ff8c1a',
        tab_active: '#ffebc3',
        notification: '#c64e00',
        notification_error: '#ff8c1a',
        misc: '#c64e00'
    },
    hot_pink: {
        text: '#fffffe',
        subtext: '#fffffe',
        main: '#b01072',
        sidebar: '#b01072',
        player: '#b01072',
        card: '#d31589',
        shadow: '#d31589',
        selected_row: '#ffd9eb',
        button: '#ffd9eb',
        button_active: '#ffd9eb',
        button_disabled: '#ff4faf',
        tab_active: '#ff7bc5',
        notification: '#ff1493',
        notification_error: '#ff6003',
        misc: '#b01072'
    },
    imperial: {
        text: '#f6eefa',
        subtext: '#efe2f5',
        main: '#9932cc',
        sidebar: '#9932cc',
        player: '#9932cc',
        card: '#9400d3',
        shadow: '#9400d3',
        selected_row: '#e6ccff',
        button: '#e6ccff',
        button_active: '#e6ccff',
        button_disabled: '#ba55d3',
        tab_active: '#f6eefa',
        notification: '#9400d3',
        notification_error: '#fb7c7c',
        misc: '#9932cc'
    },
    mars: {
        text: '#fca66f',
        subtext: '#ffe0c2',
        main: '#2c0e0a',
        sidebar: '#2c0e0a',
        player: '#2c0e0a',
        card: '#58130e',
        shadow: '#58130e',
        selected_row: '#f66a3c',
        button: '#f66a3c',
        button_active: '#f66a3c',
        button_disabled: '#8b1e13',
        tab_active: '#fca66f',
        notification: '#58130e',
        notification_error: '#c22f17',
        misc: '#2c0e0a'
    },
    ubuntu: {
        text: '#ff92d5',
        subtext: '#ffd6e8',
        main: '#3b002e',
        sidebar: '#3b002e',
        player: '#3b002e',
        card: '#660043',
        shadow: '#660043',
        selected_row: '#d4007e',
        button: '#d4007e',
        button_active: '#d4007e',
        button_disabled: '#7a0048',
        tab_active: '#ff92d5',
        notification: '#660043',
        notification_error: '#ff6003',
        misc: '#3b002e'
    },
    // --- second batch: hues the first set left out (navy, blue-grey, neutral,
    // coffee, khaki, teal, burgundy, neon purple). Same conventions as above:
    // main = sidebar = player is the page, card is the hover step, the three
    // button fields are the accent, button_disabled a mid tone.
    midnight: {
        text: '#dbe7ff',
        subtext: '#f0f5ff',
        main: '#0f1a2e',
        sidebar: '#0f1a2e',
        player: '#0f1a2e',
        card: '#1b2a46',
        shadow: '#1b2a46',
        selected_row: '#8fb8ff',
        button: '#8fb8ff',
        button_active: '#8fb8ff',
        button_disabled: '#2f4a7a',
        tab_active: '#dbe7ff',
        notification: '#1b2a46',
        notification_error: '#ff7a90',
        misc: '#0f1a2e'
    },
    slate: {
        text: '#e2e8f0',
        subtext: '#f8fafc',
        main: '#1e293b',
        sidebar: '#1e293b',
        player: '#1e293b',
        card: '#2d3b52',
        shadow: '#2d3b52',
        selected_row: '#93c5fd',
        button: '#93c5fd',
        button_active: '#93c5fd',
        button_disabled: '#475569',
        tab_active: '#e2e8f0',
        notification: '#2d3b52',
        notification_error: '#fb7185',
        misc: '#1e293b'
    },
    graphite: {
        text: '#ededed',
        subtext: '#fafafa',
        main: '#1c1c1e',
        sidebar: '#1c1c1e',
        player: '#1c1c1e',
        card: '#2c2c2e',
        shadow: '#2c2c2e',
        selected_row: '#d4d4d8',
        button: '#d4d4d8',
        button_active: '#d4d4d8',
        button_disabled: '#48484a',
        tab_active: '#ededed',
        notification: '#2c2c2e',
        notification_error: '#ff6b6b',
        misc: '#1c1c1e'
    },
    espresso: {
        text: '#f3e3d3',
        subtext: '#fff6ec',
        main: '#2b1a12',
        sidebar: '#2b1a12',
        player: '#2b1a12',
        card: '#3d281d',
        shadow: '#3d281d',
        selected_row: '#d9a066',
        button: '#d9a066',
        button_active: '#d9a066',
        button_disabled: '#6b4a33',
        tab_active: '#f3e3d3',
        notification: '#3d281d',
        notification_error: '#ff8a5b',
        misc: '#2b1a12'
    },
    olive: {
        text: '#e9ecd6',
        subtext: '#f7f8ee',
        main: '#232816',
        sidebar: '#232816',
        player: '#232816',
        card: '#343b22',
        shadow: '#343b22',
        selected_row: '#c9d96a',
        button: '#c9d96a',
        button_active: '#c9d96a',
        button_disabled: '#5a6333',
        tab_active: '#e9ecd6',
        notification: '#343b22',
        notification_error: '#ff9f68',
        misc: '#232816'
    },
    lagoon: {
        text: '#d5f5f1',
        subtext: '#effffd',
        main: '#0b2f2e',
        sidebar: '#0b2f2e',
        player: '#0b2f2e',
        card: '#124443',
        shadow: '#124443',
        selected_row: '#5eead4',
        button: '#5eead4',
        button_active: '#5eead4',
        button_disabled: '#1f6e6a',
        tab_active: '#d5f5f1',
        notification: '#124443',
        notification_error: '#ffb86b',
        misc: '#0b2f2e'
    },
    wine: {
        text: '#f6dfe6',
        subtext: '#fff3f6',
        main: '#33101c',
        sidebar: '#33101c',
        player: '#33101c',
        card: '#4a1829',
        shadow: '#4a1829',
        selected_row: '#e3a2b8',
        button: '#e3a2b8',
        button_active: '#e3a2b8',
        button_disabled: '#7a2a45',
        tab_active: '#f6dfe6',
        notification: '#4a1829',
        notification_error: '#ffb070',
        misc: '#33101c'
    },
    synthwave: {
        text: '#f5e1ff',
        subtext: '#fff0ff',
        main: '#1a0b2e',
        sidebar: '#1a0b2e',
        player: '#1a0b2e',
        card: '#2a1247',
        shadow: '#2a1247',
        selected_row: '#ff6ec7',
        button: '#ff6ec7',
        button_active: '#ff6ec7',
        button_disabled: '#5b2b8a',
        tab_active: '#f5e1ff',
        notification: '#2a1247',
        notification_error: '#ffb347',
        misc: '#1a0b2e'
    }
}

const PAGE_VARS: Record<string, CSSVariable | 'highlight' | 'highlight-elevated' | 'frame'> = {
    main: 'main',
    // The app frame around the panels: the palette's shadow, kept clear of card (theme-surfaces.ts frameColor).
    frame: 'frame',
    card: 'card',
    // Spotify's elevated surfaces (context menus, the top bar's controls, the hover of main-level controls) take the card colour.
    'main-elevated': 'card',
    sidebar: 'sidebar',
    button: 'button',
    subtext: 'subtext',
    text: 'text',
    'selected-row': 'selected_row',
    shadow: 'shadow',
    'button-active': 'button_active',
    'button-disabled': 'button_disabled',
    'tab-active': 'tab_active',
    misc: 'misc',
    player: 'player',
    notification: 'notification',
    'notification-error': 'notification_error',
    highlight: 'highlight',
    'highlight-elevated': 'highlight-elevated'
}

/** Overlay alpha multiplier: a dark tint on a light page reads weaker than a light tint on a dark one. */
const OVERLAY_GAIN: Record<Mode, string> = { dark: '1', light: '1.5' }

/** `r, g, b` for the `rgba(var(--chorus-rgb-x), a)` overlays in the rewritten Spotify stylesheets. */
function rgbTriplet(hex: string): string {
    const h = hex.replace('#', '')
    const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h
    const n = parseInt(full, 16)
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

/**
 * The `--chorus-*` variables theme.css and the rewritten Spotify stylesheets
 * read: each palette colour as hex and as an `r, g, b` triplet for the alpha
 * overlays, plus the overlay gain for the mode.
 */
export function applyPageVariables(
    themeConfig: Record<CSSVariable, string>,
    mode: Mode = 'dark'
): void {
    const root = document.documentElement
    for (const [name, key] of Object.entries(PAGE_VARS)) {
        // Hovered elevated surfaces (the search box, the top bar's buttons, menu
        // items) step up to the palette's hover colour, as the theme intends for rows.
        const value =
            key === 'highlight'
                ? themeConfig.main
                : key === 'highlight-elevated'
                  ? themeConfig.button_disabled
                  : key === 'frame'
                    ? frameColor(themeConfig)
                    : themeConfig[key]
        root.style.setProperty(`--chorus-${name}`, value)
        root.style.setProperty(`--chorus-rgb-${name}`, rgbTriplet(value))
    }
    root.style.setProperty('--chorus-overlay-gain', OVERLAY_GAIN[mode])
}

function clearPageVariables(): void {
    const root = document.documentElement
    for (const name of Object.keys(PAGE_VARS)) {
        root.style.removeProperty(`--chorus-${name}`)
        root.style.removeProperty(`--chorus-rgb-${name}`)
    }
    root.style.removeProperty('--chorus-overlay-gain')
}

/**
 * Write a palette onto the document root: the `--chorus-*` variables theme.css
 * and the rewritten Spotify stylesheets read, plus the Chorus rack tokens
 * derived from it (see theme-surfaces.ts). Pure DOM; no stylesheet injection.
 */
export function applyThemeVariables(
    themeConfig: Record<CSSVariable, string>,
    mode: Mode = 'dark'
): void {
    applyPageVariables(themeConfig, mode)
    applyThemeSurfaces(document.documentElement, themeConfig, mode)
}

// ---- Glass ------------------------------------------------------------------

const GLASS_FILTER_ID = 'chorus-glass'
export const GLASS_BLUR_MIN = 16
const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * The SVG filter behind the refraction option: low-frequency noise displaces
 * the blurred backdrop so edges of the page wobble through the panel like
 * thick glass. Chrome applies it from backdrop-filter; browsers that don't
 * drop that declaration and keep the plain blur (app.css).
 */
function ensureGlassFilter(doc: Document): SVGElement | null {
    const existing = doc.getElementById(`${GLASS_FILTER_ID}-map`)
    if (existing) return existing as unknown as SVGElement
    if (!doc.body) return null
    const svg = doc.createElementNS(SVG_NS, 'svg')
    svg.id = `${GLASS_FILTER_ID}-svg`
    svg.setAttribute('width', '0')
    svg.setAttribute('height', '0')
    svg.setAttribute('aria-hidden', 'true')
    svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none'
    const filter = doc.createElementNS(SVG_NS, 'filter')
    filter.id = GLASS_FILTER_ID
    filter.setAttribute('x', '0')
    filter.setAttribute('y', '0')
    filter.setAttribute('width', '100%')
    filter.setAttribute('height', '100%')
    filter.setAttribute('color-interpolation-filters', 'sRGB')
    const noise = doc.createElementNS(SVG_NS, 'feTurbulence')
    noise.setAttribute('type', 'fractalNoise')
    noise.setAttribute('baseFrequency', '0.006 0.009')
    noise.setAttribute('numOctaves', '2')
    noise.setAttribute('seed', '5')
    noise.setAttribute('result', 'noise')
    const soften = doc.createElementNS(SVG_NS, 'feGaussianBlur')
    soften.setAttribute('in', 'noise')
    soften.setAttribute('stdDeviation', '3')
    soften.setAttribute('result', 'map')
    const map = doc.createElementNS(SVG_NS, 'feDisplacementMap')
    map.id = `${GLASS_FILTER_ID}-map`
    map.setAttribute('in', 'SourceGraphic')
    map.setAttribute('in2', 'map')
    map.setAttribute('scale', '0')
    map.setAttribute('xChannelSelector', 'R')
    map.setAttribute('yChannelSelector', 'G')
    filter.append(noise, soften, map)
    svg.append(filter)
    doc.body.append(svg)
    return map
}

/**
 * Glass surfaces: floating Chorus panels go translucent over a blurred,
 * saturated view of what is behind them (app.css). The settings' opacity and
 * blur land as variables on the root; refraction toggles the SVG filter.
 */
export function applyGlass(settings: SettingsState, doc: Document = document): void {
    const root = doc.documentElement
    if (!root) return
    const on = Boolean(settings.ui?.glass)
    const { opacity, blur, refraction } = settings.theme?.glass ?? {
        opacity: 0.5,
        blur: 40,
        refraction: 22
    }
    root.toggleAttribute('data-glass', on)
    root.style.setProperty('--glass-alpha', String(opacity))
    // Below this radius the page's text stays legible through the glass and
    // fights the panel's own; the Theme tab's slider starts here too.
    root.style.setProperty('--glass-blur', `${Math.max(blur, GLASS_BLUR_MIN)}px`)
    const refract = on && refraction > 0
    root.toggleAttribute('data-refraction', refract)
    if (refract) ensureGlassFilter(doc)?.setAttribute('scale', String(refraction))
}

export function clearGlass(doc: Document = document): void {
    const root = doc.documentElement
    if (!root) return
    root.removeAttribute('data-glass')
    root.removeAttribute('data-refraction')
    root.style.removeProperty('--glass-alpha')
    root.style.removeProperty('--glass-blur')
    doc.getElementById(`${GLASS_FILTER_ID}-svg`)?.remove()
}

// ---- Backdrop ---------------------------------------------------------------

/** The backdrop on the page now, kept so a new cover can repaint a cover backdrop on its own. */
let currentBackdrop: { look: Look; frame: string; mode: Mode; showThrough: number } | null = null
/** The playing track's cover, as the page last reported it (utils/cover-palette feeds it). */
let coverUrl: string | null = null
/** The cover's palette, once read; a look whose palette follows the cover wears it. */
let coverPalette: Record<CSSVariable, string> | null = null
/** The palette kind of the look last applied, and how to apply that look again. */
let appliedPaletteKind: PaletteSource['kind'] | null = null
let reapply: (() => void) | null = null

function prefersReducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    )
}

type BackdropMedia = {
    /** The address the picture or video loads from; null while it is not there yet. */
    url: string | null
    /** The address is a video, played in a <video> behind the page rather than painted as a background. */
    video: boolean
    /** Whether a moving file moves: off with its switch, or under Reduce motion. */
    play: boolean
}

const STILL_MEDIA: BackdropMedia = { url: null, video: false, play: false }

/**
 * What a look's backdrop shows, if anything yet: a stored file's address, a
 * link, the playing cover; the still frame of a moving file when it is to
 * hold still.
 */
async function backdropMedia(look: Look): Promise<BackdropMedia> {
    const backdrop = look.backdrop
    if (!backdrop) return STILL_MEDIA
    if (backdrop.kind === 'cover') return { ...STILL_MEDIA, url: coverUrl }
    if (backdrop.kind !== 'image') return STILL_MEDIA
    const video = isVideoBackdrop(backdrop)
    const moving = video || Boolean(backdrop.info?.animated)
    const still = moving && (!backdrop.animate || prefersReducedMotion())
    if (backdrop.source.type === 'url') return { url: backdrop.source.url, video, play: !still }
    if (still) {
        // A stored file's still frame is a picture; a video without one pauses on its first frame.
        const frame = await wallpaperStill(backdrop.source.id)
        if (frame) return { ...STILL_MEDIA, url: frame }
    }
    return { url: await wallpaperUrl(backdrop.source.id), video, play: !still }
}

const VIDEO_ID = 'chorus-backdrop-video'
let onVisibility: (() => void) | null = null

/**
 * The <video> a video backdrop plays in: one element, the last child of
 * <html> so it paints between the picture layer and the wash (theme.css
 * places and sizes it), muted and looping, paused while the tab is hidden.
 * The media override leaves it alone by its data-chorus-backdrop mark.
 */
function mountBackdropVideo(url: string, play: boolean): void {
    let video = document.getElementById(VIDEO_ID) as HTMLVideoElement | null
    if (!video) {
        video = document.createElement('video')
        video.id = VIDEO_ID
        video.setAttribute('data-chorus-backdrop', '')
        video.setAttribute('aria-hidden', 'true')
        video.setAttribute('playsinline', '')
        video.setAttribute('disablepictureinpicture', '')
        video.setAttribute('disableremoteplayback', '')
        video.muted = true
        video.defaultMuted = true
        video.loop = true
        video.preload = 'auto'
        video.tabIndex = -1
        document.documentElement.appendChild(video)
        onVisibility = () => {
            const el = document.getElementById(VIDEO_ID) as HTMLVideoElement | null
            if (!el) return
            if (document.hidden) el.pause()
            else if (el.dataset.play === 'true') void el.play().catch(() => undefined)
        }
        document.addEventListener('visibilitychange', onVisibility)
    }
    if (video.getAttribute('src') !== url) {
        video.src = url
        video.load()
    }
    video.dataset.play = String(play)
    if (play && !document.hidden) void video.play().catch(() => undefined)
    else video.pause()
}

function removeBackdropVideo(): void {
    const video = document.getElementById(VIDEO_ID) as HTMLVideoElement | null
    if (video) {
        video.pause()
        video.removeAttribute('src')
        video.load()
        video.remove()
    }
    if (onVisibility) {
        document.removeEventListener('visibilitychange', onVisibility)
        onVisibility = null
    }
}

function paintBackdrop(
    look: Look,
    frame: string,
    mode: Mode,
    media: BackdropMedia,
    showThrough: number
): void {
    const backdrop = look.backdrop
    if (!backdrop) return
    const root = document.documentElement
    const vars = backdropVariables(backdrop, {
        frame,
        mode,
        imageUrl: media.video ? null : media.url
    })
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value)
    root.style.setProperty('--chorus-panel-alpha', String(panelAlpha(showThrough)))
    root.setAttribute('data-backdrop', media.video ? 'video' : backdrop.kind)
    root.toggleAttribute('data-panel-glass', look.panels.glass)
    root.toggleAttribute('data-drift', backdrop.kind === 'gradient' && backdrop.drift)
    if (media.video && media.url) mountBackdropVideo(media.url, media.play)
    else removeBackdropVideo()
}

/**
 * Put a look's backdrop behind the page (theme.css paints it from the
 * `--chorus-backdrop-*` properties) and start tagging the panels it shows
 * through; or take it all down when the look has none.
 */
async function applyBackdrop(pageLook: PageLook): Promise<void> {
    const look = pageLook.look
    if (!pageLook.recolourPage || !look?.backdrop) {
        clearBackdrop()
        return
    }
    const frame = frameColor(pageLook.palette)
    const media = await backdropMedia(look)
    const showThrough = resolveShowThrough(look.panels, pageLook.showThrough)
    paintBackdrop(look, frame, pageLook.mode, media, showThrough)
    currentBackdrop = { look, frame, mode: pageLook.mode, showThrough }
    watchPagePanels()
}

/**
 * The page tells theming which cover is playing and, once read, its palette
 * (utils/cover-palette). A cover backdrop follows the picture at once; a look
 * whose palette follows the cover is applied again when the palette changes.
 * Called without a palette, the one already known stays on, so a track
 * change does not flash Spotify's colours while the new cover is read.
 */
export function setPlayingCover(
    url: string | null,
    palette?: Record<CSSVariable, string> | null
): void {
    if (url !== coverUrl) {
        coverUrl = url
        if (currentBackdrop?.look.backdrop?.kind === 'cover') {
            const { look, frame, mode, showThrough } = currentBackdrop
            paintBackdrop(look, frame, mode, { ...STILL_MEDIA, url }, showThrough)
        }
    }
    if (palette === undefined || palette === coverPalette) return
    coverPalette = palette
    if (appliedPaletteKind === 'cover') reapply?.()
}

export function clearBackdrop(doc: Document = document): void {
    const root = doc.documentElement
    if (!root) return
    currentBackdrop = null
    root.removeAttribute('data-backdrop')
    root.removeAttribute('data-panel-glass')
    root.removeAttribute('data-drift')
    for (const name of BACKDROP_PROPERTIES) root.style.removeProperty(name)
    removeBackdropVideo()
    unwatchPagePanels()
}

// ---- Applying a look --------------------------------------------------------

/** Strip the page re-skin: Spotify's own stylesheets and colours come back. */
export function removePageTheme(): void {
    unwatchStylesheets()
    clearBackdrop()
    clearPageVariables()
    document
        .querySelectorAll(`style[id^="${OVERRIDE_ID_PREFIX}"]`)
        .forEach((style) => style.remove())
    document.getElementById(THEME_LINK_ID)?.remove()
}

/** Everything theming put on the page: re-skin, rack tokens, glass and mode. */
export function removeTheme(): void {
    removePageTheme()
    clearThemeSurfaces(document.documentElement)
    clearGlass(document)
    document.documentElement.removeAttribute('data-mode')
}

let lookQueue: Promise<void> = Promise.resolve()

/**
 * Bring the Spotify page and the in-page rack in line with the settings:
 * palette, appearance (dark / light / system) and glass. Calls are serialised
 * because re-skinning the page fetches and rewrites Spotify's stylesheets.
 */
export function applyLook(
    settings: SettingsState,
    looks?: LooksState | null,
    override?: Look | null
): Promise<void> {
    lookQueue = lookQueue
        .then(() => applyLookNow(settings, looks, override))
        .catch((error) => {
            console.error('Error applying theme:', error)
        })
    return lookQueue
}

async function applyLookNow(
    settings: SettingsState,
    looks?: LooksState | null,
    override?: Look | null
): Promise<void> {
    if (typeof document === 'undefined' || !document.documentElement) return
    const look = lookFromSettings(settings, looks, override)
    appliedPaletteKind = look.look?.palette.kind ?? null
    reapply = () => void applyLook(settings, looks, override)
    const root = document.documentElement
    root.setAttribute('data-mode', look.mode)

    if (look.recolourPage) {
        await injectThemeCss()
        applyPageVariables(look.palette, look.mode)
        await applyBackdrop(look)
    } else {
        removePageTheme()
    }

    if (look.themedRack) applyThemeSurfaces(root, look.palette, look.mode)
    else clearThemeSurfaces(root)

    applyGlass(settings, document)
}

/**
 * The rack-only part of a look, for documents with no Spotify page in them
 * (the toolbar popup, and the PiP window alongside its style sync).
 */
export function applyRackLook(
    settings: SettingsState,
    doc: Document = document,
    looks?: LooksState | null
): void {
    const root = doc.documentElement
    if (!root) return
    const look = lookFromSettings(settings, looks)
    appliedPaletteKind = look.look?.palette.kind ?? null
    reapply = () => applyRackLook(settings, doc, looks)
    root.setAttribute('data-mode', look.mode)
    if (look.themedRack) applyThemeSurfaces(root, look.palette, look.mode)
    else clearThemeSurfaces(root)
    applyGlass(settings, doc)
}

/**
 * Point the popup's palette variables (--bg, --text, --text-2, --album-accent,
 * normally filled from the album art) at the rack tokens, so the popup wears
 * the theme instead of the cover.
 */
export function applyThemePopupPalette(root: HTMLElement): void {
    root.style.setProperty('--bg', 'hsl(var(--ink))')
    root.style.setProperty('--text', 'hsl(var(--ink-fg))')
    root.style.setProperty('--text-2', 'hsl(var(--ink-fg-2))')
    root.style.setProperty('--album-accent', 'hsl(var(--signal))')
    root.style.setProperty('--album-accent-hsl', 'var(--signal)')
    // The rack's own pairing (bg-signal text-signal-fg): white or black by the fill.
    root.style.setProperty('--album-accent-fg', 'hsl(var(--signal-fg))')
}

type ReplacementRule = {
    target: string
    replacement: string | ((match: string, group: string) => string)
    /** Only declarations of these properties; the next rule for the same colour takes the rest. */
    properties?: RegExp
}

/** Backgrounds and the `--background-*` tokens, as opposed to text, icons and masks. */
const BACKGROUND_PROPERTY = /^(--)?background/

/** Below this alpha a translucent white is a hover / selection tint; above it, dimmed text or an icon. */
const OVERLAY_ALPHA_MAX = 0.25

/**
 * Spotify's translucent whites, which its build emits as 8-digit hexes. Hover
 * and selection tints take the palette's `selected_row` colour, scaled by the
 * mode's overlay gain, so a hovered row shifts towards the theme on a light
 * page instead of vanishing; dimmed text and icons take the text colour.
 */
function translucentWhite(_: string, alphaHex: string): string {
    const alpha = Math.round((parseInt(alphaHex, 16) / 255) * 100) / 100
    return alpha <= OVERLAY_ALPHA_MAX
        ? `rgba(var(--chorus-rgb-selected-row), calc(${alpha} * var(--chorus-overlay-gain, 1)))`
        : `rgba(var(--chorus-rgb-text), ${alpha})`
}

const HEX_END = '(?![0-9a-f])'

// Every hex pattern ends in a lookahead, and longer alternatives come first,
// so `#fff` never eats the start of `#ffffff1a` or `#ffffff`.
//
// Spotify's black is two things: the app frame (the page behind the panels,
// the top bar and the player bar; theme.css then paints those two bars as
// panels of `main`) and the text on its bright-accent fills. The frame takes
// `--chorus-frame`: the palette's `shadow`, the colour that painted it before
// this split, pushed a half step above `card` where the two coincide (see
// theme-surfaces.ts frameColor). The text takes `shadow` itself.
function replacementRules(): ReplacementRule[] {
    return [
        { target: `#ffffff([0-9a-f]{2})${HEX_END}`, replacement: translucentWhite },
        { target: `#(181818|212121)${HEX_END}`, replacement: 'var(--chorus-player)' },
        { target: `#282828${HEX_END}`, replacement: 'var(--chorus-card)' },
        {
            target: `#(242424|1f1f1f|191919)${HEX_END}`,
            replacement: 'var(--chorus-main-elevated)'
        },
        { target: `#121212${HEX_END}`, replacement: 'var(--chorus-main)' },
        { target: `#1a1a1a${HEX_END}`, replacement: 'var(--chorus-highlight)' },
        { target: `#2a2a2a${HEX_END}`, replacement: 'var(--chorus-highlight-elevated)' },
        {
            target: `#(000000|000)${HEX_END}`,
            replacement: 'var(--chorus-frame)',
            properties: BACKGROUND_PROPERTY
        },
        { target: `#(000000|000)${HEX_END}`, replacement: 'var(--chorus-shadow)' },
        { target: `#(ffffff|fff)${HEX_END}`, replacement: 'var(--chorus-text)' },
        // The white (inverted-light) buttons, the player bar's play button among
        // them: their hover and pressed greys follow the text colour the white maps to.
        { target: `#f0f0f0${HEX_END}`, replacement: 'var(--chorus-text)' },
        { target: `#c7c7c7${HEX_END}`, replacement: 'var(--chorus-subtext)' },
        { target: `#(b3b3b3|a7a7a7)${HEX_END}`, replacement: 'var(--chorus-subtext)' },
        { target: `#(1ed760|1fdf64|169c46)${HEX_END}`, replacement: 'var(--chorus-button-active)' },
        { target: `#535353${HEX_END}`, replacement: 'var(--chorus-button-disabled)' },
        { target: `#(333333|333)${HEX_END}`, replacement: 'var(--chorus-tab-active)' },
        { target: `#7f7f7f${HEX_END}`, replacement: 'var(--chorus-misc)' },
        { target: `#(4687d6|2e77d0)${HEX_END}`, replacement: 'var(--chorus-notification)' },
        { target: `#(e22134|cd1a2b)${HEX_END}`, replacement: 'var(--chorus-notification-error)' },
        {
            target: 'rgba\\(18,18,18,([\\d.]+)\\)',
            replacement: (_, alpha) => `rgba(var(--chorus-rgb-main), ${alpha})`
        },
        {
            target: 'rgba\\(40,40,40,([\\d.]+)\\)',
            replacement: (_, alpha) => `rgba(var(--chorus-rgb-card), ${alpha})`
        }
    ]
}

type CompiledRule = Omit<ReplacementRule, 'target'> & { regex: RegExp }

function compileRules(): CompiledRule[] {
    return replacementRules().map(({ target, ...rule }) => ({
        ...rule,
        regex: new RegExp(target, 'gi')
    }))
}

/** A value can only match a rule if it holds a hex colour or one of the two rgba() greys. */
const MAY_MATCH = /#|rgba\(/i
const IMPORTANT_FLAG = /\s*!\s*important\s*$/i
/** `url(...)` tokens, quoted or bare: a data URI can carry `;` and hex colours of its own. */
const URL_TOKEN = /url\((?:"[^"]*"|'[^']*'|[^)]*)\)/gi
const URL_MARK = '\u0001'
const URL_PLACEHOLDER = new RegExp(`url\\(${URL_MARK}(\\d+)${URL_MARK}\\)`, 'g')

/**
 * Selectors made only of element names, combinators and pseudo-classes:
 * `button`, `body,dialog`, `html`, a keyframe step. Their rewritten
 * declarations are not flagged `!important`: Spotify's reset
 * `button{color:var(--text-subdued,#b3b3b3)}` flagged that way overrode the
 * colour of every Chorus button on the page (an unreadable "Play" on the
 * snip cards), while without the flag the copy still wins over the original
 * by coming later in the head, and still yields to any class.
 */
const BARE_SELECTOR = /^[a-z0-9\s>+~*:,()-]+$/i
function isBareSelector(prelude: string): boolean {
    const selector = prelude.trim()
    return selector.length > 0 && !selector.startsWith('@') && BARE_SELECTOR.test(selector)
}

/**
 * One `property: value` declaration. Every colour in the value is swapped and,
 * unless the rule sits on a bare element selector, the `!important` flag goes
 * on once, at the end, so a gradient, a `var()` fallback or a shadow list with
 * a colour inside stays a valid declaration.
 */
function rewriteDeclaration(
    declaration: string,
    rules: CompiledRule[],
    important: boolean
): string {
    const colon = declaration.indexOf(':')
    if (colon < 0) return declaration
    const original = declaration.slice(colon + 1)
    if (!MAY_MATCH.test(original)) return declaration
    const property = declaration.slice(0, colon).trim().toLowerCase()
    let value = original
    for (const { regex, replacement, properties } of rules) {
        if (properties && !properties.test(property)) continue
        value = value.replace(regex, (match: string, ...groups: string[]) =>
            typeof replacement === 'function' ? replacement(match, groups[0] || '') : replacement
        )
    }
    if (value === original) return declaration
    if (!important) return `${declaration.slice(0, colon + 1)}${value}`
    const trailing = /\s*$/.exec(value)?.[0] ?? ''
    const body = value.replace(IMPORTANT_FLAG, '').replace(/\s+$/, '')
    return `${declaration.slice(0, colon + 1)}${body} !important${trailing}`
}

/** The declarations of one `{ ... }` block, with `url()` tokens hidden from the split and from the colour rules. */
function rewriteBlock(body: string, rules: CompiledRule[], important: boolean): string {
    if (!MAY_MATCH.test(body)) return body
    const urls: string[] = []
    const masked = body.replace(
        URL_TOKEN,
        (token) => `url(${URL_MARK}${urls.push(token) - 1}${URL_MARK})`
    )
    const rewritten = masked
        .split(';')
        .map((declaration) => rewriteDeclaration(declaration, rules, important))
        .join(';')
    return rewritten.replace(URL_PLACEHOLDER, (_, index: string) => urls[Number(index)])
}

/**
 * Rewrites Spotify's stylesheet text onto the `--chorus-*` variables. Pure,
 * so the rules can be checked against a saved copy of the stylesheet. Only
 * declaration values are touched, never selectors, and since declarations
 * only live in innermost blocks, nested at-rules need no special handling.
 */
export function rewriteSpotifyCss(cssText: string): string {
    const rules = compileRules()
    return cssText.replace(
        /([^{}]*)\{([^{}]*)\}/g,
        (_, prelude: string, body: string) =>
            `${prelude}{${rewriteBlock(body, rules, !isBareSelector(prelude))}}`
    )
}

const THEME_LINK_ID = 'chorus-theme'
const OVERRIDE_ID_PREFIX = 'chorus-override-styles-'

/** Spotify stylesheets already fetched and rewritten, by href. */
const rewrittenSheets = new Set<string>()
let overrideCount = 0
let sheetObserver: MutationObserver | null = null

/** One of Spotify's own stylesheets: served over http(s), unlike the extension's. */
function isPageStylesheet(node: Node): node is HTMLLinkElement {
    if (node.nodeName !== 'LINK') return false
    const link = node as HTMLLinkElement
    return link.rel === 'stylesheet' && /^https?:/i.test(link.href)
}

/**
 * Fetch one of Spotify's stylesheets and add its rewritten copy, kept ahead
 * of theme.css so the theme's own rules still win ties.
 */
async function overrideStylesheet(href: string): Promise<void> {
    if (rewrittenSheets.has(href)) return
    rewrittenSheets.add(href)
    try {
        const response = await fetch(href)
        const cssText = await response.text()
        const styleEl = document.createElement('style')
        styleEl.id = `${OVERRIDE_ID_PREFIX}${overrideCount++}`
        styleEl.textContent = rewriteSpotifyCss(cssText)
        const themeLink = document.getElementById(THEME_LINK_ID)
        if (themeLink) themeLink.before(styleEl)
        else document.head.appendChild(styleEl)
    } catch (fetchErr) {
        rewrittenSheets.delete(href)
        console.warn('Could not fetch and override:', href, fetchErr)
    }
}

/** The stylesheets Spotify has loaded so far, rewritten in document order. */
export async function overrideExternalStyles(): Promise<void> {
    const links = Array.from(document.querySelectorAll('link')).filter(isPageStylesheet)
    for (const link of links) await overrideStylesheet(link.href)
}

/**
 * Spotify loads most of its CSS lazily, a chunk per route or feature (the
 * player bar's own styles among them), long after the first pass has run.
 * Each stylesheet it adds to <head> from then on is rewritten as it lands.
 */
function watchStylesheets(): void {
    if (sheetObserver || typeof MutationObserver === 'undefined') return
    sheetObserver = new MutationObserver((records) => {
        for (const record of records) {
            for (const node of Array.from(record.addedNodes)) {
                if (isPageStylesheet(node)) void overrideStylesheet(node.href)
            }
        }
    })
    sheetObserver.observe(document.head, { childList: true })
}

function unwatchStylesheets(): void {
    sheetObserver?.disconnect()
    sheetObserver = null
    rewrittenSheets.clear()
    overrideCount = 0
}

export async function injectThemeCss(): Promise<void> {
    if (document.getElementById(THEME_LINK_ID)) return

    watchStylesheets()
    await overrideExternalStyles()

    const style = document.createElement('link')
    style.id = THEME_LINK_ID
    style.rel = 'stylesheet'
    style.href = chrome.runtime.getURL('/content-scripts/theme.css')
    document.head.appendChild(style)
}
