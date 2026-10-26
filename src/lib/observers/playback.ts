import { get } from 'svelte/store'
import { mount, unmount, SvelteComponent } from 'svelte'

import { mediaStore } from '$lib/stores/media'
import { nowPlaying } from '$lib/stores/now-playing'
import { settingsStore } from '$lib/stores/settings'

import TimeProgress from '$lib/components/TimeProgress.svelte'
import VolumeSlider from '$lib/components/VolumeSlider.svelte'

const PROGRESS_ID = 'chorus-time-progress'
const VOLUME_ID = 'chorus-volume'

const query = <T extends HTMLElement = HTMLElement>(selector: string) =>
    document.querySelector(selector) as T | null

// Set an inline style only when it differs, so repeated syncs don't churn.
function setStyle(
    el: HTMLElement | null,
    prop: 'width' | 'minWidth' | 'visibility' | 'display' | 'flexDirection',
    value: string
) {
    if (el && el.style[prop] !== value) el.style[prop] = value
}

// Grafts the Chorus progress bar and volume slider into Spotify's player bar
// in place of the native ones, and feeds the now-playing store from the
// position label. Spotify re-renders parts of that bar on its own — the whole
// progress row when it switches between the music and podcast layouts, the
// control cluster on some track changes — which detaches whatever we mounted
// beside them and discards the inline styles hiding its controls. Nothing
// here caches nodes, and every `sync*` is idempotent against the live DOM, so
// the content script's reconciler can run `syncWidgets()` on every footer
// mutation batch and the bar heals itself.
export class PlaybackObserver {
    private observer: MutationObserver | null = null
    private observedPosition: Element | null = null
    private volumeSlider: SvelteComponent | null = null
    private timeProgress: SvelteComponent | null = null

    observe() {
        this.observePosition()
        this.togglePlaylistButton()
        this.updateChorusUI()
    }

    // Everything that must hold after Spotify re-renders the player bar.
    updateChorusUI() {
        this.ensureSeekButtonAfterSkipBack()
        this.removeLongformButtons()
        this.syncWidgets()
    }

    syncWidgets() {
        this.observePosition()
        this.syncProgress()
        this.syncVolume()
    }

    // Watch the elapsed-time label; re-bind when Spotify swaps the node.
    private observePosition() {
        const target = query('[data-testid="playback-position"]')
        if (!target || target === this.observedPosition) return
        this.observer?.disconnect()
        this.observer = new MutationObserver(this.handleMutation)
        this.observer.observe(target, { characterData: true, subtree: true })
        this.observedPosition = target
    }

    private ensureSeekButtonAfterSkipBack() {
        const skipBack = query('[data-testid="control-button-skip-back"]')
        const wrapper = query('#seek-player-rw-button')?.parentElement
        if (!skipBack?.parentElement || !wrapper) return
        // Moving a node that is already in place still fires a mutation, which
        // would re-trigger the reconciler that called us.
        if (wrapper.nextElementSibling === skipBack) return
        skipBack.parentElement.insertBefore(wrapper, skipBack)
    }

    private removeLongformButtons() {
        document
            .querySelectorAll<HTMLElement>(
                '[data-testid="control-button-playback-speed"], [data-testid="control-button-seek-back-15"], [data-testid="control-button-seek-forward-15"]'
            )
            .forEach((button) => setStyle(button, 'display', 'none'))
    }

    get settings() {
        return get(settingsStore)
    }

    // ---- volume -----------------------------------------------------------

    toggleVolumeSlider() {
        this.syncVolume()
    }

    private unmountVolumeSlider() {
        if (!this.volumeSlider) return
        unmount(this.volumeSlider, { outro: true })
        this.volumeSlider = null
    }

    private syncVolume() {
        if (!this.settings.ui.volume) {
            this.unmountVolumeSlider()
            this.setSpotifyVolumeHidden(false)
            return
        }

        const container = query('[data-testid="volume-bar"] div')?.parentElement ?? null
        const root = container?.parentElement?.parentElement ?? null
        const slider = document.getElementById(VOLUME_ID)
        const present = Boolean(slider && root && root.contains(slider))

        // Ours is gone or sits in a container Spotify has thrown away.
        if (this.volumeSlider && !present) this.unmountVolumeSlider()
        if (!root) return
        if (!this.volumeSlider && !present) {
            this.volumeSlider = mount(VolumeSlider, {
                target: root,
                props: { id: VOLUME_ID, port: null }
            }) as SvelteComponent
        }
        this.setSpotifyVolumeHidden(true)
    }

