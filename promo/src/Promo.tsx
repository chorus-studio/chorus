import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { C, FONT } from './theme'
import { Background } from './ui/primitives'
import { Intro, INTRO_LEN } from './scenes/Intro'
import { Hook, HOOK_LEN } from './scenes/Hook'
import { PlayerBarScene, PLAYERBAR_LEN } from './scenes/PlayerBar'
import { SnipScene, SNIP_LEN } from './scenes/Snip'
import { SpeedScene, SPEED_LEN } from './scenes/Speed'
import { ShapeScene, SHAPE_LEN } from './scenes/Shape'
import { VocalsScene, VOCALS_LEN } from './scenes/Vocals'
import { AutoSkipScene, AUTOSKIP_LEN } from './scenes/AutoSkip'
import { MoreScene, MORE_LEN } from './scenes/More'
import { Outro, OUTRO_LEN } from './scenes/Outro'

// Scene order. Every cut lands on a beat of the 120 BPM track (15 frames per beat).
const SCENES: { name: string; len: number }[] = [
    { name: 'intro', len: INTRO_LEN },
    { name: 'hook', len: HOOK_LEN },
    { name: 'playerbar', len: PLAYERBAR_LEN },
    { name: 'snip', len: SNIP_LEN },
    { name: 'speed', len: SPEED_LEN },
    { name: 'shape', len: SHAPE_LEN },
    { name: 'vocals', len: VOCALS_LEN },
    { name: 'autoskip', len: AUTOSKIP_LEN },
    { name: 'more', len: MORE_LEN },
    { name: 'outro', len: OUTRO_LEN }
]
const START: Record<string, number> = {}
let acc = 0
for (const s of SCENES) {
    START[s.name] = acc
    acc += s.len
}
export const TOTAL_FRAMES = acc // 1500 = 50 s

/** mirrors the kick pattern in scripts/make-track.mjs: bars 2–22 on beats 1 and 3, one final hit at bar 24 */
export const kickEnv = (frame: number) => {
    let k = -1
    if (frame >= 120 && frame < 1380) k = frame - ((frame - 120) % 30)
    else if (frame >= 1440) k = 1440
    if (k < 0) return 0
    return Math.exp(-(frame - k) / 6)
}

export const Promo = () => {
    const frame = useCurrentFrame()
    const kick = kickEnv(frame)
    return (
        <AbsoluteFill style={{ background: C.bg, fontFamily: FONT.ui, color: '#fff', overflow: 'hidden' }}>
            <Background frame={frame} kick={kick} />
            <Sequence from={START.intro} durationInFrames={INTRO_LEN} name="Intro">
                <Intro />
            </Sequence>
            <Sequence from={START.hook} durationInFrames={HOOK_LEN} name="Hook">
                <Hook />
            </Sequence>
            <Sequence from={START.playerbar} durationInFrames={PLAYERBAR_LEN} name="Player bar">
                <PlayerBarScene />
            </Sequence>
            <Sequence from={START.snip} durationInFrames={SNIP_LEN} name="Snips">
                <SnipScene />
            </Sequence>
            <Sequence from={START.speed} durationInFrames={SPEED_LEN} name="Speed">
                <SpeedScene />
            </Sequence>
            <Sequence from={START.shape} durationInFrames={SHAPE_LEN} name="EQ + Reverb">
                <ShapeScene />
            </Sequence>
            <Sequence from={START.vocals} durationInFrames={VOCALS_LEN} name="Vocals">
                <VocalsScene />
            </Sequence>
            <Sequence from={START.autoskip} durationInFrames={AUTOSKIP_LEN} name="Auto-skip">
                <AutoSkipScene />
            </Sequence>
            <Sequence from={START.more} durationInFrames={MORE_LEN} name="More">
                <MoreScene />
            </Sequence>
            <Sequence from={START.outro} durationInFrames={OUTRO_LEN} name="Outro">
                <Outro kick={kick} />
            </Sequence>
            <Audio
                src={staticFile('track.wav')}
                volume={(f) =>
                    interpolate(f, [0, 20, TOTAL_FRAMES - 45, TOTAL_FRAMES], [0, 0.85, 0.85, 0], {
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp'
                    })
                }
            />
        </AbsoluteFill>
    )
}
