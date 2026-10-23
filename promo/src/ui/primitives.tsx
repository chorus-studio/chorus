import type { CSSProperties, ReactNode } from 'react'
import { AbsoluteFill, interpolateColors, random, useCurrentFrame } from 'remotion'
import { C, FONT } from '../theme'
import { POP, SNAP, clamp01, sp } from '../anim'
import { Ic } from './icons'

// ---------- brand ---------------------------------------------------------

export const Mark = ({
    size = 64,
    draw = 1,
    dot = 1,
    color = C.green,
    dotColor = '#ffffff',
    style
}: {
    size?: number
    draw?: number
    dot?: number
    color?: string
    dotColor?: string
    style?: CSSProperties
}) => {
    const d1 = clamp01(draw)
    const d2 = clamp01(draw * 1.3 - 0.3)
    return (
        <svg width={size} height={size} viewBox="0 0 128 128" fill="none" style={{ display: 'block', ...style }}>
            <path
                d="M107.2 36.97A51 51 0 1 0 107.2 91.03"
                stroke={color}
                strokeWidth={14}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset={1 - d1}
                opacity={d1 > 0.001 ? 1 : 0}
            />
            <path
                d="M86.98 44.72A30 30 0 1 0 86.98 83.28"
                stroke={color}
                strokeWidth={14}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset={1 - d2}
                opacity={d2 > 0.001 ? 1 : 0}
            />
            <circle cx={64} cy={64} r={10 * clamp01(dot)} fill={dotColor} />
        </svg>
    )
}

// ---------- typography ------------------------------------------------------

export const Eyebrow = ({
    children,
    delay = 0,
    color = C.green,
    size = 22,
    style
}: {
    children: ReactNode
    delay?: number
    color?: string
    size?: number
    style?: CSSProperties
}) => {
    const f = useCurrentFrame()
    const p = sp(f, delay, SNAP)
    return (
        <div
            style={{
                fontFamily: FONT.mono,
                fontSize: size,
                letterSpacing: `${0.2 + (1 - p) * 0.5}em`,
                textTransform: 'uppercase',
                color,
                opacity: p,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                ...style
            }}
        >
            {children}
        </div>
    )
}

type Line = { text: string; color?: string }

export const Headline = ({
    lines,
    delay = 0,
    size = 120,
    stagger = 4,
    align = 'left',
    config = POP,
    style
}: {
    lines: Line[]
    delay?: number
    size?: number
    stagger?: number
    align?: 'left' | 'center'
    config?: { damping: number; stiffness: number; mass: number }
    style?: CSSProperties
}) => {
    const f = useCurrentFrame()
    let i = 0
    return (
        <div
            style={{
                fontFamily: FONT.display,
                fontWeight: 700,
                fontSize: size,
                lineHeight: 1.02,
                letterSpacing: '-0.03em',
                color: '#fff',
                ...style
            }}
        >
            {lines.map((line, li) => (
                <div
                    key={li}
                    style={{
                        display: 'flex',
                        gap: size * 0.24,
                        justifyContent: align === 'center' ? 'center' : 'flex-start',
                        color: line.color,
                        whiteSpace: 'nowrap'
                    }}
                >
                    {line.text.split(' ').map((w, wi) => {
                        const d = delay + i++ * stagger
                        const s = sp(f, d, config)
                        return (
                            <span
                                key={wi}
                                style={{
                                    display: 'inline-block',
                                    opacity: clamp01(s * 1.6),
                                    transform: `translateY(${(1 - s) * size * 0.6}px) rotate(${(1 - s) * 3}deg)`,
                                    transformOrigin: '0 100%'
                                }}
                            >
                                {w}
                            </span>
                        )
                    })}
                </div>
            ))}
        </div>
    )
}

export const Sub = ({
    children,
    delay = 0,
    size = 30,
    width = 720,
    color = C.muted,
    style
}: {
    children: ReactNode
    delay?: number
    size?: number
    width?: number
    color?: string
    style?: CSSProperties
}) => {
    const f = useCurrentFrame()
    const p = sp(f, delay, SNAP)
    return (
        <div
            style={{
                fontFamily: FONT.ui,
                fontSize: size,
                lineHeight: 1.45,
                color,
                maxWidth: width,
                opacity: p,
                transform: `translateY(${(1 - p) * 28}px)`,
                ...style
            }}
        >
            {children}
        </div>
    )
}

