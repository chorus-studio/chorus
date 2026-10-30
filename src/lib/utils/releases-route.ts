/**
 * The New releases page lives at a hash on whatever Spotify URL is open:
 * Spotify's router leaves the hash alone, so nothing renders underneath, and
 * the back button or any navigation of Spotify's own leaves the page. The
 * content script mounts the page while the hash matches.
 */
export const RELEASES_HASH = '#chorus/releases'

export function isReleasesRoute(hash: string): boolean {
    return hash === RELEASES_HASH || hash.startsWith(`${RELEASES_HASH}?`)
}

/** The hash for the page, carrying a search when there is one. */
export function releasesRoute(query = ''): string {
    const trimmed = query.trim()
    return trimmed ? `${RELEASES_HASH}?q=${encodeURIComponent(trimmed)}` : RELEASES_HASH
}

export function releasesQuery(hash: string): string {
    if (!isReleasesRoute(hash)) return ''
    const at = hash.indexOf('?')
    if (at === -1) return ''
    return new URLSearchParams(hash.slice(at + 1)).get('q') ?? ''
}

/** Open the page: a new history entry, so Back leaves it. */
export function openReleasesPage(query = '') {
    location.hash = releasesRoute(query)
}

/** Leave the page without adding a history entry, and let the route watcher see it. */
export function closeReleasesPage() {
    if (!isReleasesRoute(location.hash)) return
    history.replaceState(history.state, '', location.pathname + location.search)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
}
