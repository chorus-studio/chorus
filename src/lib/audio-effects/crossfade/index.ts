import type AudioManager from '../audio-manager'
import type { AudioBufferChunk, CrossfadeSettings } from './types'
import { crossfadeStore } from '$lib/stores/crossfade'
import { get } from 'svelte/store'

/**
 * Crossfade - Manages overlapping audio transitions between tracks
 *
 * Implements Spotify Desktop-style crossfading using Web Audio API:
 * - Intercepts audio chunks from background script
 * - Decodes audio data near track end
 * - Uses dual GainNodes for smooth overlapping transitions
 * - Supports multiple fade curves (equal-power, exponential, linear)
 */
export default class Crossfade {
    private _audioManager: AudioManager
    private _audioContext?: AudioContext
    private _settings: CrossfadeSettings

    // Gain node for next track (current track uses AudioManager's gain)
    private _nextGain?: GainNode
    private _nextSource?: AudioBufferSourceNode

    // State management
    private _isFading = false
    private _fadeTimeout?: number
    private _currentTrackId: string | null = null
    private _lastChunkBuffer: AudioBuffer | null = null

    constructor(audioManager: AudioManager) {
        this._audioManager = audioManager
        this._settings = get(crossfadeStore)

        // Subscribe to settings changes
        crossfadeStore.subscribe((settings) => {
            this._settings = settings
        })
    }

    /**
     * Initialize AudioContext and gain node for next track
     * (Current track uses AudioManager's existing gain node)
     */
    private setupAudioNodes(): void {
        this._audioContext = this._audioManager.audioContext
        if (!this._audioContext) {
            console.warn('[Crossfade] AudioContext not available')
            return
        }

        // Create gain node for next track if it doesn't exist
        if (!this._nextGain) {
            this._nextGain = this._audioContext.createGain()
            this._nextGain.connect(this._audioContext.destination)
            this._nextGain.gain.setValueAtTime(0, this._audioContext.currentTime)
        }
    }

    /**
     * Equal-power crossfade curve calculation
     * Maintains constant perceived loudness
     */
    private calculateEqualPowerGain(progress: number): number {
        return Math.cos(progress * 0.5 * Math.PI)
    }

    /**
     * Apply crossfade curves to both gain nodes
     * @param startTime - When to start the fade
     * @param duration - How long the fade should last
     * @param fadeOutGain - Gain node to fade OUT (current track's main audio)
     * @param fadeInGain - Gain node to fade IN (next track's buffer)
     */
    private applyCrossfadeCurves(
        startTime: number,
        duration: number,
        fadeOutGain: GainNode,
        fadeInGain: GainNode
    ): void {
        if (!this._audioContext) return

        const endTime = startTime + duration

        switch (this._settings.type) {
            case 'equal-power': {
                // Sample at 60fps for smooth curves
                const steps = Math.floor(duration * 60)
                for (let i = 0; i <= steps; i++) {
                    const progress = i / steps
                    const time = startTime + duration * progress

                    // Equal-power: current track fades out, next track fades in
                    const fadeOut = this.calculateEqualPowerGain(progress)
                    const fadeIn = this.calculateEqualPowerGain(1 - progress)

                    fadeOutGain.gain.linearRampToValueAtTime(fadeOut, time)
                    fadeInGain.gain.linearRampToValueAtTime(fadeIn, time)
                }
                break
            }

            case 'exponential':
                fadeOutGain.gain.exponentialRampToValueAtTime(0.01, endTime)
                fadeInGain.gain.exponentialRampToValueAtTime(1, endTime)
                break

            case 'linear':
            default:
                fadeOutGain.gain.linearRampToValueAtTime(0, endTime)
                fadeInGain.gain.linearRampToValueAtTime(1, endTime)
                break
        }
    }

    /**
     * Start crossfade with decoded audio buffer (next track's first chunk)
     *
     * Strategy:
     * 1. Fade OUT the main Spotify audio (current track) using AudioManager's gain
     * 2. Fade IN the new track chunk (from buffer) using next gain node
     * 3. Play them simultaneously for smooth transition
     */
    private async startCrossfade(nextTrackBuffer: AudioBuffer): Promise<void> {
        if (!nextTrackBuffer || this._isFading) return

        this.setupAudioNodes()

        if (!this._audioContext || !this._nextGain) {
            console.error('[Crossfade] Audio nodes not initialized')
            return
        }

        const mainGain = this._audioManager.gainNode
        if (!mainGain) {
            console.error('[Crossfade] AudioManager gain node not available')
            return
        }

        this._isFading = true

        const currentTime = this._audioContext.currentTime
        const fadeDuration = this._settings.duration

        // Get current main gain value to fade from
        const currentMainGain = mainGain.gain.value

        console.log('[Crossfade] Starting crossfade:', {
            currentTime,
            fadeDuration,
            currentMainGain,
            nextTrackDuration: nextTrackBuffer.duration,
            type: this._settings.type
        })

        // Create and connect buffer source for next track
        this._nextSource = this._audioContext.createBufferSource()
        this._nextSource.buffer = nextTrackBuffer
        this._nextSource.connect(this._nextGain)

        // Set initial gains
        mainGain.gain.cancelScheduledValues(currentTime)
        mainGain.gain.setValueAtTime(currentMainGain, currentTime)

        this._nextGain.gain.cancelScheduledValues(currentTime)
        this._nextGain.gain.setValueAtTime(0, currentTime)

        // Apply crossfade curves
        this.applyCrossfadeCurves(currentTime, fadeDuration, mainGain, this._nextGain)

        // Start playing next track buffer
        this._nextSource.start(currentTime, 0, fadeDuration + 1)

        // Schedule cleanup and gain restoration
        this._fadeTimeout = window.setTimeout(() => {
            this.completeCrossfade(mainGain, currentMainGain)
        }, fadeDuration * 1000 + 100)
    }

