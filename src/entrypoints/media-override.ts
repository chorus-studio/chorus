import Reverb from '$lib/audio-effects/reverb'
import Equalizer from '$lib/audio-effects/equalizer'
import AudioManager from '$lib/audio-effects/audio-manager'

type Seek = {
    type: 'skip_back' | 'skip_forward'
    value: number
}

type Playback = {
    playbackRate: number
    preservesPitch: boolean
}

type PlaybackSettings = {
    default: Playback
    track: Playback
    is_default: boolean
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
        source.volume = 1
        sources.push(source)

        if (source instanceof HTMLMediaElement) {
            // Clean up previous audio effects if they exist
            if (audioManager) audioManager.dispose()

            audioManager = new AudioManager(source)
            equalizer = new Equalizer(audioManager)
            reverb = new Reverb(audioManager)

            // Ensure direct connection to destination when no effects are active
            audioManager.disconnect()
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

    function updatePlaybackSettings(value: PlaybackSettings) {
        speed = value.is_default ? value.default.playbackRate : value.track.playbackRate
        for (const source of sources) {
            source.defaultPlaybackRate = 1
            source.playbackRate = value.is_default
                ? value.default.playbackRate
                : value.track.playbackRate
            source.preservesPitch = value.is_default
                ? value.default.preservesPitch
                : value.track.preservesPitch
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

    async function updateAudioEffect(effect: {
        clear?: boolean
        reverb?: string
        equalizer?: string
    }) {
        if (!audioManager || !equalizer || !reverb) return

        try {
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

    document.addEventListener('FROM_PLAYBACK_LISTENER', (event: CustomEvent) => {
        updatePlaybackSettings(event.detail)
    })

    document.addEventListener('FROM_SEEK_LISTENER', (event: CustomEvent) => {
        updateSeek(event.detail)
    })

    document.addEventListener('FROM_EFFECTS_LISTENER', (event: CustomEvent) => {
        updateAudioEffect(event.detail)
    })
}

export default defineContentScript({
    matches: ['*://open.spotify.com/*', '*://soundcloud.com/*'],
    main() {
        mediaOverride()
        return true
    }
})
