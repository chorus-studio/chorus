import { AbsoluteFill, Easing } from 'remotion'
import { C, FONT } from '../theme'
import { BOUNCE, POP, SNAP, clamp01, ease, exitStyle, sp, useScene } from '../anim'
import { Eyebrow, Headline, Sub, Switch, Waveform } from '../ui/primitives'

export const SPEED_LEN = 180

const KEYS = ['−2', '−1', '0', '+1', '+2']

export const SpeedScene = () => {
    const { frame, exit } = useScene(SPEED_LEN, 10)
    const panel = sp(frame, 6, SNAP)
    const rate = ease(frame, 24, 78, 1, 0.5, Easing.inOut(Easing.cubic))
    const keepPitch = sp(frame, 88, BOUNCE)
    const keyIdx = ease(frame, 112, 134, 2, 4, Easing.inOut(Easing.cubic))
    const keyStamp = sp(frame, 112, POP)
    const chipPop = sp(frame, 94, POP)
    const saved = sp(frame, 150, SNAP)
    const bigPulse = 1 + 0.02 * Math.sin(frame / 2) * (frame > 24 && frame < 78 ? 1 : 0)

    const row = (label: string, child: React.ReactNode, delay: number) => {
        const p = sp(frame, delay, SNAP)
        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '26px 34px',
                    background: C.panel,
                    border: `1px solid ${C.line}`,
                    borderRadius: 18,
                    opacity: p,
                    transform: `translateY(${(1 - p) * 30}px)`
                }}
            >
                <span style={{ fontFamily: FONT.mono, fontSize: 20, letterSpacing: '.18em', textTransform: 'uppercase', color: C.muted }}>
                    {label}
                </span>
                {child}
            </div>
        )
    }

    return (
        <AbsoluteFill>
            <div style={{ position: 'absolute', left: 120, top: 190, display: 'flex', flexDirection: 'column', gap: 28, ...exitStyle(exit) }}>
                <Eyebrow delay={0}>02 · Speed · Pitch · Key</Eyebrow>
                <Headline size={112} delay={4} lines={[{ text: 'Slow it down.' }, { text: 'Keep it in tune.', color: C.green }]} />
                <Sub delay={36} width={700}>
                    Practise a solo at half speed without the chipmunk effect. Shift the key to fit your voice. Save it for one track or all of them.
                </Sub>
            </div>

            <div
                style={{
                    position: 'absolute',
                    left: 1010,
                    top: 150,
                    width: 800,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 18,
                    opacity: panel * (1 - exit),
                    transform: `translateY(${(1 - panel) * 40 - exit * 40}px)`
                }}
            >
                {/* big rate readout */}
                <div
                    style={{
                        background: C.panel,
                        border: `1px solid ${C.line}`,
                        borderRadius: 18,
                        padding: '26px 34px 22px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                        overflow: 'hidden'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: FONT.mono, fontSize: 20, letterSpacing: '.18em', textTransform: 'uppercase', color: C.muted }}>Rate</span>
                        <span style={{ fontFamily: FONT.mono, fontSize: 18, color: C.dim }}>0.25 – 4×</span>
                    </div>
                    <div
                        style={{
                            fontFamily: FONT.mono,
                            fontSize: 190,
                            lineHeight: 0.95,
                            color: rate < 0.99 ? C.green : '#fff',
                            fontVariantNumeric: 'tabular-nums',
                            letterSpacing: '-0.04em',
                            transform: `scale(${bigPulse})`,
                            transformOrigin: '0 50%'
                        }}
                    >
                        {rate.toFixed(2)}
                        <span style={{ fontSize: 100, color: C.muted, marginLeft: 8 }}>×</span>
                    </div>
                    <div style={{ width: 732, height: 90, overflow: 'hidden' }}>
                        <div style={{ transform: `scaleX(${1 / rate})`, transformOrigin: '0 50%', width: 732 }}>
                            <Waveform width={732} height={90} bars={64} frame={frame} seed="spd" color={C.green} amp={0.9} />
                        </div>
                    </div>
                </div>

                {row(
                    'Keep pitch',
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                        <span
                            style={{
                                fontFamily: FONT.mono,
                                fontSize: 18,
                                color: C.green2,
                                border: '1px solid rgba(30,215,96,.5)',
                                background: 'rgba(30,215,96,.15)',
                                borderRadius: 10,
                                padding: '8px 14px',
                                opacity: clamp01(chipPop * 1.4),
                                transform: `scale(${chipPop})`
                            }}
                        >
                            pitch held
                        </span>
                        <Switch p={keepPitch} scale={2.2} />
                    </div>,
                    40
                )}

                {row(
                    'Key',
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                        <div style={{ position: 'relative', display: 'flex', gap: 8, padding: 4, background: C.well, border: `1px solid ${C.line}`, borderRadius: 12 }}>
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 4,
                                    bottom: 4,
                                    left: 4 + keyIdx * 72,
                                    width: 64,
                                    borderRadius: 9,
                                    background: 'rgba(30,215,96,.18)',
                                    border: '1px solid rgba(30,215,96,.55)',
                                    boxSizing: 'border-box'
                                }}
                            />
                            {KEYS.map((k, i) => (
                                <span
                                    key={k}
                                    style={{
                                        width: 64,
                                        height: 44,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontFamily: FONT.mono,
                                        fontSize: 20,
                                        color: Math.round(keyIdx) === i ? C.green2 : C.textDim,
                                        position: 'relative'
                                    }}
                                >
                                    {k}
                                </span>
                            ))}
                        </div>
                        <span
                            style={{
                                fontFamily: FONT.mono,
                                fontSize: 26,
                                color: '#fff',
                                minWidth: 120,
                                textAlign: 'right',
                                transform: `scale(${0.9 + 0.1 * keyStamp})`
                            }}
                        >
                            {keyIdx >= 2.5 ? `+${Math.round(keyIdx - 2)}` : '0'} <span style={{ color: C.muted, fontSize: 18 }}>st</span>
                        </span>
                    </div>,
                    48
                )}

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        fontFamily: FONT.ui,
                        fontSize: 22,
                        color: C.muted,
                        opacity: saved,
                        transform: `translateY(${(1 - saved) * 16}px)`
                    }}
                >
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: C.green, boxShadow: `0 0 10px 2px ${C.green}88` }} />
                    Saved with <span style={{ color: '#fff' }}>Midnight City</span> · or set it for all tracks
                </div>
            </div>
        </AbsoluteFill>
    )
}
