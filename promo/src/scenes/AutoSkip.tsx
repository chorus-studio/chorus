import { AbsoluteFill, Easing } from 'remotion'
import { C, FONT } from '../theme'
import { BOUNCE, POP, SNAP, clamp01, ease, exitStyle, sp, useScene } from '../anim'
import { Art, Eyebrow, Headline, Sub } from '../ui/primitives'
import { Ic } from '../ui/icons'

export const AUTOSKIP_LEN = 180

type Row = { title: string; artist: string; dur: string; hit?: string; at?: number }
const ROWS: Row[] = [
    { title: 'Midnight City', artist: 'M83', dur: '4:03' },
    { title: 'Midnight City (Sped Up)', artist: 'M83', dur: '3:21', hit: 'sped up', at: 62 },
    { title: 'Intro', artist: 'The xx', dur: '2:07' },
    { title: 'Teardrop (Live at Wembley)', artist: 'Massive Attack', dur: '6:12', hit: 'live', at: 86 },
    { title: 'Genesis', artist: 'Grimes', dur: '4:15' },
    { title: 'Somebody That I Used To Know (Remix)', artist: 'Kidz Bop Kids', dur: '3:04', hit: 'Kidz Bop', at: 110 },
    { title: 'Breezeblocks', artist: 'alt-J', dur: '3:47' }
]
const CHIPS = [
    { t: 'remix', kind: 'title', at: 18 },
    { t: 'sped up', kind: 'title', at: 24 },
    { t: 'live', kind: 'title', at: 30 },
    { t: 'Kidz Bop', kind: 'artist', at: 36 }
]
const ROW_H = 74

