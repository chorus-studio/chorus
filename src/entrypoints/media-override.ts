import MediaElement from '../lib/media/media-element'

function mediaOverride() {
    // Expose first media source directly
    ;(window as any).mediaSource = null
    let mediaElement: MediaElement | null = null

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
            console.error('Error checking source origin:', error)
            // If we can't determine the origin, use direct playback to be safe
            return
        }

        mediaElement = new MediaElement(source)
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
}

export default defineUnlistedScript({
    main() {
        mediaOverride()
    }
})
