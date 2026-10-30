import { fontFamily } from 'tailwindcss/defaultTheme'
import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

/**
 * The surface tokens below multiply their alpha by `--surface-alpha`, which the
 * glass material lowers, so a panel and the cards inside it go translucent
 * together. That must stop at backgrounds: text, borders, focus-ring offsets,
 * icon fills and placeholders painted in the same tokens stay at full strength,
 * or the ink text on a signal chip fades to the glass's opacity.
 */
const opaque = (name: string) => `hsl(var(--${name}) / <alpha-value>)`
const opaqueSurfaceTokens = {
    ink: { DEFAULT: opaque('ink') },
    panel: opaque('panel'),
    surface: { DEFAULT: opaque('surface'), 2: opaque('surface-2') },
    inset: opaque('inset'),
    input: opaque('input'),
    background: opaque('background'),
    secondary: { DEFAULT: opaque('secondary') },
    muted: { DEFAULT: opaque('muted') },
    accent: { DEFAULT: opaque('accent') },
    popover: { DEFAULT: opaque('popover') },
    card: { DEFAULT: opaque('card') }
}

const config: Config = {
    darkMode: ['class'],
    // The preflight is imported by app.css inside the `chorus-base` cascade
    // layer instead, so it cannot outrank Spotify's own layered styles.
    corePlugins: { preflight: false },
    content: ['./src/**/*.{html,js,svelte,ts}'],
    safelist: ['dark'],
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                '2xl': '1400px',
                '3xl': '1600px',
                '4xl': '1800px'
            }
        },
        screens: {
            '2xl': '1400px',
            '3xl': '1600px',
            '4xl': '1800px'
        },
        extend: {
            textColor: opaqueSurfaceTokens,
            borderColor: opaqueSurfaceTokens,
            ringOffsetColor: opaqueSurfaceTokens,
            outlineColor: opaqueSurfaceTokens,
            placeholderColor: opaqueSurfaceTokens,
            fill: opaqueSurfaceTokens,
            stroke: opaqueSurfaceTokens,
            colors: {
                // ---- studio tokens ----
                // Surface colours multiply their alpha by --surface-alpha, which frosted
                // floating panels lower (app.css) so every surface inside goes translucent.
                ink: {
                    DEFAULT: 'hsl(var(--ink) / calc(<alpha-value> * var(--surface-alpha, 1)))',
                    fg: 'hsl(var(--ink-fg) / <alpha-value>)',
                    'fg-2': 'hsl(var(--ink-fg-2) / <alpha-value>)',
                    muted: 'hsl(var(--ink-muted) / <alpha-value>)',
                    dim: 'hsl(var(--ink-dim) / <alpha-value>)'
                },
                panel: 'hsl(var(--panel) / calc(<alpha-value> * var(--surface-alpha, 1)))',
                surface: {
                    DEFAULT: 'hsl(var(--surface) / calc(<alpha-value> * var(--surface-alpha, 1)))',
                    2: 'hsl(var(--surface-2) / calc(<alpha-value> * var(--surface-alpha, 1)))'
                },
                inset: 'hsl(var(--inset) / calc(<alpha-value> * var(--surface-alpha, 1)))',
                hairline: {
                    DEFAULT: 'hsl(var(--ink-fg) / 0.08)',
                    strong: 'hsl(var(--ink-fg) / 0.14)'
                },
                dim: 'hsl(var(--ink-dim) / <alpha-value>)',
                signal: {
                    DEFAULT: 'hsl(var(--signal) / <alpha-value>)',
                    bright: 'hsl(var(--signal-bright) / <alpha-value>)',
                    dark: 'hsl(var(--signal-dark) / <alpha-value>)',
                    bar: 'hsl(var(--bar-signal) / <alpha-value>)'
                },
                amber: 'hsl(var(--amber) / <alpha-value>)',
                alarm: 'hsl(var(--alarm) / <alpha-value>)',
                spotify: 'hsl(var(--spotify) / <alpha-value>)',

                // ---- shadcn aliases ----
                border: 'hsl(var(--border) / <alpha-value>)',
                input: 'hsl(var(--input) / calc(<alpha-value> * var(--surface-alpha, 1)))',
                ring: 'hsl(var(--ring) / <alpha-value>)',
                background:
                    'hsl(var(--background) / calc(<alpha-value> * var(--surface-alpha, 1)))',
                foreground: 'hsl(var(--foreground) / <alpha-value>)',
                primary: {
                    DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
                    foreground: 'hsl(var(--primary-foreground) / <alpha-value>)'
                },
                secondary: {
                    DEFAULT:
                        'hsl(var(--secondary) / calc(<alpha-value> * var(--surface-alpha, 1)))',
                    foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
                    foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted) / calc(<alpha-value> * var(--surface-alpha, 1)))',
                    foreground: 'hsl(var(--muted-foreground) / <alpha-value>)'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent) / calc(<alpha-value> * var(--surface-alpha, 1)))',
                    foreground: 'hsl(var(--accent-foreground) / <alpha-value>)'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover) / calc(<alpha-value> * var(--surface-alpha, 1)))',
                    foreground: 'hsl(var(--popover-foreground) / <alpha-value>)'
                },
                card: {
                    DEFAULT: 'hsl(var(--card) / calc(<alpha-value> * var(--surface-alpha, 1)))',
                    foreground: 'hsl(var(--card-foreground) / <alpha-value>)'
                }
            },
            borderRadius: {
                xl: 'calc(var(--radius) + 4px)',
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 4px)',
                sm: 'calc(var(--radius) - 6px)'
            },
            fontFamily: {
                sans: [...fontFamily.sans],
                mono: [
                    'ui-monospace',
                    'SFMono-Regular',
                    'SF Mono',
                    'Menlo',
                    'Consolas',
                    'Liberation Mono',
                    'monospace'
                ]
            },
            boxShadow: {
                float: '0 12px 40px -12px hsl(var(--shadow) / var(--shadow-alpha)), 0 0 0 1px hsl(var(--ink-fg) / 0.06)',
                led: '0 0 6px 1px hsl(var(--signal) / 0.55)'
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--bits-accordion-content-height)' }
                },
                'accordion-up': {
                    from: { height: 'var(--bits-accordion-content-height)' },
                    to: { height: '0' }
                },
                'caret-blink': {
                    '0%,70%,100%': { opacity: '1' },
                    '20%,50%': { opacity: '0' }
                },
                'led-pulse': {
                    '0%,100%': { opacity: '1' },
                    '50%': { opacity: '0.45' }
                }
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'caret-blink': 'caret-blink 1.25s ease-out infinite',
                'led-pulse': 'led-pulse 1.6s ease-in-out infinite'
            }
        }
    },
    plugins: [tailwindcssAnimate]
}

export default config
