import type { ReactElement } from 'react'

const base = (s: number, fill = false) =>
    ({
        width: s,
        height: s,
        viewBox: '0 0 24 24',
        fill: fill ? 'currentColor' : 'none',
        stroke: fill ? 'none' : 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        style: { flexShrink: 0, display: 'block' }
    }) as const

type Icon = (s: number) => ReactElement

export const Ic: Record<string, Icon> = {
    snip: (s) => (
        <svg {...base(s)}>
            <circle cx="6" cy="6" r="3" />
            <path d="M8.12 8.12 12 12" />
            <path d="M20 4 8.12 15.88" />
            <circle cx="6" cy="18" r="3" />
            <path d="M14.8 14.8 20 20" />
        </svg>
    ),
    speed: (s) => (
        <svg {...base(s)}>
            <path d="m12 14 4-4" />
            <path d="M3.34 19a10 10 0 1 1 17.32 0" />
        </svg>
    ),
    reverb: (s) => (
        <svg {...base(s)}>
            <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
            <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
            <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
        </svg>
    ),
    eq: (s) => (
        <svg {...base(s)}>
            <line x1="21" x2="14" y1="4" y2="4" />
            <line x1="10" x2="3" y1="4" y2="4" />
            <line x1="21" x2="12" y1="12" y2="12" />
            <line x1="8" x2="3" y1="12" y2="12" />
            <line x1="21" x2="16" y1="20" y2="20" />
            <line x1="12" x2="3" y1="20" y2="20" />
            <line x1="14" x2="14" y1="2" y2="6" />
            <line x1="8" x2="8" y1="10" y2="14" />
            <line x1="16" x2="16" y1="18" y2="22" />
        </svg>
    ),
    stereo: (s) => (
        <svg {...base(s)}>
            <path d="m18 8 4 4-4 4" />
            <path d="M2 12h20" />
            <path d="m6 8-4 4 4 4" />
        </svg>
    ),
    seek: (s) => (
        <svg {...base(s)}>
            <polygon points="13 19 22 12 13 5 13 19" />
            <polygon points="2 19 11 12 2 5 2 19" />
        </svg>
    ),
    settings: (s) => (
        <svg {...base(s)}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    ),
    heart: (s) => (
        <svg {...base(s, true)}>
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
    ),
    block: (s) => (
        <svg {...base(s)}>
            <circle cx="12" cy="12" r="10" />
            <path d="m4.9 4.9 14.2 14.2" />
        </svg>
    ),
    controls: (s) => (
        <svg {...base(s)}>
            <path d="M3 5h4m14 0H11m-8 7h12m6 0h-2M3 19h2m16 0H9" />
            <circle cx="9" cy="5" r="2" fill="currentColor" />
            <circle cx="17" cy="12" r="2" fill="currentColor" />
            <circle cx="7" cy="19" r="2" fill="currentColor" />
        </svg>
    ),
    pip: (s) => (
        <svg {...base(s)}>
            <path d="M2 10h6V4" />
            <path d="m2 4 6 6" />
            <path d="M21 10V7a2 2 0 0 0-2-2h-7" />
            <path d="M3 14v2a2 2 0 0 0 2 2h3" />
            <rect x="12" y="14" width="10" height="7" rx="1" />
        </svg>
    ),
    loop: (s) => (
        <svg {...base(s)}>
            <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z" />
        </svg>
    ),
    shuffle: (s) => (
        <svg {...base(s)}>
            <path d="m18 14 4 4-4 4" />
            <path d="m18 2 4 4-4 4" />
            <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" />
            <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" />
            <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" />
        </svg>
    ),
    repeat: (s) => (
        <svg {...base(s)}>
            <path d="m17 2 4 4-4 4" />
            <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
            <path d="m7 22-4-4 4-4" />
            <path d="M21 13v1a4 4 0 0 1-4 4H3" />
        </svg>
    ),
    rewind: (s) => (
        <svg {...base(s)}>
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
        </svg>
    ),
    prev: (s) => (
        <svg {...base(s, true)}>
            <polygon points="19 20 9 12 19 4 19 20" />
            <rect x="4" y="4" width="2" height="16" />
        </svg>
    ),
    next: (s) => (
        <svg {...base(s, true)}>
            <polygon points="5 4 15 12 5 20 5 4" />
            <rect x="18" y="4" width="2" height="16" />
        </svg>
    ),
    pause: (s) => (
        <svg {...base(s, true)}>
            <rect x="14" y="4" width="4" height="16" rx="1" />
            <rect x="6" y="4" width="4" height="16" rx="1" />
        </svg>
    ),
    play: (s) => (
        <svg {...base(s, true)}>
            <polygon points="6 3 20 12 6 21 6 3" />
        </svg>
    ),
    check: (s) => (
        <svg {...base(s)}>
            <path d="M20 6 9 17l-5-5" />
        </svg>
    ),
    trash: (s) => (
        <svg {...base(s)}>
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
    ),
    pin: (s) => (
        <svg {...base(s)}>
            <path d="M12 17v5" />
            <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
        </svg>
    ),
    volume: (s) => (
        <svg {...base(s)}>
            <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
            <path d="M16 9a5 5 0 0 1 0 6" />
            <path d="M19.364 18.364a9 9 0 0 0 0-12.728" />
        </svg>
    ),
    reset: (s) => (
        <svg {...base(s)}>
            <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
            <path d="M3 7v6h6" />
            <circle cx="12" cy="17" r="1" fill="currentColor" />
        </svg>
    ),
    x: (s) => (
        <svg {...base(s)}>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    ),
    plus: (s) => (
        <svg {...base(s)}>
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    ),
    minus: (s) => (
        <svg {...base(s)}>
            <path d="M5 12h14" />
        </svg>
    ),
    info: (s) => (
        <svg {...base(s)}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
        </svg>
    ),
    nowplaying: (s) => (
        <svg {...base(s)}>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M10 9v6l5-3z" fill="currentColor" stroke="none" />
        </svg>
    ),
    queue: (s) => (
        <svg {...base(s)}>
            <path d="M3 6h13" />
            <path d="M3 12h13" />
            <path d="M3 18h9" />
            <path d="m19 10 3 2-3 2z" fill="currentColor" />
        </svg>
    ),
    keyboard: (s) => (
        <svg {...base(s)}>
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
        </svg>
    ),
    share: (s) => (
        <svg {...base(s)}>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" x2="12" y1="2" y2="15" />
        </svg>
    ),
    palette: (s) => (
        <svg {...base(s)}>
            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
            <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
            <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
            <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
        </svg>
    ),
    power: (s) => (
        <svg {...base(s)}>
            <path d="M12 2v10" />
            <path d="M18.4 6.6a9 9 0 1 1-12.77.04" />
        </svg>
    ),
    sliders: (s) => (
        <svg {...base(s)}>
            <line x1="4" x2="4" y1="21" y2="14" />
            <line x1="4" x2="4" y1="10" y2="3" />
            <line x1="12" x2="12" y1="21" y2="12" />
            <line x1="12" x2="12" y1="8" y2="3" />
            <line x1="20" x2="20" y1="21" y2="16" />
            <line x1="20" x2="20" y1="12" y2="3" />
            <line x1="2" x2="6" y1="14" y2="14" />
            <line x1="10" x2="14" y1="8" y2="8" />
            <line x1="18" x2="22" y1="16" y2="16" />
        </svg>
    ),
    vocal: (s) => (
        <svg {...base(s)}>
            <path d="M2 10v3" />
            <path d="M6 6v11" />
            <path d="M10 3v18" />
            <path d="M14 8v7" />
            <path d="M18 5v13" />
            <path d="M22 10v3" />
        </svg>
    ),
    bell: (s) => (
        <svg {...base(s)}>
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
    ),
    chevron: (s) => (
        <svg {...base(s)}>
            <path d="m6 9 6 6 6-6" />
        </svg>
    )
}
