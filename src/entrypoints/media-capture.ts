import { MediaPlayer } from './media-player'

class MediaCapture {
    _mediaPlayer?: MediaPlayer

    constructor() {
        this.originalCreateElement = document.createElement
        this.captureMediaElement()
        this.captureExistingMediaElements()
    }

    _setMediaPlayer(element: HTMLMediaElement) {
        if (!this._mediaPlayer) {
            this._mediaPlayer = new MediaPlayer(element)
            window.mediaPlayer = this._mediaPlayer
        }
    }

    captureMediaElement() {
        const self = this

        document.createElement = function (tagName: string) {
            const element = self.originalCreateElement.apply(this, arguments)

            if (['video', 'audio'].includes(tagName.toLowerCase())) {
                self._mediaPlayer = new MediaPlayer(element)
                window.mediaPlayer = self._mediaPlayer
                document.createElement = self.originalCreateElement
            }

            return element
        }
    }

    captureExistingMediaElements() {
        const mediaElements = document.querySelectorAll('video, audio')
        if (mediaElements.length > 0) {
            const element = mediaElements[mediaElements.length - 1]
            this._setMediaPlayer(element as HTMLMediaElement)
        }
    }

    get mediaPlayer() {
        return this._mediaPlayer
    }
}

export const mediaCapture = new MediaCapture()

export default defineUnlistedScript({
    main() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeName && ['VIDEO', 'AUDIO'].includes(node.nodeName)) {
                            mediaCapture._setMediaPlayer(node as HTMLMediaElement)
                        }
                    })
                }
            }
        })

        // Start observing the document with the configured parameters
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        })
    }
})
