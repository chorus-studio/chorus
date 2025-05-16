import { get } from 'svelte/store'
import { mount, unmount, SvelteComponent } from 'svelte'

import { mediaStore } from '$lib/stores/media'
import { nowPlaying } from '$lib/stores/now-playing'
import { settingsStore } from '$lib/stores/settings'

import TimeProgress from '$lib/components/TimeProgress.svelte'
import VolumeSlider from '$lib/components/VolumeSlider.svelte'

export class PlaybackObserver {
    private observer: MutationObserver | null = null
    private volumeSlider: SvelteComponent | null = null
    private timeProgress: SvelteComponent | null = null

    observe() {
        const target = document.querySelector('[data-testid="playback-position"]')
        if (!target) return

        this.observer = new MutationObserver(this.handleMutation)
        this.observer.observe(target, { characterData: true, subtree: true })
        this.togglePlaylistButton()
        this.toggleVolumeSlider()
        if (this.settings.ui.progress) this.replaceProgress()
        this.updateChorusUI()
    }

    updateChorusUI() {
        this.ensureSeekButtonAfterSkipBack()
        this.removeLongformButtons()
    }

    private ensureSeekButtonAfterSkipBack() {
        const skipBack = document.querySelector('[data-testid="control-button-skip-back"]')
        const seekButton = document.querySelector('#seek-player-rw-button')
        if (!skipBack?.parentElement || !seekButton?.parentElement) return

        skipBack.parentElement?.insertBefore(seekButton.parentElement, skipBack)
    }

    private removeLongformButtons() {
        const buttons = document.querySelectorAll(
            '[data-testid="control-button-playback-speed"], [data-testid="control-button-seek-back-15"], [data-testid="control-button-seek-forward-15"]'
        ) as NodeListOf<HTMLElement>
        buttons.forEach((button) => (button.style.display = 'none'))
    }

    private toggleSpotifyVolume() {
        const showSpotifyVolume = !this.settings.ui.volume
        const target = document.querySelector('[data-testid="volume-bar"]') as HTMLElement
        if (!target) return

        target.style.display = showSpotifyVolume ? 'flex' : 'none'
    }

    toggleVolumeSlider() {
        if (this.settings.ui.volume) {
            this.replaceVolumeSlider()
        } else {
            this.unmountVolumeSlider()
        }
        this.toggleSpotifyVolume()
    }

    private unmountVolumeSlider() {
        if (!this.volumeSlider) return

        unmount(this.volumeSlider, { outro: true })
        this.volumeSlider = null
    }

    private replaceVolumeSlider() {
        const chorusVolume = document.querySelector('#chorus-volume')
        if (chorusVolume) return

        const target = document.querySelector('[data-testid="volume-bar"] div') as HTMLElement
        if (!target) return

        const container = target?.parentElement
        if (!container) return
        container.style.display = 'none'

        const root = container.parentElement?.parentElement
        if (!root) return
        root.style.flexDirection = 'column'
        this.volumeSlider = mount(VolumeSlider, {
            target: root,
            props: { id: 'chorus-volume', port: null }
        }) as SvelteComponent
    }

    private async checkForDJ() {
        const target = document.querySelector('[data-testid="control-button-npv"]')
        if (!target) return

        const djUI = target.previousElementSibling as HTMLElement
        const media = get(mediaStore)
        if ((!djUI && media.dj) || (djUI && !media.dj)) {
            await mediaStore.updateState()
        }
    }

    get settings() {
        return get(settingsStore)
    }

    togglePlaylistButton() {
        const addToPlaylistButtons = document.querySelectorAll(
            '[data-testid="now-playing-widget"] > div > button[data-encore-id="buttonTertiary"]'
        ) as NodeListOf<HTMLButtonElement>

        if (!addToPlaylistButtons?.length) return

        const show = this.settings.ui.playlist
        addToPlaylistButtons.forEach((button) => {
            const shouldShow = show ? 'visible' : 'hidden'
            const visibility = button.style.visibility
            if (visibility === shouldShow) return

            const parent = button?.parentElement
            if (parent) {
                parent.style.margin = show ? '0 8px' : '0'
                parent.style.width = show ? 'auto' : '0'
                parent.style.gap = show ? '12px' : '0'
            }
            if (button) {
                button.style.visibility = shouldShow
                button.style.width = show ? 'auto' : '0'
            }
        })
    }

    private toggleSpotifyProgress() {
        const showSpotifyProgress = !this.settings.ui.progress

        const target = document.querySelector('[data-testid="playback-progressbar"]') as HTMLElement
        const playbackPosition = document.querySelector(
            '[data-testid="playback-position"]'
        ) as HTMLElement
        const playbackDuration = document.querySelector(
            '[data-testid="playback-duration"]'
        ) as HTMLElement
        if (!target || !playbackPosition || !playbackDuration) return

        const container = playbackPosition.parentElement
        if (!container) return

        target.style.width = showSpotifyProgress ? '100%' : '0'
        target.style.visibility = showSpotifyProgress ? 'visible' : 'hidden'

        playbackPosition.style.visibility = showSpotifyProgress ? 'visible' : 'hidden'
        playbackPosition.style.minWidth = showSpotifyProgress ? '40px' : '0'
        playbackPosition.style.width = showSpotifyProgress ? 'auto' : '0'

        playbackDuration.style.visibility = showSpotifyProgress ? 'visible' : 'hidden'
        playbackDuration.style.minWidth = showSpotifyProgress ? '40px' : '0'
        playbackDuration.style.width = showSpotifyProgress ? 'auto' : '0'
    }

    toggleProgress() {
        if (this.settings.ui.progress) {
            this.replaceProgress()
        } else {
            this.unmountProgress()
        }

        this.toggleSpotifyProgress()
    }

    private unmountProgress() {
        if (!this.timeProgress) return

        unmount(this.timeProgress, { outro: true })
        this.timeProgress = null
    }

    private replaceProgress() {
        const chorusTimeProgress = document.querySelector('#chorus-time-progress')
        if (chorusTimeProgress) return

        const target = document.querySelector('[data-testid="playback-progressbar"]') as HTMLElement
        const container = target.parentElement
        if (!container) return
        this.toggleSpotifyProgress()

        this.timeProgress = mount(TimeProgress, {
            target: container,
            props: { id: 'chorus-time-progress', port: null }
        }) as SvelteComponent
    }

    private handleMutation = async (mutations: MutationRecord[]) => {
        for (const mutation of mutations) {
            if (mutation.type !== 'characterData') return
            const newValue = mutation.target.nodeValue
            if (!newValue) return

            await this.checkForDJ()
            await nowPlaying.updateNowPlaying()
            this.togglePlaylistButton()
        }
    }

    disconnect() {
        this.observer?.disconnect()
        this.observer = null
    }
}

export const playbackObserver = new PlaybackObserver()
