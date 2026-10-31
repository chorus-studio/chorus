/**
 * The theme page lives at a hash on whatever Spotify URL is open, as the New
 * releases page does (releases-route): Spotify's router leaves the hash
 * alone, so the page underneath stays put, and Back or any navigation of
 * Spotify's own leaves the page. The content script mounts the page over the
 * main view while the hash matches.
 */
export const THEME_HASH = '#chorus/theme'

export function isThemeRoute(hash: string): boolean {
    return hash === THEME_HASH || hash.startsWith(`${THEME_HASH}?`)
}

/** Open the page: a new history entry, so Back leaves it. Already open, nothing happens. */
export function openThemePage(): void {
    if (isThemeRoute(location.hash)) return
    location.hash = THEME_HASH
}

/** Leave the page without adding a history entry, and let the route watcher see it. */
export function closeThemePage(): void {
    if (!isThemeRoute(location.hash)) return
    history.replaceState(history.state, '', location.pathname + location.search)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
}