    // Clearing a style property ('') removes only our override and falls back
    // to Spotify's stylesheet, which is how the native control comes back.
    private setSpotifyVolumeHidden(hidden: boolean) {
        setStyle(query('[data-testid="volume-bar"]'), 'display', hidden ? 'none' : '')
        const container = query('[data-testid="volume-bar"] div')?.parentElement ?? null
        setStyle(container, 'display', hidden ? 'none' : '')
        const root = container?.parentElement?.parentElement ?? null
        setStyle(root, 'flexDirection', hidden ? 'column' : '')
    }

    // ---- progress ---------------------------------------------------------

    toggleProgress() {
        this.syncProgress()
    }

    private unmountProgress() {
        if (!this.timeProgress) return
        unmount(this.timeProgress, { outro: true })
        this.timeProgress = null
    }

    private syncProgress() {
        if (!this.settings.ui.progress) {
            this.unmountProgress()
            this.setSpotifyProgressHidden(false)
            return
        }

        const container = query('[data-testid="playback-progressbar"]')?.parentElement ?? null
        const bar = document.getElementById(PROGRESS_ID)
        const present = Boolean(bar && container && container.contains(bar))

        if (this.timeProgress && !present) this.unmountProgress()
        if (!container) return
        if (!this.timeProgress && !present) {
            this.timeProgress = mount(TimeProgress, {
                target: container,
                props: { id: PROGRESS_ID, port: null }
            }) as SvelteComponent
        }
        this.setSpotifyProgressHidden(true)
    }

    private setSpotifyProgressHidden(hidden: boolean) {
        const bar = query('[data-testid="playback-progressbar"]')
        setStyle(bar, 'width', hidden ? '0' : '')
        setStyle(bar, 'visibility', hidden ? 'hidden' : '')
        for (const id of ['playback-position', 'playback-duration']) {
            const label = query(`[data-testid="${id}"]`)
            setStyle(label, 'visibility', hidden ? 'hidden' : '')
            setStyle(label, 'minWidth', hidden ? '0' : '')
            setStyle(label, 'width', hidden ? '0' : '')
        }
    }

    // ---- playlist button --------------------------------------------------

    togglePlaylistButton() {
        const addToPlaylistButtons = document.querySelectorAll<HTMLButtonElement>(
            '[data-testid="now-playing-widget-v2"] > div > button[data-encore-id="buttonTertiary"]'
        )
        if (!addToPlaylistButtons.length) return

        const show = this.settings.ui.playlist
        addToPlaylistButtons.forEach((button) => {
            const shouldShow = show ? 'visible' : 'hidden'
            if (button.style.visibility === shouldShow) return

            const parent = button.parentElement
            if (parent) {
                parent.style.margin = show ? '0 8px' : '0'
                parent.style.width = show ? 'auto' : '0'
                parent.style.gap = show ? '12px' : '0'
            }
            button.style.visibility = shouldShow
            button.style.width = show ? 'auto' : '0'
        })
    }

    private async checkForDJ() {
        const target = query('[data-testid="control-button-npv"]')
        if (!target) return

        const djUI = target.previousElementSibling as HTMLElement
        const media = get(mediaStore)
        if ((!djUI && media.dj) || (djUI && !media.dj)) {
            await mediaStore.updateState()
        }
    }

    private handleMutation = async (mutations: MutationRecord[]) => {
        for (const mutation of mutations) {
            if (mutation.type !== 'characterData') return
            if (!mutation.target.nodeValue) return

            await this.checkForDJ()
            await nowPlaying.updateNowPlaying()
            this.togglePlaylistButton()
        }
    }

    disconnect() {
        this.observer?.disconnect()
        this.observer = null
        this.observedPosition = null
    }

    // Reverse every inline-style change this observer made to Spotify's own
    // controls, returning the player to vanilla.
    private restoreNativeControls() {
        document
            .querySelectorAll<HTMLElement>(
                '[data-testid="control-button-playback-speed"], [data-testid="control-button-seek-back-15"], [data-testid="control-button-seek-forward-15"]'
            )
            .forEach((button) => setStyle(button, 'display', ''))

        this.setSpotifyVolumeHidden(false)
        this.setSpotifyProgressHidden(false)

        document
            .querySelectorAll<HTMLElement>(
                '[data-testid="now-playing-widget-v2"] > div > button[data-encore-id="buttonTertiary"]'
            )
            .forEach((button) => {
                button.style.visibility = ''
                button.style.width = ''
                const parent = button.parentElement
                if (parent) {
                    parent.style.margin = ''
                    parent.style.width = ''
                    parent.style.gap = ''
                }
            })
    }

    // Full teardown for the master on/off toggle: unmount the Chorus volume/progress
    // widgets, restore Spotify's native controls, then stop observing.
    teardown() {
        this.unmountVolumeSlider()
        this.unmountProgress()
        this.restoreNativeControls()
        this.disconnect()
    }
}

export const playbackObserver = new PlaybackObserver()
