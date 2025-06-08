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

export const THEME_NAMES: ThemeName[] = [
    'spotify',
    'forest_green',
    'matcha',
    'artic',
    'ocean',
    'cherry_blossom',
    'hot_pink',
    'raisin',
    'ubuntu',
    'regal',
    'imperial',
    'citrus',
    'lava',
    'mars',
    'desert'
]

export type ThemeName =
    | 'spotify'
    | 'forest_green'
    | 'matcha'
    | 'artic'
    | 'ocean'
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
        card: '#007baa',
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
        card: '#c94277',
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
        card: '#51a140',
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
        subtext: '#a06c99',
        main: '#1a0e17',
        sidebar: '#1a0e17',
        player: '#1a0e17',
        card: '#241221',
        shadow: '#241221',
        selected_row: '#7b3c6e',
        button: '#7b3c6e',
        button_active: '#7b3c6e',
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
        card: '#a00000',
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
        text: '#ffebc3',
        subtext: '#fff6e0',
        main: '#c64e00',
        sidebar: '#c64e00',
        player: '#c64e00',
        card: '#ff6b00',
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
        text: '#d8bfd8',
        subtext: '#d8bfd8',
        main: '#9932cc',
        sidebar: '#9932cc',
        player: '#9932cc',
        card: '#9400d3',
        shadow: '#9400d3',
        selected_row: '#8a2be2',
        button: '#9932cc',
        button_active: '#9932cc',
        button_disabled: '#ba55d3',
        tab_active: '#d8bfd8',
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
        selected_row: '#99005e',
        button: '#99005e',
        button_active: '#99005e',
        button_disabled: '#cc0078',
        tab_active: '#ff92d5',
        notification: '#660043',
        notification_error: '#ff6003',
        misc: '#3b002e'
    }
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

export async function setTheme(theme: ThemeName) {
    if (theme == 'spotify') return removeTheme()
    const themeConfig = STATIC_THEMES[theme]
    if (!themeConfig) return

    await injectTheme(theme)

    const setRoot = document?.documentElement?.style?.setProperty

    if (!setRoot) return

    // colours
    document.documentElement.style.setProperty('--chorus-main', themeConfig.main)
    document.documentElement.style.setProperty('--chorus-card', themeConfig.card)
    document.documentElement.style.setProperty('--chorus-sidebar', themeConfig.sidebar)
    document.documentElement.style.setProperty('--chorus-button', themeConfig.button)
    document.documentElement.style.setProperty('--chorus-subtext', themeConfig.subtext)
    document.documentElement.style.setProperty('--chorus-text', themeConfig.text)
    document.documentElement.style.setProperty('--chorus-selected-row', themeConfig.selected_row)
    document.documentElement.style.setProperty('--chorus-shadow', themeConfig.shadow)
    document.documentElement.style.setProperty('--chorus-button-active', themeConfig.button_active)
    document.documentElement.style.setProperty(
        '--chorus-button-disabled',
        themeConfig.button_disabled
    )
    document.documentElement.style.setProperty('--chorus-tab-active', themeConfig.tab_active)
    document.documentElement.style.setProperty('--chorus-misc', themeConfig.misc)
    document.documentElement.style.setProperty('--chorus-player', themeConfig.player)
    document.documentElement.style.setProperty('--chorus-notification', themeConfig.notification)
    document.documentElement.style.setProperty(
        '--chorus-notification-error',
        themeConfig.notification_error
    )
    document.documentElement.style.setProperty('--chorus-highlight', themeConfig.main)
    document.documentElement.style.setProperty('--chorus-highlight-elevated', themeConfig.sidebar)
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
            console.log('overriding', sheet.href)
            try {
                const response = await fetch(sheet.href)
                const cssText = await response.text()

                let modifiedCSS = cssText
                let count = 0
                for (const { target, replacement } of rulesToReplace) {
                    const regex = new RegExp(target, 'gi')
                    modifiedCSS = modifiedCSS.replaceAll(regex, (...args) => {
                        if (typeof replacement === 'function') {
                            return `${replacement(...args)} !important`
                        }
                        return `${replacement} !important`
                    })
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

export async function injectTheme(theme: ThemeName) {
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
