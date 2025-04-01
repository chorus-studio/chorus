import Reverb from '$lib/audio-effects/reverb'
import Equalizer from '$lib/audio-effects/equalizer'
import AudioManager from '$lib/audio-effects/audio-manager'

type Seek = {
    type: 'skip_back' | 'skip_forward'
    value: number
}

type Playback = {
    playback_rate: number
    preserves_pitch: boolean
}

type Volume = {
    value: number
    muted: boolean
    type: 'linear' | 'logarithmic'
}

function mediaOverride() {
    const sources: any[] = []
    const defaultSpeed = 1
    let speed = defaultSpeed
    let audioManager: AudioManager | null = null
    let equalizer: Equalizer | null = null
    let reverb: Reverb | null = null

    function addSource(source: any) {
        if (source.isPlaybackRateChanged) return
        source.isPlaybackRateChanged = true
        source.defaultPlaybackRate = 1
        source.playbackRate = 1
        sources.push(source)

        if (source instanceof HTMLMediaElement) {
            // Set crossOrigin to anonymous to handle CORS
            source.crossOrigin = 'anonymous'

            // Clean up previous audio effects if they exist
            if (audioManager) audioManager.dispose()

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

            audioManager = new AudioManager(source)
            equalizer = new Equalizer(audioManager)
            reverb = new Reverb(audioManager)

            // Add timeupdate event listener
            source.addEventListener('timeupdate', () => {
                document.dispatchEvent(
                    new CustomEvent('FROM_MEDIA_TIMEUPDATE', {
                        detail: { currentTime: source.currentTime }
                    })
                )
            })
        }
    }

    function replaceConstructor(className: any) {
        return class extends className {
            constructor(...args: any[]) {
                super(...args)
                addSource(this)
            }
        }
    }

    function replaceMethod() {
        const prototype = Document.prototype
        const original = prototype.createElement
        const descriptor = Object.getOwnPropertyDescriptor(prototype, 'createElement') ?? {}
        Object.defineProperty(prototype, 'createElement', {
            ...descriptor,
            value: function createElement(...args) {
                const result = original.apply(this, args)
                if (result.tagName === 'VIDEO' || result.tagName === 'AUDIO') addSource(result)
                return result
            }
        })
    }

    function replaceSetter(prop: string) {
        const prototype = HTMLMediaElement.prototype
        const descriptor = Object.getOwnPropertyDescriptor(prototype, prop)
        Object.defineProperty(prototype, prop, {
            ...descriptor,
            set: function (val) {
                if (val < 0 || val > 16)
                    throw new TypeError(
                        `Uncaught DOMException: Failed to set the 'playbackRate' property on 'HTMLMediaElement': The provided playback rate (${val}) is not in the supported playback range.`
                    )
                if (prototype.isPrototypeOf(this)) {
                    return descriptor.set.apply(this, [speed])
                }
                throw new TypeError('Illegal invocation')
            }
        })
    }

    function addPlayListener() {
        const elements = document.querySelectorAll('video,audio')
        for (const el of elements) addSource(el)
    }

    function updatePlaybackSettings(value: Playback) {
        speed = value.playback_rate
        for (const source of sources) {
            source.defaultPlaybackRate = 1
            source.playbackRate = value.playback_rate
            source.preservesPitch = value.preserves_pitch
        }
    }

    function updateSeek(data: Seek) {
        for (const source of sources) {
            if (data.type === 'skip_back') {
                source.currentTime = Math.max(source.currentTime - data.value, 0)
            } else if (data.type === 'skip_forward') {
                source.currentTime = Math.min(source.currentTime + data.value, source.duration)
            }
        }
    }

    function updateVolume(data: Volume) {
        // Scale volume: 0-300 -> 0-3 for gain node, 0-1 for regular source
        const scaledValue = data.value / 100

        for (const source of sources) {
            if (source instanceof HTMLMediaElement) {
                if (audioManager) {
                    // Just set the gain value without disconnecting
                    audioManager.setGain(data.muted ? 0 : scaledValue, data.type)
                }
            } else {
                // For non-HTMLMediaElement sources, clamp to 0-1 range
                source.volume = data.muted ? 0 : Math.min(1, scaledValue)
            }
        }
    }

    function updateCurrentTime(data: number) {
        for (const source of sources) {
            source.currentTime = data
        }
    }

    async function updateAudioEffect(effect: {
        clear?: boolean
        reverb?: string
        equalizer?: string
    }) {
        if (!audioManager || !equalizer || !reverb) return

        try {
            // Ensure audio chain is ready
            await audioManager.ensureAudioChainReady()

            // Disconnect everything first
            audioManager.disconnect()
            if (effect.clear) return

            // Apply effects if specified
            if (effect?.equalizer && effect.equalizer !== 'none') {
                equalizer.setEQEffect(effect.equalizer)
            }

            if (effect?.reverb && effect.reverb !== 'none') {
                await reverb.setReverbEffect(effect.reverb)
            }
        } catch (error) {
            console.error('Error updating audio effects:', error)
            // On error, ensure audio still works by connecting directly
            audioManager.disconnect()
        }
    }

    replaceSetter('playbackRate')
    replaceSetter('defaultPlaybackRate')
    replaceMethod()
    window.Audio = self.Audio = replaceConstructor(window.Audio)

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

            switch (type) {
                case 'FROM_PLAYBACK_LISTENER':
                    updatePlaybackSettings({
                        playback_rate: Number(data?.playback_rate) || 1,
                        preserves_pitch: Boolean(data?.preserves_pitch)
                    })
                    break

                case 'FROM_SEEK_LISTENER':
                    updateSeek({
                        type: String(data?.type) as 'skip_back' | 'skip_forward',
                        value: Number(data?.value) || 0
                    })
                    break

                case 'FROM_EFFECTS_LISTENER':
                    updateAudioEffect({
                        clear: Boolean(data?.clear),
                        reverb: data?.reverb ? String(data.reverb) : undefined,
                        equalizer: data?.equalizer ? String(data.equalizer) : undefined
                    })
                    break

                case 'FROM_VOLUME_LISTENER':
                    updateVolume({
                        value: Number(data?.value) || 0,
                        muted: Boolean(data?.muted),
                        type: String(data?.type) as 'linear' | 'logarithmic'
                    })
                    break

                case 'FROM_CURRENT_TIME_LISTENER':
                    updateCurrentTime(Number(data) || 0)
                    break
            }
        } catch (error) {
            console.warn('Error handling message:', error)
        }
    })
}

export default defineUnlistedScript(() => {
    mediaOverride()
})