export const Pill = ({
    children,
    icon,
    size = 26,
    style
}: {
    children: ReactNode
    icon?: ReactNode
    size?: number
    style?: CSSProperties
}) => (
    <div
        style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            fontFamily: FONT.ui,
            fontSize: size,
            color: C.textDim,
            border: `1px solid ${C.border}`,
            borderRadius: 999,
            padding: `${size * 0.5}px ${size * 0.9}px`,
            lineHeight: 1,
            background: 'rgba(18,18,18,.6)',
            whiteSpace: 'nowrap',
            ...style
        }}
    >
        {icon}
        {children}
    </div>
)

// ---------- background ------------------------------------------------------

export const Background = ({ frame, kick }: { frame: number; kick: number }) => {
    const gx = 50 + 32 * Math.sin(frame / 420)
    const gy = 42 + 22 * Math.cos(frame / 560)
    return (
        <AbsoluteFill style={{ background: C.bg }}>
            <AbsoluteFill
                style={{
                    background: `radial-gradient(55% 65% at ${gx}% ${gy}%, rgba(30,215,96,${(0.09 + 0.08 * kick).toFixed(3)}) 0%, rgba(30,215,96,0) 65%)`
                }}
            />
            <AbsoluteFill
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,.08) 1.2px, transparent 1.2px)',
                    backgroundSize: '36px 36px',
                    opacity: 0.5
                }}
            />
            <AbsoluteFill
                style={{
                    background:
                        'radial-gradient(75% 75% at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,.62) 100%)'
                }}
            />
        </AbsoluteFill>
    )
}

// ---------- waveform --------------------------------------------------------

export const Waveform = ({
    bars = 80,
    width,
    height,
    seed = 'wf',
    color = C.green,
    frame,
    amp = 1,
    gap = 3,
    radius = 2,
    envelope = true,
    style
}: {
    bars?: number
    width: number
    height: number
    seed?: string
    color?: string
    frame: number
    amp?: number
    gap?: number
    radius?: number
    envelope?: boolean
    style?: CSSProperties
}) => {
    const bw = width / bars - gap
    return (
        <div style={{ width, height, display: 'flex', alignItems: 'center', gap, ...style }}>
            {Array.from({ length: bars }, (_, i) => {
                const env = envelope ? 0.35 + 0.65 * Math.sin((i / bars) * Math.PI) : 1
                const base = 0.22 + 0.78 * random(`${seed}${i}`)
                const wob = 1 + 0.2 * Math.sin(frame / 2.6 + i * 0.9) * Math.sin(frame / 7 + i)
                const h = Math.max(3, height * base * env * wob * amp)
                return (
                    <div
                        key={i}
                        style={{ width: bw, height: h, borderRadius: radius, background: color, flexShrink: 0 }}
                    />
                )
            })}
        </div>
    )
}

// ---------- design-px UI (used inside scaled popovers) ----------------------

export const Rack = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
    <span
        style={{
            fontFamily: FONT.mono,
            fontSize: 10,
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            color: C.muted,
            lineHeight: 1,
            ...style
        }}
    >
        {children}
    </span>
)

export const Readout = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
    <div
        style={{
            background: C.well,
            border: `1px solid ${C.line}`,
            borderRadius: 6,
            fontFamily: FONT.mono,
            fontSize: 12,
            color: '#fff',
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 6px',
            boxSizing: 'border-box',
            flex: 1,
            minWidth: 0,
            ...style
        }}
    >
        {children}
    </div>
)

export const Nud = ({ plus }: { plus?: boolean }) => (
    <div
        style={{
            width: 24,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            color: C.textDim,
            background: C.soft,
            flexShrink: 0
        }}
    >
        {plus ? Ic.plus(12) : Ic.minus(12)}
    </div>
)