    /**
     * Complete crossfade and reset state
     * @param mainGain - AudioManager's main gain node to restore
     * @param originalGainValue - Original gain value to restore
     */
    private completeCrossfade(mainGain: GainNode, originalGainValue: number): void {
        if (!this._audioContext) return

        console.log('[Crossfade] Completing crossfade, restoring main gain to', originalGainValue)

        // Restore main audio gain to original value
        if (mainGain) {
            mainGain.gain.cancelScheduledValues(this._audioContext.currentTime)
            mainGain.gain.setValueAtTime(originalGainValue, this._audioContext.currentTime)
        }

        // Reset next track gain to 0 (silent)
        if (this._nextGain) {
            this._nextGain.gain.cancelScheduledValues(this._audioContext.currentTime)
            this._nextGain.gain.setValueAtTime(0, this._audioContext.currentTime)
        }

        // Clean up source
        if (this._nextSource) {
            try {
                this._nextSource.stop()
                this._nextSource.disconnect()
            } catch (e) {
                // Already stopped
            }
            this._nextSource = undefined
        }

        this._isFading = false

        if (this._fadeTimeout) {
            clearTimeout(this._fadeTimeout)
            this._fadeTimeout = undefined
        }
    }

    /**
     * Convert base64 to ArrayBuffer
     */
    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binaryString = atob(base64)
        const bytes = new Uint8Array(binaryString.length)

        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
        }

        return bytes.buffer
    }

    /**
     * Handle incoming audio buffer chunk from background script
     * This is the main entry point for crossfade triggering
     *
     * Key insight: Spotify sends ~10s chunks. When track changes, we detect
     * the new track ID and have both the last chunk of previous track and
     * first chunk of new track - perfect for crossfading!
     */
    async updateBuffer(chunk: AudioBufferChunk): Promise<void> {
        if (!this._settings.enabled) return

        try {
            const arrayBuffer = this.base64ToArrayBuffer(chunk.data)

            console.log('[Crossfade] Received chunk:', {
                trackId: chunk.trackId,
                range: chunk.range,
                size: arrayBuffer.byteLength,
                currentTrackId: this._currentTrackId
            })

            this.setupAudioNodes()

            if (!this._audioContext) {
                console.warn('[Crossfade] AudioContext not available')
                return
            }

            // Decode audio data
            const audioBuffer = await this._audioContext.decodeAudioData(arrayBuffer.slice(0))

            console.log('[Crossfade] Decoded:', {
                duration: audioBuffer.duration,
                channels: audioBuffer.numberOfChannels,
                sampleRate: audioBuffer.sampleRate
            })

            // Detect track change
            const isNewTrack = this._currentTrackId && this._currentTrackId !== chunk.trackId

            if (isNewTrack && this._lastChunkBuffer) {
                // Track changed! We have last chunk of old track and first chunk of new track
                console.log('[Crossfade] Track change detected!', {
                    oldTrack: this._currentTrackId,
                    newTrack: chunk.trackId
                })

                // Start crossfade with new track's first chunk
                await this.startCrossfade(audioBuffer)
            }

            // Always buffer the last chunk for potential crossfade
            this._lastChunkBuffer = audioBuffer
            this._currentTrackId = chunk.trackId

        } catch (error) {
            console.error('[Crossfade] Error processing buffer:', error)
        }
    }

    /**
     * Cancel ongoing crossfade (e.g., user skips track)
     */
    cancelCrossfade(): void {
        if (!this._isFading || !this._audioContext) return

        console.log('[Crossfade] Cancelled')

        // Restore main audio gain (if we have access to it)
        const mainGain = this._audioManager.gainNode
        if (mainGain) {
            mainGain.gain.cancelScheduledValues(this._audioContext.currentTime)
            // Restore to full volume
            mainGain.gain.setValueAtTime(1, this._audioContext.currentTime)
        }

        if (this._nextGain) {
            this._nextGain.gain.cancelScheduledValues(this._audioContext.currentTime)
            this._nextGain.gain.setValueAtTime(0, this._audioContext.currentTime)
        }

        if (this._nextSource) {
            try {
                this._nextSource.stop()
                this._nextSource.disconnect()
            } catch (e) {
                // Already stopped
            }
            this._nextSource = undefined
        }

        this._isFading = false

        if (this._fadeTimeout) {
            clearTimeout(this._fadeTimeout)
            this._fadeTimeout = undefined
        }
    }

    /**
     * Cleanup resources
     */
    cleanup(): void {
        this.cancelCrossfade()

        if (this._nextGain) {
            try {
                this._nextGain.disconnect()
            } catch (e) {
                // Ignore
            }
            this._nextGain = undefined
        }

        this._audioContext = undefined
    }
}
