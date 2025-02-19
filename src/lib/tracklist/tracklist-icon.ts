import { trackSongInfo, currentSongInfo } from '$lib/utils/song'
import { mount } from 'svelte'
import HeartButton from '$lib/components/HeartButton.svelte'
import SkipButton from '$lib/components/SkipButton.svelte'
import TrackListButtons from '$lib/components/TrackListButtons.svelte'
// import Queue from '../queue.js'

export class TrackListIcon {
    protected key: string
    // private store: Store
    protected selector: string
    protected seen: Set<string>
    // private queue: Queue

    constructor({ key, selector }: { key: string; selector: string }) {
        this.key = key
        // this._store = store
        this.selector = selector
        this.seen = new Set()
        // this.queue = new Queue()
    }

    protected getIcon(row: HTMLElement) {
        return row.querySelector(this.selector)
    }

    setInitialState(row: HTMLElement) {
        console.log('setInitialState', { row })
        const icon = this.getIcon(row) as HTMLElement

        this.initializeTrack(row)
        // this.animate(icon)
    }

    private async initializeTrack(row: HTMLElement) {
        const song = trackSongInfo(row)

        if (!song?.id) return
        if (this.seen.has(song.id)) return

        this.seen.add(song.id)

        // await this._store.getTrack({
        //     id: song.id,
        //     value: {
        //         ...song,
        //         isSkipped: false,
        //         isSnip: false,
        //         startTime: 0,
        //         endTime: song.endTime
        //     }
        // })
    }

    private async getTrack(id: string) {
        // return await this._store.getTrack({ id })
    }

    private skipJustBlockedSong({ isSkipped, row }: { isSkipped: boolean; row: HTMLElement }) {
        const { id: currentSongId } = currentSongInfo()
        const { id: trackSongId } = trackSongInfo(row)

        if (isSkipped && currentSongId == trackSongId) {
            const skipForward = document.querySelector(
                '[data-testid="control-button-skip-forward"]'
            ) as HTMLButtonElement
            skipForward?.click()
        }
    }

    private async saveTrack(row: HTMLElement) {
        const song = trackSongInfo(row)
        if (!song) return

        // const snipInfo = await this.getTrack(song.id)

        // const savedTrack = await this._store.saveTrack({
        //     id: song.id,
        //     value: { ...snipInfo, isSkipped: !snipInfo.isSkipped }
        // })

        // this.skipJustBlockedSong({ isSkipped: savedTrack.isSkipped, row })

        // if (savedTrack.isSkipped) {
        //     await this._queue.refreshQueue()
        // }
    }

    private getRow(icon: HTMLElement) {
        return icon?.parentElement?.parentElement
    }

    async animate(icon: HTMLElement, _heart?: boolean) {
        const row = this.getRow(icon)
        if (!row) return
        const song = trackSongInfo(row)

        if (!song) return

        // const snipInfo = await this.getTrack(song.id)

        // const display = snipInfo?.[this._key] ?? false
        // this._burn({ icon, burn: display })
        // this._glow({ icon, glow: display })
        // icon.setAttribute('aria-label', `${display ? 'Un' : 'B'}lock Track`)
    }

    private getStyleProp(icon: HTMLElement) {
        return icon.role == 'snip' ? 'color' : 'fill'
    }

    burn({ icon, burn }: { icon: HTMLElement; burn: boolean }) {
        const svg = icon.querySelector('svg') as SVGElement
        if (burn) {
            icon.style.visibility = 'visible'
        }

        if (icon.role == 'skip') {
            icon.setAttribute('aria-label', `${burn ? 'Unb' : 'B'}lock Track`)
        }

        const styleProp = this.getStyleProp(icon)
        svg.style[styleProp] = burn ? '#1ed760' : 'currentColor'
    }

    glow({ icon, glow }: { icon: HTMLElement; glow: boolean }) {
        const svg = icon.querySelector('svg') as SVGElement
        const styleProp = this.getStyleProp(icon)

        svg.addEventListener('mouseover', () => {
            if (glow && svg.style[styleProp] == '#1ed760') return

            svg.style[styleProp] = glow ? '#1ed760' : '#fff'
        })

        svg.addEventListener('mouseleave', () => {
            if (glow && svg.style[styleProp] == '#1ed760') return

            svg.style[styleProp] = glow ? '#1ed760' : 'currentColor'
        })
    }
}
