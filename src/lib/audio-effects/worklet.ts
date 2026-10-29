/**
 * Let go of an AudioWorkletNode so it actually stops.
 *
 * A processor whose process() returns true is an "active source": the node
 * keeps rendering every quantum after it is disconnected and its last
 * reference is dropped (measured: a dropped reverb kept running at the full
 * 375 calls a second, and thirty dropped ones all did). Every preset switch
 * was adding one, until the audio thread fell behind and crackled. Chorus's
 * processors (processor.js, fdn-processor.js, ms-processor.js) answer a
 * 'dispose' message by returning false from then on.
 */
export function disposeWorklet(node: AudioWorkletNode | undefined) {
    if (!node) return
    try {
        node.port.postMessage('dispose')
    } catch (e) {
        // A closed port; nothing left to stop.
    }
    try {
        node.disconnect()
    } catch (e) {
        // Already disconnected.
    }
}