export const Seg = ({
    items,
    active,
    mono,
    height = 22,
    grow,
    activeColor = C.green
}: {
    items: string[]
    active: number
    mono?: boolean
    height?: number
    grow?: boolean
    activeColor?: string
}) => (
    <div
        style={{
            display: grow ? 'flex' : 'inline-flex',
            width: grow ? '100%' : undefined,
            height,
            padding: 2,
            gap: 2,
            border: `1px solid ${C.line}`,
            background: C.well,
            borderRadius: 6,
            boxSizing: 'border-box'
        }}
    >
        {items.map((t, i) => (
            <span
                key={t}
                style={{
                    flex: grow ? 1 : undefined,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: i === active ? activeColor : C.muted,
                    background: i === active ? C.soft : 'transparent',
                    fontSize: height > 24 ? 12 : 11,
                    fontWeight: 500,
                    padding: '0 7px',
                    borderRadius: 4,
                    lineHeight: 1,
                    fontFamily: mono ? FONT.mono : FONT.ui
                }}
            >
                {t}
            </span>
        ))}
    </div>
)

export const Btn = ({
    children,
    variant = 'ghost',
    height = 28,
    style
}: {
    children: ReactNode
    variant?: 'primary' | 'ghost' | 'alarm' | 'soft'
    height?: number
    style?: CSSProperties
}) => {
    const look: Record<string, CSSProperties> = {
        primary: { background: C.green, color: C.ground },
        ghost: { background: 'transparent', color: C.textDim },
        alarm: { background: 'transparent', color: C.alarm },
        soft: { background: C.soft, color: '#fff' }
    }
    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                height,
                padding: '0 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                lineHeight: 1,
                fontFamily: FONT.ui,
                ...look[variant],
                ...style
            }}
        >
            {children}
        </div>
    )
}

export const Chip = ({
    children,
    on,
    star,
    style
}: {
    children: ReactNode
    on?: boolean
    star?: boolean
    style?: CSSProperties
}) => (
    <span
        style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            height: 22,
            padding: '0 7px',
            borderRadius: 6,
            border: `1px solid ${on ? 'rgba(30,215,96,.5)' : C.line}`,
            background: on ? 'rgba(30,215,96,.15)' : C.raised,
            color: on ? C.green2 : C.textDim,
            fontSize: 11,
            fontFamily: FONT.mono,
            ...style
        }}
    >
        {star ? (
            <svg width={9} height={9} viewBox="0 0 24 24" fill={C.amber} stroke={C.amber}>
                <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
            </svg>
        ) : null}
        {children}
    </span>
)

/** p: 0 = off, 1 = on (animatable) */
export const Switch = ({ p, scale = 1 }: { p: number; scale?: number }) => {
    const q = clamp01(p)
    return (
        <span
            style={{
                width: 30 * scale,
                height: 18 * scale,
                borderRadius: 999,
                background: interpolateColors(q, [0, 1], [C.soft, C.green]),
                position: 'relative',
                display: 'inline-block',
                flexShrink: 0
            }}
        >
            <span
                style={{
                    position: 'absolute',
                    top: 2 * scale,
                    left: (2 + 12 * q) * scale,
                    width: 14 * scale,
                    height: 14 * scale,
                    borderRadius: 999,
                    background: interpolateColors(q, [0, 1], [C.textDim, C.ground])
                }}
            />
        </span>
    )
}

export const Card = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
    <div
        style={{
            background: C.panel,
            border: `1px solid ${C.line}`,
            borderRadius: 8,
            boxSizing: 'border-box',
            padding: '7px 10px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            ...style
        }}
    >
        {children}
    </div>
)

export const Led = ({ size = 6, color = C.green, style }: { size?: number; color?: string; style?: CSSProperties }) => (
    <span
        style={{
            width: size,
            height: size,
            borderRadius: 999,
            background: color,
            boxShadow: `0 0 ${size}px ${size / 6}px ${color}99`,
            display: 'inline-block',
            flexShrink: 0,
            ...style
        }}
    />
)

/** placeholder album art, same as the design boards */
export const Art = ({ size, radius = 6 }: { size: number; radius?: number }) => (
    <div
        style={{
            width: size,
            height: size,
            borderRadius: radius,
            background: 'linear-gradient(135deg,#2a9d8f,#264653 70%)',
            flexShrink: 0,
            position: 'relative',
            overflow: 'hidden'
        }}
    >
        <div
            style={{
                position: 'absolute',
                right: -size * 0.19,
                bottom: -size * 0.19,
                width: size * 0.69,
                height: size * 0.69,
                borderRadius: 999,
                background: '#e9c46a'
            }}
        />
    </div>
)

