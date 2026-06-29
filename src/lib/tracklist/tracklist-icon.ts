import { unmount } from 'svelte'
import { trackSongInfo } from '$lib/utils/song'

export class TrackListIcon {
    protected selector: string
    protected seen: Set<string>
    // Track every per-row component mounted into Spotify's tracklist so they can
    // be fully unmounted (not just orphaned) when the extension is disabled.
    protected mounted: Array<{ instance: Record<string, any>; container: HTMLElement }> = []

    constructor(selector: string) {
        this.selector = selector
        this.seen = new Set()
    }

    protected getIcon(row: Element) {
        return row.querySelector(this.selector)
    }

    protected track(instance: Record<string, any>, container: HTMLElement) {
        // Spotify virtualizes long tracklists: rows (and our injected button
        // containers inside them) get detached on scroll. Drop+unmount those stale
        // entries so this array stays proportional to currently-rendered rows
        // instead of growing for the whole session.
        this.mounted = this.mounted.filter(({ instance: inst, container: c }) => {
            if (c.isConnected) return true
            try {
                unmount(inst)
            } catch (e) {
                // already gone; ignore
            }
            return false
        })
        this.mounted.push({ instance, container })
    }

    teardown() {
        for (const { instance, container } of this.mounted) {
            try {
                unmount(instance)
            } catch (e) {
                // component may already be gone; ignore
            }
            container.remove()
        }
        this.mounted = []
        this.seen.clear()
    }

    setInitialState(row: Element) {
        this.initializeTrack(row)
    }

    private async initializeTrack(row: Element) {
        const song = trackSongInfo(row)

        if (!song?.id) return
        if (this.seen.has(song.id)) return

        this.seen.add(song.id)
    }
}
