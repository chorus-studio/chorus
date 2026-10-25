import { AbsoluteFill, Easing } from 'remotion'
import { C, FONT } from '../theme'
import { POP, SNAP, clamp01, ease, exitStyle, sp, useScene } from '../anim'
import { Eyebrow, Headline, Sub } from '../ui/primitives'

export const SHAPE_LEN = 180

const GAINS = [3.5, 3, 2, 1, 0, 0, 0, -1, -1.5, -2]
const FREQS = ['32', '64', '125', '250', '500', '1k', '2k', '4k', '8k', '16k']
const PX_PER_DB = 26
const COL = 104
const TRACK_H = 340

const ROOMS = [
    { name: 'Studio', decay: 0.6, r: 220 },
    { name: 'Concert hall', decay: 2.1, r: 360 },
    { name: 'Cathedral', decay: 4.6, r: 520 }
]
const ROOM_AT = [100, 128, 156]

function smoothPath(pts: { x: number; y: number }[]) {
    let d = `M${pts[0].x},${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)]
        const p1 = pts[i]
        const p2 = pts[i + 1]
        const p3 = pts[Math.min(pts.length - 1, i + 2)]
        const c1x = p1.x + (p2.x - p0.x) / 6
        const c1y = p1.y + (p2.y - p0.y) / 6
        const c2x = p2.x - (p3.x - p1.x) / 6
        const c2y = p2.y - (p3.y - p1.y) / 6
        d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
    }
    return d
}

export const ShapeScene = () => {
    const { frame, exit } = useScene(SHAPE_LEN, 10)
    const eqIn = sp(frame, 4, SNAP)
    const eqOut = ease(frame, 88, 100, 0, 1, Easing.in(Easing.cubic))
    const curveDraw = ease(frame, 30, 70, 0, 1, Easing.out(Easing.cubic))

    const W = COL * GAINS.length
    const zeroY = TRACK_H / 2
    const pts = GAINS.map((g, i) => {
        const s = sp(frame, 12 + i * 4, POP)
        return { x: COL * i + COL / 2, y: zeroY - g * PX_PER_DB * s, g: g * s }
    })
    const path = smoothPath(pts)
    const area = `${path} L${pts[pts.length - 1].x},${zeroY} L${pts[0].x},${zeroY} Z`

    // reverb beat
    const roomIdx = ROOM_AT.filter((a) => frame >= a).length - 1
    const reverbIn = sp(frame, 98, SNAP)

    return (
        <AbsoluteFill>
            <div style={{ position: 'absolute', left: 120, top: 110, display: 'flex', flexDirection: 'column', gap: 24, ...exitStyle(exit) }}>
                <Eyebrow delay={0}>03 · EQ · Reverb · Stereo</Eyebrow>
                <Headline size={120} delay={4} lines={[{ text: 'Shape the sound.' }]} />
                <Sub delay={30} width={1200} size={30}>
                    Ten bands with presets you can save, reverb rooms from a small studio to a cathedral, and stereo width.
                </Sub>
            </div>

            {/* EQ */}
            <div
                style={{
                    position: 'absolute',
                    left: (1920 - W) / 2,
                    top: 470,
                    width: W,
                    opacity: eqIn * (1 - eqOut),
                    transform: `translateX(${-260 * eqOut}px) translateY(${(1 - eqIn) * 40}px) scale(${1 - 0.1 * eqOut})`
                }}
            >
                <svg width={W} height={TRACK_H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
                    <defs>
                        <linearGradient id="eqfill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0" stopColor={C.green} stopOpacity={0.28} />
                            <stop offset="1" stopColor={C.green} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <line x1={0} x2={W} y1={zeroY} y2={zeroY} stroke="rgba(255,255,255,.14)" strokeDasharray="4 8" />
                    <path d={area} fill="url(#eqfill)" opacity={curveDraw} />
                    <path
                        d={path}
                        fill="none"
                        stroke={C.green}
                        strokeWidth={4}
                        strokeLinecap="round"
                        pathLength={1}
                        strokeDasharray="1 1"
                        strokeDashoffset={1 - curveDraw}
                    />
                </svg>
                {pts.map((p, i) => (
                    <div key={i} style={{ position: 'absolute', left: COL * i, top: 0, width: COL, height: TRACK_H }}>
                        <div style={{ position: 'absolute', left: COL / 2 - 2, top: 0, bottom: 0, width: 4, borderRadius: 999, background: 'rgba(255,255,255,.1)' }} />
                        <div
                            style={{
                                position: 'absolute',
                                left: COL / 2 - 13,
                                top: p.y - 13,
                                width: 26,
                                height: 26,
                                borderRadius: 999,
                                background: '#fff',
                                border: `5px solid ${C.ground}`,
                                boxSizing: 'border-box',
                                boxShadow: `0 0 0 2px ${C.green}`
                            }}
                        />
                        <span
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: p.y - 48,
                                textAlign: 'center',
                                fontFamily: FONT.mono,
                                fontSize: 18,
                                color: Math.abs(p.g) > 0.05 ? C.green2 : C.muted
                            }}
                        >
                            {p.g > 0.05 ? '+' : ''}
                            {p.g.toFixed(1)}
                        </span>
                        <span
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: TRACK_H + 22,
                                textAlign: 'center',
                                fontFamily: FONT.mono,
                                fontSize: 18,
                                color: C.muted
                            }}
                        >
                            {FREQS[i]}
                        </span>
                    </div>
                ))}
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: -70,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        fontFamily: FONT.ui,
                        fontSize: 22,
                        color: C.textDim,
                        opacity: sp(frame, 40, SNAP)
                    }}
                >
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: C.green, boxShadow: `0 0 10px 2px ${C.green}88` }} />
                    Preset <span style={{ color: '#fff', fontWeight: 500 }}>Bass boost</span>
                    <span style={{ color: C.dim }}>· saved as</span>
                    <span style={{ color: '#fff', fontWeight: 500 }}>My bass</span>
                </div>
            </div>

            {/* Reverb */}
            <div style={{ position: 'absolute', inset: 0, opacity: reverbIn * (1 - exit), pointerEvents: 'none' }}>
                {ROOMS.map((room, k) => {
                    const a = ROOM_AT[k]
                    if (frame < a) return null
                    return [0, 7, 14].map((lag) => {
                        const p = clamp01((frame - a - lag) / 46)
                        const r = room.r * (0.1 + 0.9 * (1 - Math.pow(1 - p, 3)))
                        return (
                            <div
                                key={`${k}-${lag}`}
                                style={{
                                    position: 'absolute',
                                    left: 960 - r,
                                    top: 660 - r,
                                    width: r * 2,
                                    height: r * 2,
                                    borderRadius: 999,
                                    border: `${3 - lag / 7}px solid ${C.green}`,
                                    opacity: (1 - p) * 0.8
                                }}
                            />
                        )
                    })
                })}
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 560,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 22
                    }}
                >
                    <span style={{ fontFamily: FONT.mono, fontSize: 20, letterSpacing: '.22em', textTransform: 'uppercase', color: C.muted }}>
                        Reverb · room
                    </span>
                    <div style={{ position: 'relative', height: 110, width: 1000 }}>
                        {ROOMS.map((room, k) => {
                            const a = ROOM_AT[k]
                            const next = ROOM_AT[k + 1] ?? 9999
                            const inP = sp(frame, a, POP)
                            const outP = ease(frame, next, next + 10)
                            return (
                                <div
                                    key={room.name}
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        right: 0,
                                        textAlign: 'center',
                                        fontFamily: FONT.display,
                                        fontWeight: 700,
                                        fontSize: 104,
                                        letterSpacing: '-0.03em',
                                        lineHeight: 1,
                                        color: '#fff',
                                        opacity: clamp01(inP * 1.5) * (1 - outP),
                                        transform: `translateY(${(1 - inP) * 60 - outP * 60}px)`
                                    }}
                                >
                                    {room.name}
                                </div>
                            )
                        })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: FONT.mono, fontSize: 20, color: C.muted }}>
                        <span>decay</span>
                        <div style={{ width: 420, height: 6, borderRadius: 999, background: 'rgba(255,255,255,.12)', overflow: 'hidden' }}>
                            <div
                                style={{
                                    height: '100%',
                                    width: `${(roomIdx >= 0 ? ROOMS[roomIdx].decay / 5 : 0) * 100}%`,
                                    background: C.green,
                                    borderRadius: 999,
                                    transition: 'none'
                                }}
                            />
                        </div>
                        <span style={{ color: '#fff', minWidth: 60 }}>{roomIdx >= 0 ? `${ROOMS[roomIdx].decay.toFixed(1)} s` : ''}</span>
                    </div>
                </div>
            </div>
        </AbsoluteFill>
    )
}
