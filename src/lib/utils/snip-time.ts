// Time helpers for the snip editor. Snip bounds are stored in seconds and
// edited at 0.1 s resolution.

export const round1 = (n: number) => Math.round(n * 10) / 10

const pad = (n: number) => String(n).padStart(2, '0')

/** 67.4 → "1:07.4", 3725 → "1:02:05.0" */
export function formatSnipTime(seconds: number): string {
    const total = Math.max(0, round1(Number.isFinite(seconds) ? seconds : 0))
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    const sec = s.toFixed(1).padStart(4, '0')
    return h > 0 ? `${h}:${pad(m)}:${sec}` : `${m}:${sec}`
}

/** Whole-second label for rulers: 67 → "1:07", 3725 → "1:02:05". */
export function formatRulerTime(seconds: number): string {
    const total = Math.max(0, Math.round(seconds))
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/**
 * Accepts "75", "1:15", "1:15.4", "0:01:15", "01:15.40" and the legacy
 * "hh:mm:ss:ff" (centiseconds). Returns seconds, or null when unparseable.
 */
export function parseTimeInput(input: string): number | null {
    const raw = input.trim()
    if (!raw) return null
    const parts = raw.split(':')
    if (parts.length > 4 || parts.some((p) => p === '' || !/^\d+(\.\d+)?$/.test(p))) return null
    const nums = parts.map(Number)
    if (nums.some((n) => !Number.isFinite(n))) return null

    let seconds: number
    if (nums.length === 1) seconds = nums[0]
    else if (nums.length === 2) seconds = nums[0] * 60 + nums[1]
    else if (nums.length === 3) seconds = nums[0] * 3600 + nums[1] * 60 + nums[2]
    else seconds = nums[0] * 3600 + nums[1] * 60 + nums[2] + nums[3] / 100

    return round1(seconds)
}

/** Keep a snip inside the track with at least `minLength` seconds between bounds. */
export function clampSnip(
    { start, end }: { start: number; end: number },
    duration: number,
    minLength = 1
): { start: number; end: number } {
    const max = duration > 0 ? duration : Math.max(end, start + minLength)
    let s = Math.min(Math.max(round1(start), 0), max)
    let e = Math.min(Math.max(round1(end), 0), max)
    if (e - s < minLength) {
        // Preserve whichever bound the caller moved by pushing the other one.
        if (s + minLength <= max) e = round1(s + minLength)
        else s = round1(Math.max(0, e - minLength))
    }
    return { start: s, end: e }
}
