import { fontFamily } from 'tailwindcss/defaultTheme'
import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

const config: Config = {
    darkMode: ['class'],
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
            colors: {
                // ---- studio tokens ----
                ink: {
                    DEFAULT: 'hsl(var(--ink) / <alpha-value>)',
                    fg: 'hsl(var(--ink-fg) / <alpha-value>)',
                    'fg-2': 'hsl(var(--ink-fg-2) / <alpha-value>)',
                    muted: 'hsl(var(--ink-muted) / <alpha-value>)',
                    dim: 'hsl(var(--ink-dim) / <alpha-value>)'
                },
                panel: 'hsl(var(--panel) / <alpha-value>)',
                surface: {
                    DEFAULT: 'hsl(var(--surface) / <alpha-value>)',
                    2: 'hsl(var(--surface-2) / <alpha-value>)'
                },
                inset: 'hsl(var(--inset) / <alpha-value>)',
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
                input: 'hsl(var(--input) / <alpha-value>)',
                ring: 'hsl(var(--ring) / <alpha-value>)',
                background: 'hsl(var(--background) / <alpha-value>)',
                foreground: 'hsl(var(--foreground) / <alpha-value>)',
                primary: {
                    DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
                    foreground: 'hsl(var(--primary-foreground) / <alpha-value>)'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
                    foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
                    foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
                    foreground: 'hsl(var(--muted-foreground) / <alpha-value>)'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
                    foreground: 'hsl(var(--accent-foreground) / <alpha-value>)'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
                    foreground: 'hsl(var(--popover-foreground) / <alpha-value>)'
                },
                card: {
                    DEFAULT: 'hsl(var(--card) / <alpha-value>)',
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
                float: '0 12px 40px -12px hsl(var(--ink) / 0.9), 0 0 0 1px hsl(var(--ink-fg) / 0.06)',
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
