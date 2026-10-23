import { AbsoluteFill, Easing } from 'remotion'
import { C, FONT } from '../theme'
import { BOUNCE, POP, SNAP, clamp01, ease, sp, useScene } from '../anim'
import { Eyebrow, Mark } from '../ui/primitives'

export const OUTRO_LEN = 120

const Cta = ({ label, p, kick }: { label: string; p: number; kick: number }) => (
    <div
        style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 18,
            padding: '0 52px',
            height: 104,
            borderRadius: 999,
            background: C.green,
            color: C.ground,
            fontFamily: FONT.ui,
            fontSize: 40,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            opacity: clamp01(p * 1.4),
            transform: `scale(${p * (1 + 0.04 * kick)})`,
            boxShadow: `0 0 ${40 + 60 * kick}px ${4 + 10 * kick}px rgba(30,215,96,${0.25 + 0.25 * kick})`
        }}
    >
        <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
        </svg>
        {label}
    </div>
)

export const Outro = ({ kick }: { kick: number }) => {
    const { frame } = useScene(OUTRO_LEN, 0)
    const draw = ease(frame, 0, 26, 0, 1, Easing.out(Easing.cubic))
    const dot = sp(frame, 16, POP)
    const chrome = sp(frame, 44, BOUNCE)
    const firefox = sp(frame, 50, BOUNCE)
    const note = sp(frame, 66, SNAP)
    const letters = 'Chorus'.split('')

    return (
        <AbsoluteFill style={{ alignItems: 'center' }}>
            <div style={{ position: 'absolute', top: 250, display: 'flex', alignItems: 'center', gap: 36 }}>
                <Mark size={150} draw={draw} dot={dot} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 132, letterSpacing: '-0.04em', lineHeight: 1, display: 'flex', color: '#fff' }}>
                        {letters.map((ch, i) => {
                            const s = sp(frame, 8 + i * 3, POP)
                            return (
                                <span key={i} style={{ display: 'inline-block', transform: `translateY(${(1 - s) * 70}px)`, opacity: clamp01(s * 1.5) }}>
                                    {ch}
                                </span>
                            )
                        })}
                    </div>
                    <Eyebrow delay={26} size={22}>
                        for Spotify · free &amp; open source
                    </Eyebrow>
                </div>
            </div>

            <div style={{ position: 'absolute', top: 560, display: 'flex', gap: 28, alignItems: 'center' }}>
                <Cta label="Add to Chrome" p={chrome} kick={kick} />
                <Cta label="Add to Firefox" p={firefox} kick={kick} />
            </div>

            <div
                style={{
                    position: 'absolute',
                    top: 720,
                    fontFamily: FONT.ui,
                    fontSize: 26,
                    color: C.muted,
                    opacity: note,
                    transform: `translateY(${(1 - note) * 14}px)`
                }}
            >
                Also Edge, Brave and other Chromium browsers
            </div>
        </AbsoluteFill>
    )
}
