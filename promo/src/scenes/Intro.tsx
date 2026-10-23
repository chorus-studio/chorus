import { AbsoluteFill, Easing, random } from 'remotion'
import { C, FONT } from '../theme'
import { BOUNCE, POP, SOFT, ease, sp, useScene } from '../anim'
import { Mark } from '../ui/primitives'

export const INTRO_LEN = 120

// Frame 0 is the poster frame players show before playback, so the lockup is
// fully assembled from the first frame. The motion starts on beat two: the arcs
// spin once (a loop), the letters bounce, the dot pops.
const HIT = 15

export const Intro = () => {
    const { frame } = useScene(INTRO_LEN, 0)
    const spin = frame >= HIT ? sp(frame, HIT, SOFT) : 0
    const dotPop = frame >= HIT ? 1 + 0.5 * (1 - sp(frame, HIT, POP)) : 1
    const zoom = ease(frame, 102, INTRO_LEN, 0, 1, Easing.in(Easing.cubic))
    const letters = 'Chorus'.split('')
    const markX = 548

    return (
        <AbsoluteFill>
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    transform: `scale(${1 + zoom * 7})`,
                    transformOrigin: `${markX + 100}px 540px`,
                    opacity: 1 - ease(frame, 110, INTRO_LEN)
                }}
            >
                <div style={{ position: 'absolute', left: markX, top: 440, transform: `rotate(${spin * 360}deg)` }}>
                    <Mark size={200} draw={1} dot={dotPop} />
                </div>
                <div style={{ position: 'absolute', left: 788, top: 432, display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div
                        style={{
                            fontFamily: FONT.display,
                            fontWeight: 700,
                            fontSize: 168,
                            letterSpacing: '-0.04em',
                            lineHeight: 1,
                            display: 'flex',
                            color: '#fff'
                        }}
                    >
                        {letters.map((ch, i) => {
                            const d = HIT + 2 + i * 2
                            const s = frame >= d ? sp(frame, d, BOUNCE) : 1
                            return (
                                <span
                                    key={i}
                                    style={{
                                        display: 'inline-block',
                                        transform: `translateY(${(1 - s) * -56}px)`
                                    }}
                                >
                                    {ch}
                                </span>
                            )
                        })}
                    </div>
                    <div
                        style={{
                            fontFamily: FONT.mono,
                            fontSize: 24,
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            color: C.green,
                            lineHeight: 1,
                            whiteSpace: 'nowrap'
                        }}
                    >
                        for Spotify · free &amp; open source
                    </div>
                </div>

                {/* spectrum */}
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 90,
                        height: 120,
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        gap: 10,
                        opacity: 0.5
                    }}
                >
                    {Array.from({ length: 64 }, (_, i) => {
                        const env = Math.sin((i / 64) * Math.PI)
                        const h =
                            8 +
                            110 *
                                env *
                                (0.3 + 0.7 * random(`sp${i}`)) *
                                (0.55 + 0.45 * Math.abs(Math.sin(frame / 3.1 + i * 0.6)))
                        return (
                            <div
                                key={i}
                                style={{
                                    width: 10,
                                    height: h,
                                    background: C.green,
                                    borderRadius: 3,
                                    opacity: 0.35 + 0.65 * env
                                }}
                            />
                        )
                    })}
                </div>
            </div>
        </AbsoluteFill>
    )
}
