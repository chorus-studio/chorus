// Offscreen document for the real-time vocal remover (Milestone 2b).
//
// Pipeline (all audio stays in this offscreen context — only the node port carries
// raw audio, which supports transferable buffers, unlike chrome.runtime):
//   tabCapture stream → AudioContext(44100) → vocal-stream worklet → destination
//   worklet posts CHUNK blocks → here we run rt_core_v1 → post processed back
//
// Runs off the Spotify page thread, so inference never freezes the page.
import { warmup, runChunk, lastTimings, runtimeInfo } from '$lib/audio-effects/vocal-model/engine'
import { clampMix, DEFAULT_MIX, type StemMix } from '$lib/audio-effects/vocal-model/mix'

console.log('[chorus] offscreen script loaded')

let ctx: AudioContext | null = null
let stream: MediaStream | null = null
let node: AudioWorkletNode | null = null
let mix: StemMix = { ...DEFAULT_MIX } // how loud the vocals and the instruments play

// Bumped on every start/stop. Captured locally by async work so a stop→start
// race can't post a stale, cross-session block into the new stream.
let generation = 0

const pending: Array<{ left: ArrayBuffer; right: ArrayBuffer }> = []
let pumping = false
const MAX_PENDING = 12 // memory safety; the worklet caps played latency

// Live health stats, surfaced to the UI on demand.
let lastProcMs = 0
let lastQueue = 0
let lastUnderruns = 0
let blocksDone = 0
let lastStft = 0
let lastOrt = 0
let lastIstft = 0
let ep = '?'

chrome.runtime.onMessage.addListener((msg: any, _sender, sendResponse) => {
    if (msg?.target !== 'offscreen') return
    if (msg.cmd !== 'getStats') console.log('[chorus] offscreen received cmd:', msg.cmd)

    if (msg.cmd === 'getStats') {
        sendResponse({
            proc: lastProcMs,
            stft: lastStft,
            ort: lastOrt,
            istft: lastIstft,
            queue: lastQueue,
            underruns: lastUnderruns,
            blocks: blocksDone,
            ep
        })
        return false
    }

    if (msg.cmd === 'getState') {
        // Source of truth for the popup, which otherwise can't know a prior capture
        // is still running after it was closed and reopened.
        sendResponse({ capturing: stream != null, mix })
        return false
    }

    if (msg.cmd === 'start') {
        // The mix rides along with start so it can't be lost when the offscreen doc
        // didn't exist yet for an earlier setMix relay.
        if (msg.mix) mix = clampMix(msg.mix)
        startCapture(msg.streamId)
            .then(() => sendResponse({ ok: true }))
            .catch((e) => {
                stopCapture()
                sendResponse({ error: String(e?.message ?? e) })
            })
        return true
    }
    if (msg.cmd === 'stop') {
        stopCapture()
        sendResponse({ ok: true })
        return false
    }
    if (msg.cmd === 'setMix') {
        mix = clampMix(msg.mix)
        sendResponse({ ok: true })
        return false
    }
    return false
})

async function startCapture(streamId: string) {
    stopCapture()
    const gen = ++generation
    console.log('[chorus] startCapture: loading model…')

    // Load the model first (tab still audible — getUserMedia not called yet).
    await warmup()
    console.log('[chorus] startCapture: model warm, getting tab stream…')
    if (gen !== generation) return

    stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId }
        } as unknown as MediaTrackConstraints,
        video: false
    })
    if (gen !== generation) {
        stream.getTracks().forEach((t) => t.stop())
        stream = null
        return
    }

    // Self-heal: if the captured tab is closed or navigates away, the capture track
    // ends — tear down so getState stops reporting a dead capturing=true.
    stream.getTracks().forEach((t) =>
        t.addEventListener('ended', () => {
            if (gen === generation) stopCapture()
        })
    )

    // Force 44.1kHz — rt_core_v1's framing assumes it. Web Audio resamples the
    // captured stream (often 48kHz) into this context for us.
    ctx = new AudioContext({ sampleRate: 44100 })
    if (ctx.sampleRate !== 44100) {
        throw new Error(
            `AudioContext is ${ctx.sampleRate}Hz, need 44100 — model framing would be wrong`
        )
    }
    if (ctx.state === 'suspended') await ctx.resume()
    console.log('[chorus] startCapture: ctx', ctx.sampleRate, 'Hz, loading worklet…')
    await ctx.audioWorklet.addModule(chrome.runtime.getURL('vocal-stream-worklet.js'))
    if (gen !== generation) return

    const src = ctx.createMediaStreamSource(stream)
    const theNode = new AudioWorkletNode(ctx, 'vocal-stream', {
        channelCount: 2,
        channelCountMode: 'explicit',
        outputChannelCount: [2]
    })
    node = theNode

    theNode.port.onmessage = (e: MessageEvent) => {
        if (gen !== generation) return
        const d = e.data
        if (d?.type === 'block') {
            pending.push(d)
            pump(gen, theNode)
        } else if (d?.type === 'stats') {
            lastQueue = d.queue
            lastUnderruns = d.underruns
        }
    }

    src.connect(theNode)
    theNode.connect(ctx.destination)
    console.log('[chorus] vocal-stream pipeline running')
}

const _recent: number[] = [] // rolling window so WebGPU's slow first (shader-compile) block doesn't skew it
let _procCount = 0

async function pump(gen: number, theNode: AudioWorkletNode) {
    if (pumping) return
    pumping = true
    try {
        while (pending.length && gen === generation) {
            // Memory safety only — drop oldest if a huge backlog forms.
            while (pending.length > MAX_PENDING) pending.shift()
            const blk = pending.shift()!
            const left = new Float32Array(blk.left)
            const right = new Float32Array(blk.right)
            try {
                const t0 = performance.now()
                const r = await runChunk(left, right, mix)
                _recent.push(performance.now() - t0)
                if (_recent.length > 8) _recent.shift()
                blocksDone = ++_procCount
                lastProcMs = _recent.reduce((a, b) => a + b, 0) / _recent.length
                lastStft = lastTimings.stft
                lastOrt = lastTimings.ort
                lastIstft = lastTimings.istft
                ep = runtimeInfo.ep
                if (gen !== generation) break // session changed during inference
                theNode.port.postMessage(
                    { type: 'processed', left: r.left.buffer, right: r.right.buffer },
                    [r.left.buffer, r.right.buffer]
                )
            } catch (err) {
                console.error('[chorus] block inference failed:', err)
            }
        }
    } finally {
        pumping = false
    }
}

function stopCapture() {
    generation++ // invalidate any in-flight pump / late port messages
    pending.length = 0
    pumping = false
    if (node) {
        try {
            node.disconnect()
        } catch {
            // ignore
        }
        node = null
    }
    if (stream) {
        stream.getTracks().forEach((t) => t.stop())
        stream = null
    }
    if (ctx) {
        ctx.close().catch(() => {})
        ctx = null
    }
    console.log('[chorus] vocal-stream pipeline stopped')
}
