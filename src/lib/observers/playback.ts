import { mount } from 'svelte'
import { get } from 'svelte/store'
import { mediaStore } from '$lib/stores/media'
import { nowPlaying } from '$lib/stores/now-playing'
import TimeProgress from '$lib/components/TimeProgress.svelte'
import VolumeSlider from '$lib/components/VolumeSlider.svelte'
export class PlaybackObserver {
    private observer: MutationObserver | null = null

    observe() {
        const target = document.querySelector('[data-testid="playback-position"]')
        if (!target) return

        this.observer = new MutationObserver(this.handleMutation)
        this.observer.observe(target, { characterData: true, subtree: true })
        this.removeAddToPlaylistButton()
        this.replaceProgress()
        this.replaceVolumeSlider()
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

    private replaceVolumeSlider() {
        const volumeButton = document.querySelector('#volume-button')
        if (volumeButton) return

        const target = document.querySelector('[data-testid="volume-bar"] div') as HTMLElement
        if (!target) return

        const container = target?.parentElement
        if (!container) return
        container.style.display = 'none'

        const root = container.parentElement?.parentElement
        if (!root) return
        root.style.flexDirection = 'column'
        mount(VolumeSlider, { target: root })
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

    private removeAddToPlaylistButton() {
        const addToPlaylistButton = document.querySelector(
            '[data-testid="now-playing-widget"] > div > button[data-encore-id="buttonTertiary"]'
        ) as HTMLButtonElement

        if (!addToPlaylistButton) return

        const visibility = addToPlaylistButton.style.visibility
        if (visibility === 'hidden') return

        const parent = addToPlaylistButton?.parentElement
        if (parent) {
            parent.style.margin = '0'
            parent.style.gap = '0'
        }
        if (addToPlaylistButton) {
            addToPlaylistButton.style.visibility = 'hidden'
            addToPlaylistButton.style.width = '0'
        }
    }

    private replaceProgress() {
        const chorusTimeProgress = document.querySelector('#chorus-time-progress')
        if (chorusTimeProgress) return

        const target = document.querySelector('[data-testid="playback-progressbar"]') as HTMLElement
        const playbackPosition = document.querySelector(
            '[data-testid="playback-position"]'
        ) as HTMLElement
        const playbackDuration = document.querySelector(
            '[data-testid="playback-duration"]'
        ) as HTMLElement
        if (!target || !playbackPosition || !playbackDuration) return

        const container = target.parentElement
        if (!container) return

        target.style.width = '0'
        target.style.visibility = 'hidden'
        playbackPosition.style.visibility = 'hidden'
        playbackDuration.style.visibility = 'hidden'
        playbackPosition.style.minWidth = '0'
        playbackPosition.style.width = '0'
        playbackDuration.style.minWidth = '0'
        playbackDuration.style.width = '0'

        mount(TimeProgress, {
            target: container,
            props: { id: 'chorus-time-progress', port: null }
        })
    }

    private handleMutation = async (mutations: MutationRecord[]) => {
        for (const mutation of mutations) {
            if (mutation.type !== 'characterData') return
            const newValue = mutation.target.nodeValue
            if (!newValue) return

            await this.checkForDJ()
            await nowPlaying.updateNowPlaying()
            this.removeAddToPlaylistButton()
        }
    }

    disconnect() {
        this.observer?.disconnect()
        this.observer = null
    }
}

export const playbackObserver = new PlaybackObserver()
