import { mount, unmount } from 'svelte'
import DiscographyTrackButton from '$lib/components/DiscographyTrackButton.svelte'

/** What the open artist or album page is about, read from its header. */
export type PageTarget =
    | { kind: 'artist'; artist: { id: string; name: string } }
    | { kind: 'album'; artist: { id: string; name: string }; album: { id: string; name: string } }

export const TRACK_PILL_ID = 'chorus-track-pill'

const artistIdOf = (href: string | null | undefined) =>
    /\/artist\/([A-Za-z0-9]+)/.exec(href ?? '')?.[1] ?? null

/**
 * The page under the pathname and its action bar, when Spotify has rendered
 * them. An album page names its artist through the header's creator link;
 * the first one stands for a collaboration.
 */
export function readPage(
    root: ParentNode = document,
    pathname = location.pathname
): { target: PageTarget; row: HTMLElement } | null {
    const match = /^\/(artist|album)\/([A-Za-z0-9]+)/.exec(pathname)
    if (!match) return null
    const [, kind, id] = match
    const section = root.querySelector<HTMLElement>(`section[data-testid="${kind}-page"]`)
    const row = section?.querySelector<HTMLElement>('[data-testid="action-bar-row"]')
    if (!section || !row) return null
    if (kind === 'artist') {
        const name = section.querySelector('h1')?.textContent?.trim() ?? ''
        return { target: { kind: 'artist', artist: { id, name } }, row }
    }
    const creator = section.querySelector<HTMLAnchorElement>(
        'a[data-testid="creator-link"][href*="/artist/"], a[href*="/artist/"]'
    )
    const artistId = artistIdOf(creator?.getAttribute('href'))
    if (!artistId) return null
    const title =
        section.querySelector('[data-testid="entityTitle"]')?.textContent?.trim() ??
        section.querySelector('h1')?.textContent?.trim() ??
        ''
    return {
        target: {
            kind: 'album',
            artist: { id: artistId, name: creator?.textContent?.trim() ?? '' },
            album: { id, name: title }
        },
        row
    }
}

const keyOf = (target: PageTarget) =>
    target.kind === 'artist' ? `artist:${target.artist.id}` : `album:${target.album.id}`

/**
 * Grafts a Track pill into the action bar of Spotify's artist and album
 * pages, beside Follow / Save, and keeps it there across navigation: the
 * main view is watched for the page re-rendering, and the pill is remounted
 * whenever the page's subject changes or Spotify drops the old action bar.
 */
export class DiscographyPages {
    private observer: MutationObserver | null = null
    private timeout: ReturnType<typeof setTimeout> | null = null
    private mounted: { key: string; container: HTMLElement; instance: Record<string, any> } | null =
        null

    /** Whether the main view is being watched. */
    get observing(): boolean {
        return this.observer !== null
    }

    observe() {
        const target = document.querySelector('main') ?? document.getElementById('main-view')
        if (!target) return
        this.observer?.disconnect()
        this.observer = new MutationObserver(this.schedule)
        this.observer.observe(target, { childList: true, subtree: true })
        window.addEventListener('popstate', this.schedule)
        this.schedule()
    }

    private schedule = () => {
        if (this.timeout) clearTimeout(this.timeout)
        this.timeout = setTimeout(() => {
            this.timeout = null
            this.sync()
        }, 150)
    }

    /** Idempotent: mounts the pill when the page has an action bar and it is missing or stale. */
    sync() {
        const page = readPage()
        if (!page) {
            // Off an artist / album page: the pill left with Spotify's action bar.
            if (this.mounted && !this.mounted.container.isConnected) this.unmountPill()
            return
        }
        const key = keyOf(page.target)
        if (this.mounted?.key === key && this.mounted.container.isConnected) return
        this.unmountPill()

        const container = document.createElement('div')
        container.id = TRACK_PILL_ID
        container.style.display = 'contents'
        const more = page.row.querySelector('[data-testid="more-button"]')
        if (more) page.row.insertBefore(container, more)
        else page.row.appendChild(container)
        this.mounted = {
            key,
            container,
            instance: mount(DiscographyTrackButton, {
                target: container,
                props: { target: page.target }
            })
        }
    }

    private unmountPill() {
        if (!this.mounted) return
        try {
            unmount(this.mounted.instance)
        } catch (error) {
            console.warn('Failed to unmount the Chorus track pill', error)
        }
        this.mounted.container.remove()
        this.mounted = null
    }

    /** Stop watching; the pill stays until the page re-renders. Safe on every App remount. */
    disconnect() {
        this.observer?.disconnect()
        this.observer = null
        window.removeEventListener('popstate', this.schedule)
        if (this.timeout) {
            clearTimeout(this.timeout)
            this.timeout = null
        }
    }

    /** Master-off: stop watching and take the pill out of Spotify's page. */
    teardown() {
        this.disconnect()
        this.unmountPill()
    }
}

export const discographyPages = new DiscographyPages()
