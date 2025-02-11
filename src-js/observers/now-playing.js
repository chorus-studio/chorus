import { store } from '../stores/data.js'
import { currentData } from '../data/current.js'

import LoopIcon from '../models/loop-icon.js'
import HeartIcon from '../models/heart-icon.js'
import SeekIcons from '../models/seek/seek-icon.js'
import { currentSongInfo } from '../utils/song.js'

export default class NowPlayingObserver {
    constructor({ snip, chorus, songTracker }) {
        this._snip = snip
        this._observer = null
        this._currentSongId = null
        this._songTracker = songTracker

        this._chorus = chorus
        this._seekIcons = new SeekIcons()
        this._loopIcon = new LoopIcon(songTracker)
        this._heartIcon = new HeartIcon()
    }

    async observe() {
        const target = document.querySelector('[data-testid="now-playing-widget"]')
        this._observer = new MutationObserver(this.#mutationHandler)
        this._observer.observe(target, { attributes: true })

        this.#toggleSnipUI()
        this._seekIcons.init()
        this._loopIcon.init()
        this._heartIcon.init()
        const track = await this.setNowPlayingData()
        await this._songTracker.init()
        this._loopIcon.highlightLoop(track)
        await this._heartIcon.highlightIcon()
    }

    #isAnchor(mutation) {
        return (
            mutation.type === 'attributes' &&
            mutation.target.localName == 'div' &&
            mutation.attributeName === 'aria-label'
        )
    }

    async setNowPlayingData() {
        const track = await currentData.readTrack()
        await store.setNowPlaying(track)
        return track
    }

    get #songId() {
        return currentSongInfo().id
    }

    get #songChanged() {
        if (this._currentSongId == null) return true

        return this.#songId !== this._currentSongId
    }

    #mutationHandler = async (mutationsList) => {
        for (const mutation of mutationsList) {
            if (!this.#isAnchor(mutation)) return
            if (!this.#songChanged) return

            this._currentSongId = this.#songId
            if (this._chorus.isShowing) this._snip.init()

            const track = await this.setNowPlayingData()
            await this._songTracker.songChange()

            this._loopIcon.updateIconPosition()
            this._loopIcon.highlightLoop(track)
            await this._heartIcon.highlightIcon()

            this._snip.updateView()
            await this._seekIcons.setSeekLabels()
        }
    }

    #toggleSnipUI() {
        const snipUI = document.getElementById('chorus')
        if (!snipUI) return

        snipUI.style.display = this._observer ? 'flex' : 'none'
        const chorusMain = document.getElementById('chorus-main')
        if (!chorusMain) return

        chorusMain.style.display = 'none'
    }

    disconnect() {
        this._observer?.disconnect()
        this._currentSongId = null
        this._loopIcon.removeIcon()
        this._heartIcon.removeIcon()
        this._seekIcons.removeIcons()
        this._songTracker.clearListeners()
        this._observer = null
        this.#toggleSnipUI()
    }
}
