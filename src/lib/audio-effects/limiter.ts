// The output limiter: a DynamicsCompressorNode set up as a limiter at full
// scale (ratio 20, hard knee, instant attack, 100 ms release), last in the
// chain before the destination. Effects add level — dry at unity plus a
// reverb tail, EQ boosts, the lofi rack — and the destination hard-clips
// anything past full scale into crackle; this trims those peaks instead.
//
// The ceiling sits at 0 dBFS, not below it, and the release is short: a
// ceiling at −1 dBFS with a 250 ms release ducked the whole mix on every peak
// in the band that never clipped, and a listening test called that "less
// powerful". At 0 dBFS the node acts on true overs only and lets go between
// beats; the most extreme peaks still land a hair over (1.05× measured on a
// cathedral that reached 1.67× raw), which is inaudible next to the 578
// clipped samples a second it replaces. Measured in headless Chrome with an
// OfflineAudioContext on a chord-and-kicks signal at full volume: the plate
// rooms and the FDN hall lose nothing, the FDN cathedral loses 0.5 dB.
export const LIMITER = { threshold: 0, knee: 0, ratio: 20, attack: 0, release: 0.1 }

// Blink's compressor (DynamicsCompressorKernel::SetParams, which Firefox and
// WebKit share) applies an automatic makeup gain to everything, quiet signals
// included: (1 / static gain at 0 dBFS)^0.6. The trim gain after the node
// cancels it, so material under the threshold passes bit-exact (measured
// at a −1 dBFS ceiling, where it is +0.57 dB: max error 0). With the ceiling
// at 0 dBFS the makeup is unity and the trim is inert; it stays so the
// ceiling can move without the level moving with it.
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
