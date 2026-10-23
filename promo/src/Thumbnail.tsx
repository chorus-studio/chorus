import { AbsoluteFill } from 'remotion'
import { C, FONT } from './theme'
import { Mark, Pill } from './ui/primitives'

/** 1280×720 YouTube thumbnail for the store's promo video link */
export const Thumbnail = () => (
    <AbsoluteFill
        style={{
            background: `radial-gradient(60% 80% at 0% 50%, rgba(30,215,96,.16), rgba(30,215,96,0) 60%), ${C.ground}`,
            fontFamily: FONT.ui,
            color: '#fff',
            padding: 72,
            boxSizing: 'border-box',
            justifyContent: 'space-between'
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <Mark size={72} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 56, letterSpacing: '-0.03em', lineHeight: 1 }}>Chorus</span>
                <span style={{ fontFamily: FONT.mono, fontSize: 16, letterSpacing: '.2em', textTransform: 'uppercase', color: C.muted }}>for Spotify · free &amp; open source</span>
            </div>
        </div>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 124, letterSpacing: '-0.035em', lineHeight: 0.98 }}>
            The studio
            <br />
            <span style={{ color: C.green }}>Spotify forgot.</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {['Snips & loops', 'Speed · pitch · key', '10-band EQ', 'Reverb', 'Vocal separation', 'Auto-skip & block'].map((t) => (
                <Pill key={t} size={22}>
                    {t}
                </Pill>
            ))}
        </div>
    </AbsoluteFill>
)
