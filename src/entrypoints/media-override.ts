import Reverb from '$lib/audio-effects/reverb'
import Equalizer from '$lib/audio-effects/equalizer'
import MediaElement from '../lib/media/media-element'
import AudioManager from '$lib/audio-effects/audio-manager'

function mediaOverride() {
    // Expose first media source directly
    ;(window as any).mediaSource = null
    let reverb: Reverb | null = null
    let equalizer: Equalizer | null = null
    let mediaElement: MediaElement | null = null
    let audioManager: AudioManager | null = null

    // Store the original createElement method
    const originalCreateElement = document.createElement

    function addSource(source: HTMLMediaElement) {
        if ((source as any).isPlaybackRateChanged) return
        ;(source as any).isPlaybackRateChanged = true

        // Set the media source
        ;(window as any).mediaSource = source

        // For cross-origin sources, just use direct playback
        try {
            const currentSrc = source.currentSrc
            if (currentSrc) {
                const sourceUrl = new URL(currentSrc)
                const isCrossOrigin = sourceUrl.origin !== window.location.origin

                if (isCrossOrigin) return
            }
        } catch (error) {
            console.warn('Error checking source origin:', error)
            // If we can't determine the origin, use direct playback to be safe
            return
        }

        // Initialize audio effects
        audioManager = new AudioManager(source)
        reverb = new Reverb(audioManager)
        equalizer = new Equalizer(audioManager)

        // Create a new MediaElement instance
        mediaElement = new MediaElement({
            source,
            equalizer,
            reverb,
            audioManager
        })
    }

    function replaceConstructor(className: any) {
        return class extends className {
            constructor(...args: any[]) {
                super(...args)
                addSource(this as unknown as HTMLMediaElement)
            }
        }
    }

    function replaceMethod() {
        const prototype = Document.prototype
        const descriptor = Object.getOwnPropertyDescriptor(prototype, 'createElement') ?? {}
        Object.defineProperty(prototype, 'createElement', {
            ...descriptor,
            value: function createElement(tagName: string, options?: ElementCreationOptions) {
                const result = originalCreateElement.apply(this, [tagName, options])
                if (result.tagName === 'VIDEO' || result.tagName === 'AUDIO') {
                    addSource(result as HTMLMediaElement)
                }
                return result
            }
        })
    }

    function addPlayListener() {
        const elements = document.querySelectorAll('video,audio')
        for (const el of elements) {
            addSource(el as HTMLMediaElement)
        }
    }

    replaceMethod()
    // Use type assertion to handle the incompatible types
    ;(window as any).Audio = (self as any).Audio = replaceConstructor(window.Audio)

    const observer = new MutationObserver((mutations) => {
        if (mutations.find((v) => v.addedNodes.length)) addPlayListener()
    })
    observer.observe(document, { childList: true, subtree: true })
    addPlayListener()

    window.addEventListener('message', (event) => {
        // Verify the origin for security
        if (event.source !== window) return

        try {
            const { type, data } = event.data

            if (!mediaElement) return

            switch (type) {
                case 'FROM_PLAYBACK_LISTENER':
                    if (mediaElement) {
                        mediaElement.mediaOverride.updatePlaybackSettings({
                            playback_rate: Number(data?.playback_rate) || 1,
                            preserves_pitch: Boolean(data?.preserves_pitch)
                        })
                    }
                    break

                case 'FROM_EFFECTS_LISTENER':
                    if (mediaElement) {
                        mediaElement.updateAudioEffect({
                            clear: Boolean(data?.clear),
                            reverb: data?.reverb ? String(data.reverb) : undefined,
                            equalizer: data?.equalizer ? String(data.equalizer) : undefined
                        })
                    }
                    break

                case 'FROM_VOLUME_LISTENER':
                    if (mediaElement) {
                        mediaElement.mediaOverride.updateVolume({
                            value: Number(data?.value) || 0,
                            muted: Boolean(data?.muted),
                            type: String(data?.type) as 'linear' | 'logarithmic'
                        })
                    }
                    break

                case 'FROM_CURRENT_TIME_LISTENER':
                    if (mediaElement) {
                        mediaElement.mediaOverride.updateCurrentTime(Number(data) || 0)
                    }
                    break
            }
        } catch (error) {
            console.warn('Error handling message:', error)
        }
    })
}

export default defineUnlistedScript({
    main() {
        mediaOverride()
    }
})
