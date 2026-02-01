import MediaElement from '../lib/media/media-element'

// Global crossfade state - accessible from mediaOverride function
const crossfadeState = {
    isFading: false,
    pendingSeekPosition: null as number | null,
    originalVolume: 1,
    mutedSource: null as HTMLMediaElement | null
}

// Crossfade handler - decodes next track audio and plays with overlap
function setupCrossfadeHandler() {
    let audioContext: AudioContext | null = null
    let currentTrackId: string | null = null
    let crossfadeStarted = false

    // Cache for next track's audio data (used to detect track change)
    let nextTrackData: {
        initSegment: ArrayBuffer
        mediaSegment: ArrayBuffer
        trackId: string
        settings: { duration: number; type: string }
    } | null = null

    // Secondary audio element for crossfade (plays recorded audio)
    let crossfadeAudio: HTMLAudioElement | null = null

    function getAudioContext(): AudioContext {
        if (!audioContext || audioContext.state === 'closed') {
            audioContext = new AudioContext()
        }
        return audioContext
    }

    function base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binaryString = atob(base64)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
        }
        return bytes.buffer
    }

    // Try to decode fMP4 buffer using AudioContext.decodeAudioData
    async function decodeAudioBuffer(
        initSegment: ArrayBuffer,
        mediaSegment: ArrayBuffer
    ): Promise<AudioBuffer | null> {
        const ctx = getAudioContext()

        // Combine init + media into a single buffer
        const combined = new Uint8Array(initSegment.byteLength + mediaSegment.byteLength)
        combined.set(new Uint8Array(initSegment), 0)
        combined.set(new Uint8Array(mediaSegment), initSegment.byteLength)

        try {
            const audioBuffer = await ctx.decodeAudioData(combined.buffer)
            return audioBuffer
        } catch (error) {
            // Try just the media segment (sometimes init isn't needed for decode)
            try {
                const mediaBuffer = await ctx.decodeAudioData(mediaSegment.slice(0))
                return mediaBuffer
            } catch (e2) {
                console.warn('[Crossfade] decodeAudioData failed')
            }
        }

        return null
    }

    // Calculate fade values based on crossfade type
    function calculateFade(progress: number, type: string): { fadeOut: number; fadeIn: number } {
        switch (type) {
            case 'linear':
                return { fadeOut: 1 - progress, fadeIn: progress }
            case 'exponential':
                return { fadeOut: Math.pow(1 - progress, 2), fadeIn: Math.pow(progress, 2) }
            case 'equal-power':
            default:
                return {
                    fadeOut: Math.cos(progress * 0.5 * Math.PI),
                    fadeIn: Math.sin(progress * 0.5 * Math.PI)
                }
        }
    }

    function cleanupCrossfadeAudio() {
        if (crossfadeAudio) {
            crossfadeAudio.pause()
            crossfadeAudio.src = ''
            // Remove from DOM
            if (crossfadeAudio.parentNode) {
                crossfadeAudio.parentNode.removeChild(crossfadeAudio)
            }
            crossfadeAudio = null
        }
    }

    async function startCrossfade() {
        if (!nextTrackData || crossfadeState.isFading) return

        const mainAudio = (window as any).mediaSource as HTMLMediaElement
        if (!mainAudio) return

        crossfadeState.isFading = true
        crossfadeStarted = true
        crossfadeState.pendingSeekPosition = null // Reset for new crossfade

        const duration = nextTrackData.settings?.duration || 6
        const fadeType = nextTrackData.settings?.type || 'equal-power'
        const originalVolume = mainAudio.volume

        // Store these before async operations (nextTrackData may be cleared)
        const nextTrackId = nextTrackData.trackId
        const initSegment = nextTrackData.initSegment
        const mediaSegment = nextTrackData.mediaSegment

        // Clean up any previous crossfade audio
        cleanupCrossfadeAudio()

        // Try to decode the next track's audio buffer
        const audioBuffer = await decodeAudioBuffer(initSegment, mediaSegment)

        if (audioBuffer) {
            // Decode successful - do true crossfade with audio overlap
            const bufferDuration = audioBuffer.duration

            const ctx = getAudioContext()
            const bufferSource = ctx.createBufferSource()
            bufferSource.buffer = audioBuffer

            const gainNode = ctx.createGain()
            gainNode.gain.value = 0 // Start silent

            bufferSource.connect(gainNode)
            gainNode.connect(ctx.destination)

            // Start playing the next track audio (silent initially)
            bufferSource.start(0)

            const crossfadeStartTime = Date.now()
            let trackHasChanged = false
            let bufferPlaybackTime = 0 // Track how much of buffer we've played

            const fadeInterval = setInterval(() => {
                const elapsed = (Date.now() - crossfadeStartTime) / 1000
                bufferPlaybackTime = elapsed // Update how much we've played
                const progress = Math.min(elapsed / duration, 1)

                const { fadeOut, fadeIn } = calculateFade(progress, fadeType)

                // Fade out current track
                mainAudio.volume = originalVolume * fadeOut
                // Fade in next track
                gainNode.gain.value = fadeIn

                // Continuously update pending seek position during crossfade
                // This ensures we have the correct position when the track actually changes
                // Cap at buffer duration in case buffer is shorter than crossfade
                crossfadeState.pendingSeekPosition = Math.min(bufferPlaybackTime, bufferDuration)

                // Check if Spotify has changed to the next track
                if (!trackHasChanged && currentTrackId === nextTrackId) {
                    trackHasChanged = true
                }

                if (progress >= 1) {
                    clearInterval(fadeInterval)
                    mainAudio.volume = originalVolume

                    bufferSource.stop()
                    bufferSource.disconnect()
                    gainNode.disconnect()
                    crossfadeState.isFading = false
                    crossfadeStarted = false

                    // Update currentTrackId to the new track
                    currentTrackId = nextTrackId
                    nextTrackData = null

                    // Send seek - keep source muted until after seek to prevent hearing position 0
                    if (
                        crossfadeState.pendingSeekPosition !== null &&
                        crossfadeState.pendingSeekPosition > 0
                    ) {
                        const seekPos = crossfadeState.pendingSeekPosition
                        const seekMs = Math.round(seekPos * 1000)
                        crossfadeState.pendingSeekPosition = null

                        // Small delay to let Spotify's new source initialize
                        setTimeout(() => {
                            // Direct currentTime seek
                            window.postMessage({ type: 'FROM_CROSSFADE_SEEK', data: seekPos }, '*')
                            // API seek as backup
                            window.postMessage(
                                { type: 'CHORUS_SEEK_REQUEST', positionMs: seekMs },
                                '*'
                            )

                            // Unmute after seek is applied
                            setTimeout(() => {
                                if (crossfadeState.mutedSource) {
                                    crossfadeState.mutedSource.volume =
                                        crossfadeState.originalVolume
                                    crossfadeState.mutedSource = null
                                }
                            }, 100)
                        }, 200)
                    } else {
                        // No seek needed - unmute immediately
                        if (crossfadeState.mutedSource) {
                            crossfadeState.mutedSource.volume = crossfadeState.originalVolume
                            crossfadeState.mutedSource = null
                        }
                    }
                }
            }, 50)
        } else {
            // decodeAudioData failed - fall back to fade-out/fade-in
            const startTime = Date.now()
            const fadeStartTrackId = currentTrackId
            let trackChanged = false
            let trackChangeTime = 0

            const fadeInterval = setInterval(() => {
                const elapsed = (Date.now() - startTime) / 1000

                // Check if track changed
                if (currentTrackId !== fadeStartTrackId && !trackChanged) {
                    trackChanged = true
                    trackChangeTime = Date.now()
                    mainAudio.volume = 0
                }

                if (trackChanged) {
                    const fadeElapsed = (Date.now() - trackChangeTime) / 1000
                    const fadeDuration = Math.min(duration, 3)
                    const fadeProgress = Math.min(fadeElapsed / fadeDuration, 1)
                    const { fadeIn } = calculateFade(fadeProgress, fadeType)

                    mainAudio.volume = originalVolume * fadeIn

                    if (fadeProgress >= 1) {
                        clearInterval(fadeInterval)
                        mainAudio.volume = originalVolume
                        crossfadeState.isFading = false
                        crossfadeStarted = false
                        nextTrackData = null
                        if (crossfadeState.mutedSource) {
                            crossfadeState.mutedSource.volume = crossfadeState.originalVolume
                            crossfadeState.mutedSource = null
                        }
                    }
                } else {
                    // Fade out while waiting for track change
                    const progress = Math.min(elapsed / duration, 1)
                    const { fadeOut } = calculateFade(progress, fadeType)
                    mainAudio.volume = originalVolume * fadeOut

                    if (elapsed > duration + 5) {
                        clearInterval(fadeInterval)
                        mainAudio.volume = originalVolume
                        crossfadeState.isFading = false
                        crossfadeStarted = false
                        nextTrackData = null
                        if (crossfadeState.mutedSource) {
                            crossfadeState.mutedSource.volume = crossfadeState.originalVolume
                            crossfadeState.mutedSource = null
                        }
                    }
                }
            }, 50)
        }
    }

    // Handle incoming crossfade buffer data - cache it for later use
    // NOTE: Buffer is always for the NEXT track (prefetch), not the current one
    function handleCrossfadeBuffer(data: {
        initSegment: string
        mediaSegment: string
        trackId: string
        settings: { duration: number; type: string }
    }) {
        // Ignore duplicate or invalid buffers
        if (nextTrackData && nextTrackData.trackId === data.trackId) return
        if (currentTrackId === data.trackId) return
        if (crossfadeState.isFading) return

        // Cache this as the next track
        nextTrackData = {
            initSegment: base64ToArrayBuffer(data.initSegment),
            mediaSegment: base64ToArrayBuffer(data.mediaSegment),
            trackId: data.trackId,
            settings: data.settings
        }

        // Check if we should start crossfade immediately (buffer arrived late)
        const mainAudio = (window as any).mediaSource as HTMLMediaElement

        if (mainAudio && mainAudio.duration && !mainAudio.paused) {
            const timeRemaining = mainAudio.duration - mainAudio.currentTime
            const crossfadeDuration = data.settings?.duration || 6

            if (
                timeRemaining <= crossfadeDuration &&
                timeRemaining > 0 &&
                !crossfadeStarted &&
                !crossfadeState.isFading
            ) {
                startCrossfade()
            }
        }
    }

    // Check if we should start crossfade based on time remaining
    function checkCrossfadeTime() {
        if (!nextTrackData || crossfadeStarted || crossfadeState.isFading) return

        const mainAudio = (window as any).mediaSource as HTMLMediaElement
        if (!mainAudio || !mainAudio.duration || mainAudio.paused) return

        const timeRemaining = mainAudio.duration - mainAudio.currentTime
        const crossfadeDuration = nextTrackData.settings?.duration || 6

        // Start crossfade when time remaining equals crossfade duration
        if (timeRemaining <= crossfadeDuration && timeRemaining > 0) {
            startCrossfade()
        }
    }

    // Listen for crossfade buffer events from background
    document.addEventListener('FROM_CROSSFADE_BUFFER', ((event: CustomEvent) => {
        handleCrossfadeBuffer(event.detail)
    }) as EventListener)

    // Listen for timeupdate to check if we should start crossfade
    document.addEventListener('FROM_MEDIA_TIMEUPDATE', ((event: CustomEvent) => {
        checkCrossfadeTime()
    }) as EventListener)

    // Also poll for time updates in case events are missed
    setInterval(checkCrossfadeTime, 500)
}

function mediaOverride() {
    // Initialize crossfade handler
    setupCrossfadeHandler()

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

        // If crossfade is in progress, mute the new source to prevent double audio
        // The crossfade buffer is playing through AudioContext
        if (crossfadeState.isFading) {
            crossfadeState.originalVolume = source.volume || 1
            source.volume = 0
            crossfadeState.mutedSource = source
        }

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
