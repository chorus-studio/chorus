import { trackSongInfo } from '$lib/utils/song'

export class TrackListIcon {
    protected key: string
    protected selector: string
    protected seen: Set<string>

    constructor({ key, selector }: { key: string; selector: string }) {
        this.key = key
        this.selector = selector
        this.seen = new Set()
    }

    protected getIcon(row: Element) {
        return row.querySelector(this.selector)
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
