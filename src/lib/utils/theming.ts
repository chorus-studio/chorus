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

import { applyThemeSurfaces } from './theme-surfaces'

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

/**
 * Write a palette onto the document root: the `--chorus-*` variables theme.css
 * and the rewritten Spotify stylesheets read, plus the Chorus rack tokens
 * derived from it (see theme-surfaces.ts). Pure DOM; no stylesheet injection.
 */
export function applyThemeVariables(themeConfig: Record<CSSVariable, string>): void {
    const root = document.documentElement
    const set = (name: string, value: string) => root.style.setProperty(name, value)

    set('--chorus-main', themeConfig.main)
    set('--chorus-card', themeConfig.card)
    set('--chorus-sidebar', themeConfig.sidebar)
    set('--chorus-button', themeConfig.button)
    set('--chorus-subtext', themeConfig.subtext)
    set('--chorus-text', themeConfig.text)
    set('--chorus-selected-row', themeConfig.selected_row)
    set('--chorus-shadow', themeConfig.shadow)
    set('--chorus-button-active', themeConfig.button_active)
    set('--chorus-button-disabled', themeConfig.button_disabled)
    set('--chorus-tab-active', themeConfig.tab_active)
    set('--chorus-misc', themeConfig.misc)
    set('--chorus-player', themeConfig.player)
    set('--chorus-notification', themeConfig.notification)
    set('--chorus-notification-error', themeConfig.notification_error)
    set('--chorus-highlight', themeConfig.main)
    set('--chorus-highlight-elevated', themeConfig.sidebar)

    applyThemeSurfaces(root, themeConfig)
}

export function removeTheme() {
    const themeLink = document.getElementById('chorus-theme')
    document.documentElement.style.cssText = ''
    const allOverrideStyles = document.querySelectorAll('style[id^="chorus-override-styles-"]')
    allOverrideStyles.forEach((style) => {
        document.head.removeChild(style)
    })
    if (themeLink) document.head.removeChild(themeLink)
}

export async function setTheme(theme: ThemeName): Promise<void> {
    if (theme == 'spotify') return removeTheme()
    const themeConfig = STATIC_THEMES[theme]
    if (!themeConfig) return

    await injectTheme(theme)

    if (!document?.documentElement?.style?.setProperty) return

    applyThemeVariables(themeConfig)
}

type ReplacementRule = {
    target: string
    replacement: string | ((match: string, alpha: string) => string)
}

function replacementRules(): ReplacementRule[] {
    return [
        { target: '#(181818|212121)', replacement: 'var(--chorus-player)' },
        { target: '#282828', replacement: 'var(--chorus-card)' },
        { target: '#(242424|1f1f1f)', replacement: 'var(--chorus-main-elevated)' },
        { target: '#121212', replacement: 'var(--chorus-main)' },
        { target: '#(242424|1f1f1f)', replacement: 'var(--chorus-card-elevated)' },
        { target: '#1a1a1a', replacement: 'var(--chorus-highlight)' },
        { target: '#2a2a2a', replacement: 'var(--chorus-highlight-elevated)' },
        { target: '#(000|000000)', replacement: 'var(--chorus-shadow)' },
        { target: '#(fff|ffffff)', replacement: 'var(--chorus-text)' },
        { target: '#(b3b3b3|a7a7a7)', replacement: 'var(--chorus-subtext)' },
        { target: '#(1ed760|1fdf64|169c46)', replacement: 'var(--chorus-button-active)' },
        { target: '#535353', replacement: 'var(--chorus-button-disabled)' },
        { target: '#(333|333333)', replacement: 'var(--chorus-tab-active)' },
        { target: '#7f7f7f', replacement: 'var(--chorus-misc)' },
        { target: '#(4687d6|2e77d0)', replacement: 'var(--chorus-notification)' },
        { target: '#(e22134|cd1a2b)', replacement: 'var(--chorus-notification-error)' },
        {
            target: `rgba\(18,18,18,([\d\.]+)\)$`,
            replacement: (_, alpha) => `rgba(var(--chorus-main), ${alpha})`
        },
        {
            target: `rgba\(40,40,40,([\d\.]+)\)$`,
            replacement: (_, alpha) => `rgba(var(--chorus-card), ${alpha})`
        },
        {
            target: `rgba\(0,0,0,([\d\.]+)\)`,
            replacement: (_, alpha) => `rgba(var(--chorus-rgb-shadow), ${alpha})`
        },
        {
            target: `hsla\(0,0%,100%,\.9\)`,
            replacement: (_, alpha) => `rgba(var(--chorus-rgb-text), ${alpha})`
        },
        {
            target: `hsla\(0,0%,100%,([\d\.]+)\)$`,
            replacement: (_, alpha) => `rgba(var(--chorus-rgb-selected-row), ${alpha})`
        }
    ]
}

export async function overrideExternalStyles() {
    const rulesToReplace = replacementRules()
    const styleSheets = Array.from(document.styleSheets)

    for (const sheet of styleSheets) {
        // Handle cross-origin stylesheets
        if (sheet.href) {
            try {
                const response = await fetch(sheet.href)
                const cssText = await response.text()

                let modifiedCSS = cssText
                let count = 0
                for (const { target, replacement } of rulesToReplace) {
                    const regex = new RegExp(target, 'gi')
                    modifiedCSS = modifiedCSS.replaceAll(
                        regex,
                        (match: string, ...groups: string[]) => {
                            if (typeof replacement === 'function') {
                                return `${replacement(match, groups[0] || '')} !important`
                            }
                            return `${replacement} !important`
                        }
                    )
                    count++
                }

                const styleEl = document.createElement('style')
                styleEl.id = `chorus-override-styles-${count}`
                styleEl.textContent = modifiedCSS
                document.head.appendChild(styleEl)
            } catch (fetchErr) {
                console.warn('Could not fetch and override:', sheet.href, fetchErr)
            }
        }
    }
}

export async function injectTheme(theme: ThemeName): Promise<void> {
    if (document.getElementById('chorus-theme')) return
    const themeConfig = STATIC_THEMES[theme]
    if (!themeConfig) return

    await overrideExternalStyles()

    const style = document.createElement('link')
    style.id = 'chorus-theme'
    style.rel = 'stylesheet'
    style.href = chrome.runtime.getURL('/content-scripts/theme.css')
    document.head.appendChild(style)
}
