import { AbsoluteFill, Easing } from 'remotion'
import { C, FONT } from '../theme'
import { POP, SNAP, SOFT, clamp01, ease, exitStyle, sp, useScene } from '../anim'
import { Eyebrow, Headline, Sub, Waveform } from '../ui/primitives'
import { Ic } from '../ui/icons'

export const VOCALS_LEN = 150

export const VocalsScene = () => {
    const { frame, exit } = useScene(VOCALS_LEN, 10)
    const wfIn = sp(frame, 6, SNAP)
    const split = sp(frame, 34, SOFT)
    const segIn = sp(frame, 52, SNAP)
    // 0 = instrumental selected, 1 = acapella selected
    const mode = ease(frame, 104, 118, 0, 1, Easing.inOut(Easing.cubic))
    const vocalDim = split * (1 - mode) * 0.78
    const instDim = split * mode * 0.78
    const labelIn = sp(frame, 48, POP)

    const W = 1200
    return (
        <AbsoluteFill>
            <div style={{ position: 'absolute', left: 120, top: 110, display: 'flex', flexDirection: 'column', gap: 24, ...exitStyle(exit) }}>
                <Eyebrow delay={0}>04 · Vocal separation · on-device · Chrome</Eyebrow>
                <Headline size={120} delay={4} lines={[{ text: 'Pull the vocals out.' }]} />
                <Sub delay={30} width={1200} size={30}>
                    Real-time, in the tab, nothing uploaded. Instrumentals for karaoke, acapellas for the voice alone.
                </Sub>
            </div>

            <div style={{ position: 'absolute', left: (1920 - W) / 2, top: 430, width: W, height: 420, opacity: wfIn * (1 - exit) }}>
                {/* vocals layer */}
                <div style={{ position: 'absolute', left: 0, top: 160 - split * 140, width: W, opacity: 1 - vocalDim }}>
                    <Waveform width={W} height={110 * (0.55 + 0.45 * split)} bars={110} frame={frame} seed="voc" color="#ffffff" amp={0.85} gap={4} />
                </div>
                {/* instrumental layer */}
                <div style={{ position: 'absolute', left: 0, top: 160 + split * 120, width: W, opacity: 1 - instDim }}>
                    <Waveform width={W} height={110 * (0.9 + 0.3 * split)} bars={110} frame={frame + 7} seed="ins" color={C.green} amp={1} gap={4} />
                </div>
                {/* layer labels */}
                {[
                    { t: 'Vocals', top: 20 - 40, color: '#fff', dim: vocalDim },
                    { t: 'Instrumental', top: 280 + 40, color: C.green, dim: instDim }
                ].map((l) => (
                    <span
                        key={l.t}
                        style={{
                            position: 'absolute',
                            left: -220,
                            top: l.top + 44,
                            width: 190,
                            textAlign: 'right',
                            fontFamily: FONT.mono,
                            fontSize: 20,
                            letterSpacing: '.2em',
                            textTransform: 'uppercase',
                            color: l.color,
                            opacity: clamp01(labelIn) * (1 - l.dim * 0.7),
                            transform: `translateX(${(1 - labelIn) * -30}px)`
                        }}
                    >
                        {l.t}
                    </span>
                ))}
            </div>

            {/* mode switch */}
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 900,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 28,
                    opacity: segIn * (1 - exit),
                    transform: `translateY(${(1 - segIn) * 30}px)`
                }}
            >
                <span style={{ color: C.green, display: 'inline-flex' }}>{Ic.vocal(32)}</span>
                <div style={{ position: 'relative', display: 'flex', padding: 6, background: C.well, border: `1px solid ${C.line}`, borderRadius: 16, gap: 6 }}>
                    <div
                        style={{
                            position: 'absolute',
                            top: 6,
                            bottom: 6,
                            left: 6 + mode * 286,
                            width: 280,
                            borderRadius: 11,
                            background: C.soft
                        }}
                    />
                    {['Instrumental', 'Acapella'].map((t, i) => (
                        <span
                            key={t}
                            style={{
                                width: 280,
                                height: 64,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontFamily: FONT.ui,
                                fontSize: 28,
                                fontWeight: 500,
                                color: (i === 0 ? 1 - mode : mode) > 0.5 ? '#fff' : C.muted,
                                position: 'relative'
                            }}
                        >
                            {t}
                        </span>
                    ))}
                </div>
                <span style={{ fontFamily: FONT.mono, fontSize: 20, color: C.muted, letterSpacing: '.1em' }}>strength 100%</span>
            </div>
        </AbsoluteFill>
    )
}
