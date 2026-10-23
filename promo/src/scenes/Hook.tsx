import { AbsoluteFill, Easing } from 'remotion'
import { C, FONT } from '../theme'
import { POP, ease, useScene } from '../anim'
import { Headline, Mark } from '../ui/primitives'

export const HOOK_LEN = 120

const LINE = 'snips · speed · pitch · key · eq · reverb · vocals · auto-skip'

export const Hook = () => {
    const { frame } = useScene(HOOK_LEN, 0)
    const rule = ease(frame, 26, 54, 0, 1, Easing.out(Easing.cubic))
    const chars = Math.floor(Math.max(0, frame - 46) * 1.6)
    const split = ease(frame, 108, HOOK_LEN, 0, 1, Easing.in(Easing.cubic))
    const cursorOn = Math.floor(frame / 8) % 2 === 0

    return (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
            <Mark
                size={1500}
                color="#ffffff"
                dotColor="#ffffff"
                style={{
                    position: 'absolute',
                    left: 960 - 750,
                    top: 540 - 750,
                    opacity: 0.045,
                    transform: `rotate(${frame * 0.12}deg)`
                }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 44 }}>
                <div style={{ transform: `translateY(${-split * 700}px)`, opacity: 1 - split }}>
                    <Headline
                        lines={[{ text: 'The studio' }]}
                        size={180}
                        align="center"
                        delay={0}
                        stagger={5}
                        config={POP}
                    />
                </div>
                <div style={{ transform: `translateY(${split * 700}px)`, opacity: 1 - split, marginTop: -44 }}>
                    <Headline
                        lines={[{ text: 'Spotify forgot.', color: C.green }]}
                        size={180}
                        align="center"
                        delay={12}
                        stagger={5}
                        config={POP}
                    />
                </div>
                <div
                    style={{
                        width: 560 * rule,
                        height: 2,
                        background: 'rgba(255,255,255,.25)',
                        opacity: 1 - split
                    }}
                />
                <div
                    style={{
                        fontFamily: FONT.mono,
                        fontSize: 26,
                        letterSpacing: '.22em',
                        textTransform: 'uppercase',
                        color: C.muted,
                        height: 32,
                        opacity: 1 - split
                    }}
                >
                    {LINE.slice(0, chars)}
                    <span style={{ color: C.green, opacity: cursorOn ? 1 : 0 }}>▍</span>
                </div>
            </div>
        </AbsoluteFill>
    )
}
