// The output limiter: a DynamicsCompressorNode set up as a limiter at −1 dBFS
// (ratio 20, hard knee, instant attack, 250 ms release), last in the chain
// before the destination. Effects add level — dry at unity plus a reverb
// tail, EQ boosts, the lofi rack — and the destination hard-clips anything
// past full scale into crackle; this trims those peaks instead. Normalised
// Spotify masters peak at or under −1 dBFS, so without effects it is inert.
// Measured (headless Chrome, OfflineAudioContext, 2026-10-28): a cathedral on
// a sustained chord peaked at 1.45× full scale and came out at 0.96× for
// 0.6 dB of level; the plate rooms never crossed the threshold.
export const LIMITER = { threshold: -1, knee: 0, ratio: 20, attack: 0, release: 0.25 }

// Blink's compressor (DynamicsCompressorKernel::SetParams, which Firefox and
// WebKit share) applies an automatic makeup gain to everything, quiet signals
// included: (1 / static gain at 0 dBFS)^0.6. With these settings that is
// +0.57 dB; the trim gain after the node cancels it exactly, so material
// under the threshold passes bit-exact (measured: max error 0).
export function limiterMakeupGain({
    threshold,
    ratio
}: { threshold: number; ratio: number } = LIMITER) {
    const atFullScaleDb = threshold + (0 - threshold) / ratio
    return Math.pow(1 / Math.pow(10, atFullScaleDb / 20), 0.6)
}
export const LIMITER_TRIM = 1 / limiterMakeupGain()

// The node's lookahead, in samples at any rate (Blink's pre-delay buffer):
// 6 ms at 44.1 kHz, which the whole chain now carries.
export const LIMITER_LATENCY_SAMPLES = 264

export function createLimiter(ctx: BaseAudioContext) {
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = LIMITER.threshold
    limiter.knee.value = LIMITER.knee
    limiter.ratio.value = LIMITER.ratio
    limiter.attack.value = LIMITER.attack
    limiter.release.value = LIMITER.release
    const trim = ctx.createGain()
    trim.gain.value = LIMITER_TRIM
    limiter.connect(trim)
    return { limiter, trim }
}
