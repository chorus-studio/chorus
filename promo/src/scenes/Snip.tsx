import { AbsoluteFill, Easing } from 'remotion'
import { C, FONT } from '../theme'
import { BOUNCE, POP, clamp01, ease, exitStyle, fmtTime, sp, useScene } from '../anim'
import { Btn, Eyebrow, Headline, Nud, Rack, Readout, Scaled, Seg, Shell, Sub, Toast } from '../ui/primitives'
import { Ic } from '../ui/icons'

export const SNIP_LEN = 210

const DUR = 243
const START = 67 / DUR
const END = 126 / DUR
const CYCLE = 42
const PLAY_FROM = 92

const SnipPopover = ({ frame }: { frame: number }) => {
    const startP = ease(frame, 28, 66, 0, START, Easing.inOut(Easing.cubic))
    const endP = ease(frame, 38, 80, 1, END, Easing.inOut(Easing.cubic))
    const loopOn = sp(frame, 86, POP)
    const playing = frame >= PLAY_FROM
    const t = playing ? ((frame - PLAY_FROM) % CYCLE) / CYCLE : 0
    const head = playing ? startP + (endP - startP) * t : 0.12
    const flash = playing ? Math.exp(-((frame - PLAY_FROM) % CYCLE) / 5) : 0
    const loops = playing ? Math.floor((frame - PLAY_FROM) / CYCLE) : 0
    const loopPulse = playing ? 1 + 0.35 * Math.exp(-((frame - PLAY_FROM) % CYCLE) / 4) : 1
    const startS = startP * DUR
    const endS = endP * DUR

    const ruler = [
        { l: '0:00', x: 0 },
        { l: '1:00', x: 24.8 },
        { l: '2:00', x: 49.6 },
        { l: '3:00', x: 74.4 },
        { l: '4:03', x: 100 }
    ]

    return (
        <Shell
            active="snip"
            footer={
                <>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.green, fontSize: 12, padding: '0 8px' }}>
                        {Ic.pin(14)}Default
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                        <Btn variant="alarm">{Ic.trash(14)}Delete</Btn>
                        <Btn variant="primary">{Ic.check(14)}Update</Btn>
                    </div>
                </>
            }
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, lineHeight: 1 }}>
                    <span style={{ fontWeight: 500 }}>Midnight City</span>
                    <span style={{ color: C.dim }}>·</span>
                    <span style={{ color: C.muted }}>M83</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Rack>Loop</Rack>
                    <div style={{ transform: `scale(${loopPulse})`, transformOrigin: '50% 50%' }}>
                        <Seg items={['off', '∞', '×3']} active={loopOn > 0.5 ? 1 : 0} mono activeColor={loopOn > 0.5 ? C.green : '#fff'} />
                    </div>
                </div>
            </div>

            {/* timeline */}
            <div style={{ position: 'relative', height: 70 }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 12 }}>
                    {ruler.map((r, i) => (
                        <span
                            key={r.l}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: `${r.x}%`,
                                transform: i === 0 ? 'none' : i === 4 ? 'translateX(-100%)' : 'translateX(-50%)',
                                fontFamily: FONT.mono,
                                fontSize: 9,
                                color: C.dim,
                                lineHeight: 1
                            }}
                        >
                            {r.l}
                        </span>
                    ))}
                </div>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 14, height: 4 }}>
                    {[0, 12.4, 24.8, 37.2, 49.6, 62, 74.4, 86.8, 99.8].map((x, i) => (
                        <span
                            key={x}
                            style={{
                                position: 'absolute',
                                left: `${x}%`,
                                top: i % 2 === 0 ? -1 : 0,
                                width: 1,
                                height: i % 2 === 0 ? 6 : 4,
                                background: i % 2 === 0 ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.18)'
                            }}
                        />
                    ))}
                </div>
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 22,
                        height: 30,
                        borderRadius: 6,
                        background: C.well,
                        border: `1px solid ${C.line}`,
                        boxSizing: 'border-box'
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: `${startP * 100}%`,
                            width: `${(endP - startP) * 100}%`,
                            background: `rgba(30,215,96,${0.16 + 0.25 * flash})`,
                            borderTop: '1px solid rgba(30,215,96,.5)',
                            borderBottom: '1px solid rgba(30,215,96,.5)'
                        }}
                    />
                    {[startP, endP].map((p, i) => (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                top: -4,
                                bottom: -4,
                                left: `calc(${p * 100}% - 5px)`,
                                width: 10,
                                borderRadius: 4,
                                background: C.green,
                                boxShadow: `0 0 0 2px ${C.ground}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 2
                            }}
                        >
                            <i style={{ display: 'block', width: 1, height: 10, background: 'rgba(0,0,0,.45)' }} />
                            <i style={{ display: 'block', width: 1, height: 10, background: 'rgba(0,0,0,.45)' }} />
                        </div>
                    ))}
                    <div
                        style={{
                            position: 'absolute',
                            top: -6,
                            bottom: -2,
                            left: `${head * 100}%`,
                            width: 2,
                            background: '#fff',
                            transform: 'translateX(-50%)'
                        }}
                    >
                        <span
                            style={{
                                position: 'absolute',
                                top: -1,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                borderLeft: '5px solid transparent',
                                borderRight: '5px solid transparent',
                                borderTop: '6px solid #fff'
                            }}
                        />
                    </div>
                </div>
                <span style={{ position: 'absolute', top: 56, left: `${startP * 100}%`, transform: 'translateX(-50%)', fontFamily: FONT.mono, fontSize: 10, color: C.green, lineHeight: 1 }}>
                    {fmtTime(startS, true)}
                </span>
                <span style={{ position: 'absolute', top: 56, left: `${endP * 100}%`, transform: 'translateX(-50%)', fontFamily: FONT.mono, fontSize: 10, color: C.green, lineHeight: 1 }}>
                    {fmtTime(endS, true)}
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1.2fr) minmax(0,.8fr)', gap: 10 }}>
                {[
                    { label: 'Start', v: startS },
                    { label: 'End', v: endS }
                ].map((f) => (
                    <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 16 }}>
                            <Rack>{f.label}</Rack>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: C.green, fontSize: 10, whiteSpace: 'nowrap' }}>
                                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 3v18" />
                                    <path d="m8 7 4-4 4 4" />
                                </svg>
                                Set to playhead
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <Nud />
                            <Readout>{`0${fmtTime(f.v, true)}`}</Readout>
                            <Nud plus />
                        </div>
                    </div>
                ))}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    <Rack style={{ height: 16, display: 'flex', alignItems: 'center' }}>Length</Rack>
                    <Readout style={{ color: C.muted }}>{fmtTime(Math.max(0, endS - startS), true)}</Readout>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                    <Btn variant="soft" height={26}>
                        {Ic.play(12)}Play snip
                    </Btn>
                    <Btn variant="ghost" height={26}>
                        Last 3 s
                    </Btn>
                </div>
                <span style={{ fontSize: 11, color: C.muted, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    {Ic.info(12)}
                    {loops > 0 ? `looped ×${loops}` : 'Drag handles · ← → nudge 1 s'}
                </span>
            </div>
        </Shell>
    )
}

export const SnipScene = () => {
    const { frame, exit } = useScene(SNIP_LEN, 10)
    const popIn = sp(frame, 2, POP)
    const toast = sp(frame, 150, BOUNCE)
    return (
        <AbsoluteFill>
            <div style={{ position: 'absolute', left: 120, top: 180, display: 'flex', flexDirection: 'column', gap: 28, ...exitStyle(exit) }}>
                <Eyebrow delay={0}>01 · Snips</Eyebrow>
                <Headline size={132} delay={4} lines={[{ text: 'Loop the' }, { text: 'chorus.' }, { text: 'Forever.', color: C.green }]} />
                <Sub delay={36} width={700}>
                    Drag two handles around the part you love. Play it once, three times, or endlessly. Saved per track.
                </Sub>
            </div>
            <div
                style={{
                    position: 'absolute',
                    left: 960,
                    top: 176,
                    opacity: clamp01(popIn * 1.5) * (1 - exit),
                    transform: `scale(${0.82 + 0.18 * popIn}) translateY(${exit * -40}px)`,
                    transformOrigin: '20% 90%'
                }}
            >
                <Scaled k={2.2} w={400} h={320}>
                    <SnipPopover frame={frame} />
                </Scaled>
            </div>
            <div style={{ position: 'absolute', left: 1180, top: 930, opacity: 1 - exit }}>
                <Toast title="Snip saved" detail="Midnight City · 1:07 – 2:06 · loops ∞" p={toast} />
            </div>
        </AbsoluteFill>
    )
}