export const AutoSkipScene = () => {
    const { frame, exit } = useScene(AUTOSKIP_LEN, 10)
    const panel = sp(frame, 4, SNAP)
    const blocked = ROWS.filter((r) => r.at !== undefined && frame >= r.at + 6).length

    return (
        <AbsoluteFill>
            <div style={{ position: 'absolute', left: 120, top: 200, display: 'flex', flexDirection: 'column', gap: 28, ...exitStyle(exit) }}>
                <Eyebrow delay={0}>05 · Auto-skip &amp; block</Eyebrow>
                <Headline size={128} delay={4} lines={[{ text: 'Never hear' }, { text: 'it again.', color: C.green }]} />
                <Sub delay={36} width={700}>
                    Block a track from any view, or skip by keyword: remixes, sped-up edits, live cuts, a whole artist.
                </Sub>
            </div>

            <div
                style={{
                    position: 'absolute',
                    left: 1000,
                    top: 120,
                    width: 820,
                    borderRadius: 22,
                    border: `1px solid ${C.border}`,
                    background: C.ground,
                    boxShadow: '0 30px 80px -20px rgba(0,0,0,.9)',
                    overflow: 'hidden',
                    opacity: panel * (1 - exit),
                    transform: `translateY(${(1 - panel) * 40 - exit * 40}px)`,
                    fontFamily: FONT.ui
                }}
            >
                {/* header + chips */}
                <div style={{ padding: '26px 30px 18px', borderBottom: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                            <span style={{ fontSize: 28, fontWeight: 600, color: '#fff' }}>Liked Songs</span>
                            <span style={{ fontSize: 20, color: C.muted }}>1,204 tracks</span>
                        </div>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                fontFamily: FONT.mono,
                                fontSize: 18,
                                color: blocked > 0 ? C.alarm : C.muted,
                                transform: `scale(${1 + 0.25 * Math.exp(-((frame - (ROWS.find((r) => r.at && frame >= r.at + 6 && frame < r.at + 30)?.at ?? -99) + 6)) / 5)})`
                            }}
                        >
                            {Ic.block(18)}
                            {blocked} blocked
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: FONT.mono, fontSize: 16, letterSpacing: '.18em', textTransform: 'uppercase', color: C.muted, marginRight: 6 }}>
                            Auto-skip
                        </span>
                        {CHIPS.map((c) => {
                            const p = sp(frame, c.at, POP)
                            return (
                                <span
                                    key={c.t}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        height: 40,
                                        padding: '0 10px 0 16px',
                                        borderRadius: 10,
                                        border: `1px solid ${C.line}`,
                                        background: C.raised,
                                        color: '#fff',
                                        fontSize: 20,
                                        opacity: clamp01(p * 1.5),
                                        transform: `scale(${p})`
                                    }}
                                >
                                    <span style={{ fontFamily: FONT.mono, fontSize: 13, color: C.dim, letterSpacing: '.1em', textTransform: 'uppercase' }}>
                                        {c.kind}
                                    </span>
                                    {c.t}
                                    <span style={{ color: C.muted, display: 'inline-flex' }}>{Ic.x(14)}</span>
                                </span>
                            )
                        })}
                    </div>
                </div>

                {/* rows */}
                <div style={{ padding: '10px 14px 14px', display: 'flex', flexDirection: 'column' }}>
                    {ROWS.map((r, i) => {
                        const rowIn = sp(frame, 10 + i * 3, SNAP)
                        const stamp = r.at !== undefined ? sp(frame, r.at, BOUNCE) : 0
                        const strike = r.at !== undefined ? ease(frame, r.at + 2, r.at + 10, 0, 1, Easing.out(Easing.cubic)) : 0
                        const collapse = r.at !== undefined ? ease(frame, r.at + 22, r.at + 34, 0, 1, Easing.inOut(Easing.cubic)) : 0
                        const nowPlaying = i === 0
                        const stamped = r.at !== undefined && frame >= r.at
                        // renumber as rows above collapse, like a real list would
                        const rank = 1 + ROWS.slice(0, i).filter((p) => !(p.at !== undefined && frame >= p.at + 28)).length
                        return (
                            <div
                                key={r.title}
                                style={{
                                    height: ROW_H * (1 - collapse),
                                    opacity: (1 - collapse) * rowIn,
                                    overflow: 'hidden',
                                    transform: `translateX(${(1 - rowIn) * 40 + collapse * 60}px)`
                                }}
                            >
                                <div
                                    style={{
                                        height: ROW_H,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 18,
                                        padding: '0 16px',
                                        borderRadius: 12,
                                        background: stamp > 0.3 ? `rgba(241,94,108,${0.12 * clamp01(stamp)})` : nowPlaying ? 'rgba(255,255,255,.04)' : 'transparent',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <span style={{ width: 28, fontFamily: FONT.mono, fontSize: 17, color: C.dim, textAlign: 'right' }}>
                                        {nowPlaying ? (
                                            <span style={{ display: 'inline-flex', gap: 2, alignItems: 'flex-end', height: 18 }}>
                                                {[0, 1, 2].map((b) => (
                                                    <span key={b} style={{ width: 4, background: C.green, height: 6 + 12 * Math.abs(Math.sin(frame / 4 + b)) }} />
                                                ))}
                                            </span>
                                        ) : (
                                            rank
                                        )}
                                    </span>
                                    <Art size={48} radius={4} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0, position: 'relative' }}>
                                        <span style={{ fontSize: 22, fontWeight: 500, color: nowPlaying ? C.green : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {r.title}
                                        </span>
                                        <span style={{ fontSize: 18, color: C.muted }}>{r.artist}</span>
                                        <span
                                            style={{
                                                position: 'absolute',
                                                left: -4,
                                                top: '50%',
                                                height: 3,
                                                width: strike > 0 ? `calc(${strike * 100}% + 8px)` : 0,
                                                background: C.alarm,
                                                transform: 'translateY(-50%)',
                                                borderRadius: 2
                                            }}
                                        />
                                    </div>
                                    {r.hit ? (
                                        <span
                                            style={{
                                                fontFamily: FONT.mono,
                                                fontSize: 15,
                                                color: C.alarm,
                                                border: `1px solid rgba(241,94,108,.5)`,
                                                background: 'rgba(241,94,108,.12)',
                                                borderRadius: 8,
                                                padding: '6px 10px',
                                                opacity: clamp01(stamp * 1.4),
                                                transform: `scale(${stamp})`
                                            }}
                                        >
                                            matches “{r.hit}”
                                        </span>
                                    ) : null}
                                    <span style={{ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: stamped ? C.alarm : C.dim, transform: `scale(${stamped ? 0.8 + 0.6 * stamp : 1})` }}>
                                        {Ic.block(22)}
                                    </span>
                                    <span style={{ fontFamily: FONT.mono, fontSize: 17, color: C.muted, width: 50, textAlign: 'right' }}>{r.dur}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </AbsoluteFill>
    )
}
