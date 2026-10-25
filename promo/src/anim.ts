import { Easing, interpolate, spring, useCurrentFrame } from 'remotion'
import type { CSSProperties } from 'react'

export const FPS = 30
export const BEAT = 15
export const BAR = 60

/** critically damped, ~0.45 s to settle, no overshoot */
export const SNAP = { damping: 26, stiffness: 170, mass: 1 }
/** ~12 % overshoot, settles in ~0.5 s */
export const POP = { damping: 11, stiffness: 160, mass: 0.6 }
/** slow and smooth */
export const SOFT = { damping: 22, stiffness: 60, mass: 1 }
/** very bouncy, for stamps and hits */
export const BOUNCE = { damping: 8, stiffness: 200, mass: 0.5 }

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export const sp = (
    frame: number,
    delay = 0,
    config: { damping: number; stiffness: number; mass: number } = SNAP,
    durationInFrames?: number
) => spring({ frame: Math.max(0, frame - delay), fps: FPS, config, durationInFrames })

export const ease = (
    frame: number,
    from: number,
    to: number,
    a = 0,
    b = 1,
    easing: (t: number) => number = Easing.inOut(Easing.cubic)
) =>
    interpolate(frame, [from, to], [a, b], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing
    })

export const useScene = (len: number, exitLen = 10) => {
    const frame = useCurrentFrame()
    const exit = exitLen > 0 ? ease(frame, len - exitLen, len, 0, 1, Easing.in(Easing.cubic)) : 0
    return { frame, exit }
}

export const exitStyle = (exit: number): CSSProperties => ({
    opacity: 1 - exit,
    transform: `translateY(${-48 * exit}px) scale(${1 - 0.04 * exit})`
})

export const fmtTime = (s: number, tenths = false) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    const base = `${m}:${String(sec).padStart(2, '0')}`
    return tenths ? `${base}.${Math.floor((s % 1) * 10)}` : base
}
