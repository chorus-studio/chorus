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

    // Gain nodes for crossfading
    private _currentGain?: GainNode
    private _nextGain?: GainNode
    private _nextSource?: AudioBufferSourceNode

    // State management
    private _isFading = false
    private _fadeTimeout?: number
    private _currentTrackId: string | null = null

    constructor(audioManager: AudioManager) {
        this._audioManager = audioManager
        this._settings = get(crossfadeStore)

        // Subscribe to settings changes
        crossfadeStore.subscribe((settings) => {
            this._settings = settings
        })
    }

    /**
     * Initialize AudioContext and gain nodes
     */
    private setupAudioNodes(): void {
        this._audioContext = this._audioManager.audioContext
        if (!this._audioContext) {
            console.warn('[Crossfade] AudioContext not available')
            return
        }

        if (!this._currentGain) {
            this._currentGain = this._audioContext.createGain()
            this._currentGain.connect(this._audioContext.destination)
            this._currentGain.gain.setValueAtTime(1, this._audioContext.currentTime)
        }

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
     * Apply crossfade with configured curve type
     */
    private applyFadeCurve(startTime: number): void {
        if (!this._audioContext || !this._currentGain || !this._nextGain) return

        const endTime = startTime + this._settings.duration

        switch (this._settings.type) {
            case 'equal-power': {
                // Sample at 60fps for smooth curves
                const steps = Math.floor(this._settings.duration * 60)
                for (let i = 0; i <= steps; i++) {
                    const progress = i / steps
                    const time = startTime + this._settings.duration * progress

                    const fadeOut = this.calculateEqualPowerGain(progress)
                    const fadeIn = this.calculateEqualPowerGain(1 - progress)

                    this._currentGain.gain.linearRampToValueAtTime(fadeOut, time)
                    this._nextGain.gain.linearRampToValueAtTime(fadeIn, time)
                }
                break
            }

            case 'exponential':
                this._currentGain.gain.exponentialRampToValueAtTime(0.01, endTime)
                this._nextGain.gain.exponentialRampToValueAtTime(1, endTime)
                break

            case 'linear':
            default:
                this._currentGain.gain.linearRampToValueAtTime(0, endTime)
                this._nextGain.gain.linearRampToValueAtTime(1, endTime)
                break
        }
    }

    /**
     * Start crossfade with decoded audio buffer
     */
    private async startCrossfade(audioBuffer: AudioBuffer): Promise<void> {
        if (!audioBuffer || this._isFading) return

        this.setupAudioNodes()

        if (!this._audioContext || !this._nextGain) {
            console.error('[Crossfade] Audio nodes not initialized')
            return
        }

        this._isFading = true

        const currentTime = this._audioContext.currentTime

        // Create and connect buffer source
        this._nextSource = this._audioContext.createBufferSource()
        this._nextSource.buffer = audioBuffer
        this._nextSource.connect(this._nextGain)

        // Apply fade curves
        this.applyFadeCurve(currentTime)

        // Start playback
        this._nextSource.start(0, 0, this._settings.duration + 2)

        console.log('[Crossfade] Started:', {
            duration: this._settings.duration,
            type: this._settings.type,
            bufferDuration: audioBuffer.duration
        })

        // Schedule cleanup
        this._fadeTimeout = window.setTimeout(
            () => this.completeCrossfade(),
            this._settings.duration * 1000 + 100
        )
    }

    /**
     * Complete crossfade and reset state
     */
    private completeCrossfade(): void {
        if (!this._audioContext) return

        console.log('[Crossfade] Completing crossfade')

        // Reset gain nodes
        if (this._currentGain) {
            this._currentGain.gain.cancelScheduledValues(this._audioContext.currentTime)
            this._currentGain.gain.setValueAtTime(1, this._audioContext.currentTime)
        }

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
     */
    async updateBuffer(chunk: AudioBufferChunk): Promise<void> {
        if (!this._settings.enabled) return

        try {
            const arrayBuffer = this.base64ToArrayBuffer(chunk.data)

            console.log('[Crossfade] Received chunk:', {
                trackId: chunk.trackId,
                range: chunk.range,
                size: arrayBuffer.byteLength
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

            // Start crossfade
            await this.startCrossfade(audioBuffer)

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

        if (this._currentGain) {
            this._currentGain.gain.cancelScheduledValues(this._audioContext.currentTime)
            this._currentGain.gain.setValueAtTime(1, this._audioContext.currentTime)
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

        if (this._currentGain) {
            try {
                this._currentGain.disconnect()
            } catch (e) {
                // Ignore
            }
            this._currentGain = undefined
        }

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
