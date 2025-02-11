function mediaOverride() {
    const sources: any[] = []
    const defaultSpeed = 1.75
    let speed = defaultSpeed

    function addSource(source: any) {
        if (source.isPlaybackRateChanged) return
        source.isPlaybackRateChanged = true
        source.defaultPlaybackRate = 1
        source.playbackRate = 1
        source.volume = 1
        sources.push(source)
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

    function updatePlaybackSettings(value) {
        speed = value.playbackRate
        for (const source of sources) {
            source.defaultPlaybackRate = 1
            source.playbackRate = value.playbackRate
            source.preservesPitch = value.preservesPitch
            source.volume = value.volume
            source.muted = value.muted || value.volume === 0
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

    document.addEventListener('FROM_SPEED_LISTENER', (event: CustomEvent) => {
        updatePlaybackSettings(event.detail)
    })
}

export default defineContentScript({
    matches: ['*://open.spotify.com/*'],
    main() {
        mediaOverride()
        return true
    }
})
