/**
 * Jump back on resume (Seek tab): after a longer pause, a podcast or audiobook
 * picks up a few seconds earlier so the thread is easy to catch again.
 * `seconds` is the jump (0 = off); `after` is how many minutes the pause has
 * to last before it applies.
 */
export type ResumeRewind = { seconds: number; after: number }

export const RESUME_OFF: ResumeRewind = { seconds: 0, after: 0 }

/** Where playback should resume from, or null to leave it where it is. */
export function resumeRewindTarget(
    currentTime: number,
    pausedForMs: number,
    { seconds, after }: ResumeRewind
): number | null {
    if (seconds <= 0 || currentTime <= 0) return null
    if (pausedForMs < after * 60_000) return null
    return Math.max(0, currentTime - seconds)
}