// ---------- popover chrome at design px (400×320) ---------------------------

const TABS: { key: string; label: string; icon: string; led?: boolean }[] = [
    { key: 'snip', label: 'Snip', icon: 'snip', led: true },
    { key: 'speed', label: 'Speed', icon: 'speed', led: true },
    { key: 'reverb', label: 'Reverb', icon: 'reverb' },
    { key: 'eq', label: 'EQ', icon: 'eq' },
    { key: 'stereo', label: 'Stereo', icon: 'stereo' },
    { key: 'seek', label: 'Seek', icon: 'seek' }
]

const Tab = ({ icon, label, on, led }: { icon: string; label?: string; on?: boolean; led?: boolean }) => (
    <span
        style={{
            height: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: label ? '0 8px' : 0,
            width: label ? undefined : 28,
            borderRadius: 6,
            color: on ? '#fff' : C.muted,
            background: on ? C.soft : 'transparent',
            fontSize: 12,
            fontWeight: 500,
            position: 'relative',
            boxSizing: 'border-box',
            fontFamily: FONT.ui
        }}
    >
        {Ic[icon](14)}
        {label}
        {led ? <Led size={4} style={{ position: 'absolute', right: 4, top: 4 }} /> : null}
    </span>
)

export const Shell = ({
    active,
    children,
    footer,
    width = 400,
    height = 320,
    leds = ['snip', 'speed']
}: {
    active: string
    children: ReactNode
    footer?: ReactNode
    width?: number
    height?: number
    leds?: string[]
}) => (
    <div
        style={{
            width,
            height,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            background: C.ground,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 30px 80px -20px rgba(0,0,0,.9)',
            fontFamily: FONT.ui,
            color: '#fff'
        }}
    >
        <div
            style={{
                height: 44,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 8px 0 12px',
                borderBottom: `1px solid ${C.line}`,
                flexShrink: 0
            }}
        >
            <Mark size={18} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                {TABS.map((t) => (
                    <Tab
                        key={t.key}
                        icon={t.icon}
                        label={t.key === active ? t.label : undefined}
                        on={t.key === active}
                        led={leds.includes(t.key)}
                    />
                ))}
            </div>
            <Tab icon="settings" />
        </div>
        <div
            style={{
                flex: 1,
                minHeight: 0,
                padding: '10px 16px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
            }}
        >
            {children}
        </div>
        {footer ? (
            <div
                style={{
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 8px',
                    borderTop: `1px solid ${C.line}`,
                    flexShrink: 0
                }}
            >
                {footer}
            </div>
        ) : null}
    </div>
)

/** scales design-px markup up for the 1080p frame */
export const Scaled = ({
    k,
    w,
    h,
    children,
    style
}: {
    k: number
    w: number
    h: number
    children: ReactNode
    style?: CSSProperties
}) => (
    <div style={{ width: w * k, height: h * k, position: 'relative', ...style }}>
        <div style={{ width: w, height: h, transform: `scale(${k})`, transformOrigin: '0 0' }}>{children}</div>
    </div>
)

export const Toast = ({
    title,
    detail,
    p
}: {
    title: string
    detail: string
    p: number
}) => (
    <div
        role="status"
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            padding: '18px 22px',
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            background: C.raised,
            boxShadow: '0 24px 60px -16px rgba(0,0,0,.9)',
            fontFamily: FONT.ui,
            opacity: clamp01(p * 1.5),
            transform: `translateY(${(1 - p) * 60}px)`,
            width: 620,
            boxSizing: 'border-box'
        }}
    >
        <span
            style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                background: 'rgba(30,215,96,.15)',
                color: C.green,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
            }}
        >
            {Ic.check(24)}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 24, fontWeight: 500, color: '#fff' }}>{title}</span>
            <span style={{ fontSize: 19, color: C.muted }}>{detail}</span>
        </div>
    </div>
)
