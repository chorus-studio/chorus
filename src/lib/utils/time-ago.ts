const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

/** "3d ago"-style age of a timestamp (ms since epoch); null when there is none. */
export function timeAgo(at?: number | null, now = Date.now()): string | null {
    if (!at) return null
    const elapsed = now - at
    if (elapsed < MINUTE) return 'just now'
    if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`
    if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`
    if (elapsed < WEEK) return `${Math.floor(elapsed / DAY)}d ago`
    if (elapsed < MONTH) return `${Math.floor(elapsed / WEEK)}w ago`
    if (elapsed < YEAR) return `${Math.floor(elapsed / MONTH)}mo ago`
    return `${Math.floor(elapsed / YEAR)}y ago`
}
