import { AbsoluteFill, Easing } from 'remotion'
import { C } from '../theme'
import { SOFT, clamp01, ease, exitStyle, sp, useScene } from '../anim'
import { Eyebrow, Headline, Sub } from '../ui/primitives'
import { SpotifyBar } from '../ui/SpotifyBar'

export const PLAYERBAR_LEN = 150

const K = 1.45
const BAR_LEFT = 32
const BAR_TOP = 1080 - 96 * K - 56
// screen position of the "Chorus controls" button, the zoom target
const BTN_X = BAR_LEFT + 266 * K
const BTN_Y = BAR_TOP + 48 * K

export const PlayerBarScene = () => {
    const { frame, exit } = useScene(PLAYERBAR_LEN, 8)
    const barIn = sp(frame, 0, SOFT)
    const zoom = ease(frame, 122, PLAYERBAR_LEN, 0, 1, Easing.in(Easing.cubic))
    const click = clamp01((frame - 116) / 18)

    return (
        <AbsoluteFill>
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    transform: `scale(${1 + zoom * 2.6})`,
                    transformOrigin: `${BTN_X}px ${BTN_Y}px`
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        left: 120,
                        top: 170,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 26,
                        ...exitStyle(exit)
                    }}
                >
                    <Eyebrow delay={4}>Chrome · Firefox · open.spotify.com</Eyebrow>
                    <Headline
                        lines={[{ text: 'Lives inside' }, { text: 'Spotify.', color: C.green }]}
                        size={150}
                        delay={6}
                    />
                    <Sub delay={34} width={900} size={32}>
                        Controls graft straight into the player bar you already use. No new app, no new tab.
                    </Sub>
                </div>

                <div
                    style={{
                        position: 'absolute',
                        left: BAR_LEFT,
                        top: BAR_TOP + (1 - barIn) * 320,
                        width: 1280,
                        transform: `scale(${K})`,
                        transformOrigin: '0 0',
                        boxShadow: '0 -30px 80px -20px rgba(0,0,0,.9)',
                        opacity: 1 - exit
                    }}
                >
                    <SpotifyBar frame={frame} d0={34} step={5} />
                </div>

                {/* click ripple on the controls button */}
                <div
                    style={{
                        position: 'absolute',
                        left: BTN_X - 40,
                        top: BTN_Y - 40,
                        width: 80,
                        height: 80,
                        borderRadius: 999,
                        border: `3px solid ${C.green}`,
                        opacity: click > 0 && click < 1 ? 1 - click : 0,
                        transform: `scale(${0.3 + click * 1.4})`
                    }}
                />
            </div>
        </AbsoluteFill>
    )
}
