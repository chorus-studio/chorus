import { AbsoluteFill, Easing } from 'remotion'
import { C, FONT } from '../theme'
import { POP, SNAP, clamp01, ease, sp, useScene } from '../anim'
import { Art, Headline, Mark } from '../ui/primitives'
import { Ic } from '../ui/icons'

export const MORE_LEN = 90

const ITEMS = [
    { t: 'Picture-in-picture', i: 'pip' },
    { t: 'Stereo width', i: 'stereo' },
    { t: 'Custom seek steps', i: 'seek' },
    { t: 'Keyboard shortcuts', i: 'keyboard' },
    { t: 'Share a snip link', i: 'share' },
    { t: 'Spotify themes', i: 'palette' },
    { t: 'Audio presets', i: 'sliders' },
    { t: 'One-key on / off', i: 'power' }
]
const PW = 372
const PH = 96
const GAP = 24
const COLS = 4

export const MoreScene = () => {
    const { frame } = useScene(MORE_LEN, 0)
    const zoomOut = ease(frame, 80, MORE_LEN, 0, 1, Easing.in(Easing.cubic))
    const gridW = COLS * PW + (COLS - 1) * GAP
    const x0 = (1920 - gridW) / 2
    const y0 = 440
    const pipIn = sp(frame, 44, POP)

    return (
        <AbsoluteFill style={{ opacity: 1 - zoomOut, transform: `scale(${1 + zoomOut * 0.3})` }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 170 }}>
                <Headline lines={[{ text: 'And more.' }]} size={150} align="center" delay={0} stagger={5} />
            </div>
            {ITEMS.map((it, k) => {
                const s = sp(frame, 10 + k * 4, POP)
                const col = k % COLS
                const row = Math.floor(k / COLS)
                const ex = x0 + col * (PW + GAP)
                const ey = y0 + row * (PH + GAP)
                const ang = (k * 137.5 * Math.PI) / 180
                const sx = ex + Math.cos(ang) * 1200
                const sy = ey + Math.sin(ang) * 900
                return (
                    <div
                        key={it.t}
                        style={{
                            position: 'absolute',
                            left: sx + (ex - sx) * s,
                            top: sy + (ey - sy) * s,
                            width: PW,
                            height: PH,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 18,
                            padding: '0 28px',
                            boxSizing: 'border-box',
                            borderRadius: 999,
                            border: `1px solid ${C.border}`,
                            background: 'rgba(24,24,24,.9)',
                            color: '#fff',
                            fontFamily: FONT.ui,
                            fontSize: 28,
                            fontWeight: 500,
                            opacity: clamp01(s * 1.4),
                            transform: `rotate(${(1 - s) * 14}deg) scale(${0.7 + 0.3 * s})`
                        }}
                    >
                        <span style={{ color: C.green, display: 'inline-flex' }}>{Ic[it.i](30)}</span>
                        {it.t}
                    </div>
                )
            })}

            {/* floating picture-in-picture window */}
            <div
                style={{
                    position: 'absolute',
                    left: 1400,
                    top: 740,
                    width: 440,
                    borderRadius: 16,
                    border: `1px solid ${C.border}`,
                    background: C.ground,
                    boxShadow: '0 30px 80px -20px rgba(0,0,0,.9)',
                    padding: 18,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    fontFamily: FONT.ui,
                    opacity: clamp01(pipIn * 1.4),
                    transform: `translateY(${(1 - pipIn) * 80}px) scale(${0.9 + 0.1 * pipIn})`,
                    transformOrigin: '100% 100%'
                }}
            >
                <Art size={92} radius={8} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Mark size={16} />
                        <span style={{ fontFamily: FONT.mono, fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase', color: C.muted }}>Picture-in-picture</span>
                    </div>
                    <span style={{ fontSize: 22, fontWeight: 600, color: '#fff' }}>Midnight City</span>
                    <span style={{ fontSize: 17, color: C.muted }}>M83</span>
                    <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,.14)', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '27.6%', width: '24.4%', top: -3, bottom: -3, background: 'rgba(30,215,96,.22)', borderLeft: `2px solid ${C.green}`, borderRight: `2px solid ${C.green}`, borderRadius: 3 }} />
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${34 + ((frame * 0.25) % 20)}%`, background: '#fff', borderRadius: 999 }} />
                    </div>
                </div>
                <span style={{ width: 44, height: 44, borderRadius: 999, background: '#fff', color: C.ground, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {Ic.pause(20)}
                </span>
            </div>
        </AbsoluteFill>
    )
}
