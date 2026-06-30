// Pre-flight capability check for the real-time vocal separator. The feature is
// only offered when the device can actually run it well:
//   - Chrome's offscreen + tabCapture APIs (the audio pipeline lives there),
//   - Web Audio (AudioContext + AudioWorklet),
//   - a working WebGPU adapter.
// WebGPU is treated as REQUIRED: the model runs ~6-8x real-time budget on the
// single-threaded WASM fallback, so without a GPU the feature can't keep up and
// we'd rather not surface it at all.
export type VocalSupport = { supported: boolean; reason: string }

let cached: Promise<VocalSupport> | null = null

/** Cached so repeated popup opens don't re-probe the GPU. */
export function checkVocalSupport(): Promise<VocalSupport> {
    if (!cached) cached = probe()
    return cached
}

async function probe(): Promise<VocalSupport> {
    if (typeof chrome === 'undefined' || !('offscreen' in chrome)) {
        return { supported: false, reason: 'offscreen API unavailable (Chrome only)' }
    }
    if (!chrome.tabCapture?.getMediaStreamId) {
        return { supported: false, reason: 'tab capture unavailable' }
    }
    if (typeof AudioContext === 'undefined' || typeof AudioWorkletNode === 'undefined') {
        return { supported: false, reason: 'Web Audio unavailable' }
    }

    const gpu = (navigator as unknown as { gpu?: { requestAdapter?: () => Promise<unknown> } }).gpu
    if (!gpu?.requestAdapter) {
        return { supported: false, reason: 'WebGPU unavailable — required for real-time separation' }
    }
    try {
        const adapter = await gpu.requestAdapter()
        if (!adapter) return { supported: false, reason: 'no compatible GPU adapter' }
    } catch {
        return { supported: false, reason: 'WebGPU init failed' }
    }

    return { supported: true, reason: '' }
}
