import type { CSSProperties, ReactNode } from 'react'
import { C, FONT } from '../theme'
import { POP, clamp01, sp } from '../anim'
import { Ic } from './icons'
import { Art } from './primitives'

/**
 * Spotify's player bar at design px (1280×96) with Chorus's grafted controls.
 * `frame` drives the reveal: chorus element i pops in at d0 + i*step.
 */
const ORDER = ['heart', 'controls', 'block', 'pip', 'rew', 'fwd', 'loop', 'volReset', 'mute', 'vol', 'speed', 'snip', 'tags'] as const
type Key = (typeof ORDER)[number]

const sq: CSSProperties = {
    width: 32,
    height: 32,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: C.muted,
    position: 'relative',
    borderRadius: 6,
    flexShrink: 0
}

export const SpotifyBar = ({
    frame,
    d0 = 34,
    step = 5,
    showChorus = true
}: {
    frame: number
    d0?: number
    step?: number
    showChorus?: boolean
}) => {
    const rev = (k: Key) => (showChorus ? sp(frame, d0 + ORDER.indexOf(k) * step, POP) : 0)
    const ring = (k: Key) => clamp01((frame - (d0 + ORDER.indexOf(k) * step)) / 16)

    const ChorusBtn = ({ k, on, children, wide }: { k: Key; on?: boolean; children: ReactNode; wide?: boolean }) => {
        const r = rev(k)
        const g = ring(k)
        return (
            <span style={{ ...sq, color: on ? C.green : '#fff', opacity: on ? 1 : 0.85, width: wide ? 36 : 32 }}>
                <span
                    style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 999,
                        border: `2px solid ${C.green}`,
                        opacity: g > 0 && g < 1 ? 1 - g : 0,
                        transform: `scale(${0.6 + 1.8 * g})`
                    }}
                />
                <span style={{ display: 'inline-flex', transform: `scale(${r})` }}>{children}</span>
            </span>
        )
    }

    const tag = (text: string, left: number) => (
        <span
            style={{
                position: 'absolute',
                top: -16,
                left,
                fontFamily: FONT.mono,
                fontSize: 9,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                color: C.green,
                whiteSpace: 'nowrap',
                opacity: rev('tags')
            }}
        >
            {text}
        </span>
    )

    const mono: CSSProperties = { fontFamily: FONT.mono, fontSize: 11, color: C.muted, minWidth: 32 }

    return (
        <div
            style={{
                width: 1280,
                height: 96,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                gap: 16,
                borderTop: `1px solid ${C.soft}`,
                background: '#000',
                color: '#fff',
                fontFamily: FONT.ui,
                position: 'relative'
            }}
        >
            {/* left: track + Chorus cluster */}
            <div style={{ width: 380, display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
                <Art size={56} radius={4} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, width: 120 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>Midnight City</span>
                    <span style={{ fontSize: 11, color: C.muted }}>M83</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative' }}>
                    {tag('Chorus', 0)}
                    <ChorusBtn k="heart" on>
                        {Ic.heart(16)}
                    </ChorusBtn>
                    <ChorusBtn k="controls" on>
                        {Ic.controls(18)}
                    </ChorusBtn>
                    <ChorusBtn k="block">{Ic.block(16)}</ChorusBtn>
                    <ChorusBtn k="pip">{Ic.pip(16)}</ChorusBtn>
                </div>
            </div>

            {/* center: transport + progress */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    maxWidth: 620,
                    margin: '0 auto'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
                    <span style={sq}>{Ic.shuffle(16)}</span>
                    <ChorusBtn k="rew">
                        <span style={{ position: 'relative', display: 'inline-flex' }}>
                            {Ic.rewind(22)}
                            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.mono, fontSize: 8, paddingTop: 2 }}>10</span>
                        </span>
                    </ChorusBtn>
                    <span style={{ ...sq, color: '#fff' }}>{Ic.prev(16)}</span>
                    <span
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 999,
                            background: '#fff',
                            color: '#000',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {Ic.pause(16)}
                    </span>
                    <span style={{ ...sq, color: '#fff' }}>{Ic.next(16)}</span>
                    <ChorusBtn k="fwd">
                        <span style={{ position: 'relative', display: 'inline-flex', transform: 'scaleX(-1)' }}>
                            {Ic.rewind(22)}
                            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.mono, fontSize: 8, paddingTop: 2, transform: 'scaleX(-1)' }}>10</span>
                        </span>
                    </ChorusBtn>
                    <span style={sq}>{Ic.repeat(16)}</span>
                    <ChorusBtn k="loop" on>
                        <span style={{ position: 'relative', display: 'inline-flex' }}>
                            {Ic.loop(20)}
                            <span style={{ position: 'absolute', left: 0, right: 0, bottom: -9, textAlign: 'center', fontFamily: FONT.mono, fontSize: 9, color: C.green }}>∞</span>
                        </span>
                    </ChorusBtn>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', position: 'relative' }}>
                    <span style={{ ...mono, color: C.green, minWidth: 28, textAlign: 'right', opacity: rev('speed') }}>1.2×</span>
                    <span style={{ ...mono, textAlign: 'right' }}>1:24</span>
                    <div style={{ height: 4, borderRadius: 999, background: '#4d4d4d', position: 'relative', flex: 1 }}>
                        <div
                            style={{
                                position: 'absolute',
                                top: -3,
                                bottom: -3,
                                left: '27.6%',
                                width: `${24.4 * clamp01(rev('snip'))}%`,
                                background: 'rgba(30,215,96,.22)',
                                borderLeft: `2px solid ${C.green}`,
                                borderRight: `2px solid ${C.green}`,
                                borderRadius: 2,
                                opacity: clamp01(rev('snip') * 2)
                            }}
                        />
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '34.7%', background: '#fff', borderRadius: 999 }} />
                        <div
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '34.7%',
                                width: 12,
                                height: 12,
                                borderRadius: 999,
                                background: '#fff',
                                transform: 'translate(-50%,-50%)'
                            }}
                        />
                    </div>
                    <span style={mono}>4:03</span>
                </div>
            </div>

            {/* right: Spotify icons + Chorus volume */}
            <div style={{ width: 380, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                <span style={sq}>{Ic.nowplaying(16)}</span>
                <span style={sq}>{Ic.queue(16)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative', marginLeft: 10 }}>
                    {tag('Chorus volume', 0)}
                    <ChorusBtn k="volReset">{Ic.reset(16)}</ChorusBtn>
                    <ChorusBtn k="mute">{Ic.volume(16)}</ChorusBtn>
                    <div
                        style={{
                            height: 4,
                            borderRadius: 999,
                            background: '#4d4d4d',
                            position: 'relative',
                            width: 110 * clamp01(rev('vol')),
                            opacity: clamp01(rev('vol') * 2)
                        }}
                    >
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '25%', background: '#fff', borderRadius: 999 }} />
                        <div style={{ position: 'absolute', top: '50%', left: '25%', width: 12, height: 12, borderRadius: 999, background: '#fff', transform: 'translate(-50%,-50%)' }} />
                    </div>
                    <span style={{ ...mono, minWidth: 36, opacity: clamp01(rev('vol') * 2) }}>75%</span>
                </div>
            </div>
        </div>
    )
}
