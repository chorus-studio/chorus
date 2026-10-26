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

import { applyThemeSurfaces, clearThemeSurfaces, invertPalette, type Mode } from './theme-surfaces'
import type { Appearance, SettingsState } from '$lib/stores/settings'

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
export type Look = {
    /** Palette name while "Apply theme" is on, else `spotify`. */
    name: ThemeName
    mode: Mode
    /** The palette the rack (and, when recoloured, the page) derives from, already inverted for light. */
    palette: Record<CSSVariable, string>
    /** The rack carries theme tokens (a palette other than Spotify's, or light mode). */
    themedRack: boolean
    /** Spotify's own page is re-skinned with `palette`. */
    recolourPage: boolean
}

export function lookFromSettings(settings: SettingsState): Look {
    const mode = resolveMode(settings.theme?.appearance)
    const applied = Boolean(settings.ui?.theme)
    const name: ThemeName = applied ? (settings.theme?.name ?? 'spotify') : 'spotify'
    const base = STATIC_THEMES[name] ?? SPOTIFY_PALETTE
    const light = mode === 'light'
    const palette = light ? invertPalette(base) : base
    const themed = applied && name !== 'spotify'
    return {
        name,
        mode,
        palette,
        themedRack: themed || light,
        recolourPage: applied && (themed || light)
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

const PAGE_VARS: Record<string, CSSVariable | 'highlight' | 'highlight-elevated'> = {
    main: 'main',
    card: 'card',
    // Spotify's elevated surfaces (context menus, the hover of main-level controls) take the card colour.
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
        const value =
            key === 'highlight'
                ? themeConfig.main
                : key === 'highlight-elevated'
                  ? themeConfig.sidebar
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
    root.style.setProperty('--glass-blur', `${blur}px`)
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

// ---- Applying a look --------------------------------------------------------

/** Strip the page re-skin: Spotify's own stylesheets and colours come back. */
export function removePageTheme(): void {
    const themeLink = document.getElementById('chorus-theme')
    clearPageVariables()
    const allOverrideStyles = document.querySelectorAll('style[id^="chorus-override-styles-"]')
    allOverrideStyles.forEach((style) => {
        document.head.removeChild(style)
    })
    if (themeLink) document.head.removeChild(themeLink)
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
export function applyLook(settings: SettingsState): Promise<void> {
    lookQueue = lookQueue
        .then(() => applyLookNow(settings))
        .catch((error) => {
            console.error('Error applying theme:', error)
        })
    return lookQueue
}

async function applyLookNow(settings: SettingsState): Promise<void> {
    if (typeof document === 'undefined' || !document.documentElement) return
    const look = lookFromSettings(settings)
    const root = document.documentElement
    root.setAttribute('data-mode', look.mode)

    if (look.recolourPage) {
        await injectThemeCss()
        applyPageVariables(look.palette, look.mode)
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
export function applyRackLook(settings: SettingsState, doc: Document = document): void {
    const root = doc.documentElement
    if (!root) return
    const look = lookFromSettings(settings)
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
}

type ReplacementRule = {
    target: string
    replacement: string | ((match: string, group: string) => string)
}

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
function replacementRules(): ReplacementRule[] {
    return [
        { target: `#ffffff([0-9a-f]{2})${HEX_END}`, replacement: translucentWhite },
        { target: `#(181818|212121)${HEX_END}`, replacement: 'var(--chorus-player)' },
        { target: `#282828${HEX_END}`, replacement: 'var(--chorus-card)' },
        { target: `#(242424|1f1f1f)${HEX_END}`, replacement: 'var(--chorus-main-elevated)' },
        { target: `#121212${HEX_END}`, replacement: 'var(--chorus-main)' },
        { target: `#1a1a1a${HEX_END}`, replacement: 'var(--chorus-highlight)' },
        { target: `#2a2a2a${HEX_END}`, replacement: 'var(--chorus-highlight-elevated)' },
        { target: `#(000000|000)${HEX_END}`, replacement: 'var(--chorus-shadow)' },
        { target: `#(ffffff|fff)${HEX_END}`, replacement: 'var(--chorus-text)' },
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

/**
 * Rewrites Spotify's stylesheet text onto the `--chorus-*` variables. Pure,
 * so the rules can be checked against a saved copy of the stylesheet.
 */
export function rewriteSpotifyCss(cssText: string): string {
    let modified = cssText
    for (const { target, replacement } of replacementRules()) {
        const regex = new RegExp(target, 'gi')
        modified = modified.replaceAll(regex, (match: string, ...groups: string[]) =>
            typeof replacement === 'function'
                ? `${replacement(match, groups[0] || '')} !important`
                : `${replacement} !important`
        )
    }
    // A declaration Spotify already marked important would otherwise get the flag twice and be dropped.
    return modified.replaceAll(' !important !important', ' !important')
}

export async function overrideExternalStyles() {
    const styleSheets = Array.from(document.styleSheets)
    let count = 0

    for (const sheet of styleSheets) {
        if (!sheet.href) continue
        try {
            const response = await fetch(sheet.href)
            const cssText = await response.text()

            const styleEl = document.createElement('style')
            styleEl.id = `chorus-override-styles-${count++}`
            styleEl.textContent = rewriteSpotifyCss(cssText)
            document.head.appendChild(styleEl)
        } catch (fetchErr) {
            console.warn('Could not fetch and override:', sheet.href, fetchErr)
        }
    }
}

export async function injectThemeCss(): Promise<void> {
    if (document.getElementById('chorus-theme')) return

    await overrideExternalStyles()

    const style = document.createElement('link')
    style.id = 'chorus-theme'
    style.rel = 'stylesheet'
    style.href = chrome.runtime.getURL('/content-scripts/theme.css')
    document.head.appendChild(style)
}
