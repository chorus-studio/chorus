/**
 * Decides when playback has gone quiet for long enough to speed through, and
 * when sound is back. Fed one loudness reading at a time with its timestamp;
 * it answers only when the state flips.
 */
export type SilenceGateOptions = {
    /** RMS of the time-domain signal (0..1) below which a reading counts as silence. */
    threshold: number
    /** Silence must last this long (ms) before the gate opens; short gaps between words stay. */
    openAfterMs: number
    /** Sound must last this long (ms) before the gate closes again; 0 closes at once. */
    closeAfterMs: number
}

/** −40 dBFS, after 0.4 s of it; back to normal the moment sound returns. */
export const DEFAULT_SILENCE_GATE: SilenceGateOptions = {
    threshold: 0.01,
    openAfterMs: 400,
    closeAfterMs: 0
}

export class SilenceGate {
    private silentSince: number | null = null
    private loudSince: number | null = null
    private _open = false

    constructor(private readonly options: SilenceGateOptions = DEFAULT_SILENCE_GATE) {}

    /** True while the gate is open: playback is being sped through silence. */
    get open(): boolean {
        return this._open
    }

    feed(rms: number, now: number): 'open' | 'close' | null {
        if (rms < this.options.threshold) {
            this.loudSince = null
            if (this.silentSince === null) this.silentSince = now
            if (!this._open && now - this.silentSince >= this.options.openAfterMs) {
                this._open = true
                return 'open'
            }
            return null
        }
        this.silentSince = null
        if (!this._open) return null
        if (this.loudSince === null) this.loudSince = now
        if (now - this.loudSince >= this.options.closeAfterMs) {
            this._open = false
            this.loudSince = null
            return 'close'
        }
        return null
    }

    /** Forget everything; the next reading starts a fresh count. Does not report a close. */
    reset(): void {
        this.silentSince = null
        this.loudSince = null
        this._open = false
    }
}

/** Root mean square of a time-domain buffer (samples in −1..1). */
export function rmsOf(samples: Float32Array): number {
    if (samples.length === 0) return 0
    let sum = 0
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i]
    return Math.sqrt(sum / samples.length)
}

/** Seconds saved by playing `wallSeconds` at `fast` instead of `base`. */
export function secondsSaved(wallSeconds: number, base: number, fast: number): number {
    if (!(base > 0) || !(fast > base) || !(wallSeconds > 0)) return 0
    return wallSeconds * (fast / base - 1)
}
