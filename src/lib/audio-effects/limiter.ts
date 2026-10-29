// The output limiter (src/public/limiter-processor.js): a lookahead
// brick-wall limiter, last in the chain before the destination. Chorus's
// volume boosts to 300% (+20 dB on the logarithmic curve) and the effects
// add level on top; the destination hard-clips anything past full scale,
// and that clipping is the static heard at high volume. Measured on a
// chord-and-kicks signal through a room (headless Chrome, OfflineAudioContext,
// 2026-10-29): plain clipping is 11% distortion at 1.5× gain, 28% at 3×
// and 39% at 10×; a DynamicsCompressorNode still overshoots the ceiling
// and clips at 3× and above; this never crossed 0.963 at any gain with no
// measurable distortion, and costs 0.1 dB at normal volume.
export const LIMITER = {
    // −0.5 dBFS: the last half decibel is margin for the gain smoothing.
    ceiling: 10 ** (-0.5 / 20),
    lookaheadMs: 5,
    release: 0.08
}

// What the whole chain now carries: the lookahead.
export const limiterLatencySamples = (sampleRate: number) =>
    Math.round((LIMITER.lookaheadMs / 1000) * sampleRate)

export async function createLimiter(ctx: BaseAudioContext, modulePath: string) {
    await ctx.audioWorklet.addModule(modulePath)
    const node = new AudioWorkletNode(ctx, 'ChorusLimiter', {
        channelCountMode: 'explicit',
        channelCount: 2,
        outputChannelCount: [2]
    })
    const ceiling = node.parameters.get('ceiling')
    const release = node.parameters.get('release')
    if (ceiling) ceiling.value = LIMITER.ceiling
    if (release) release.value = LIMITER.release
    return node
}
