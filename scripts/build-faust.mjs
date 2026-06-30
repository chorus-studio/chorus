// Ahead-of-time (AOT) Faust -> AudioWorklet build for the Chorus MV3 extension.
//
// WHY THIS EXISTS
// ---------------
// @grame/faustwasm's runtime `createNode()` registers its AudioWorkletProcessor
// by stringifying it, wrapping it in `new Blob(...)`, and calling
// `audioWorklet.addModule(URL.createObjectURL(blob))`. That `blob:` URL is
// REFUSED by the MV3 extension CSP (`script-src 'self' 'wasm-unsafe-eval'`), and
// `blob:` cannot be added to an extension CSP. So we must SHIP a static,
// self-registering worklet .js (served from the extension origin and loaded via
// chrome.runtime.getURL + addModule), exactly like src/public/processor.js.
//
// `WebAssembly.compile()` IS allowed by `wasm-unsafe-eval`, so the host compiles
// the .wasm on the main thread and hands the WebAssembly.Module to the worklet
// through `processorOptions` (the faustwasm processor expects a `factory` there).
// No blob, no libfaust compiler shipped.
//
// WHAT IT PRODUCES (per engine, under src/public/faust/<engine>/):
//   - processor.js     : static, self-registering AudioWorkletProcessor bundle
//                        (the EXACT string faustwasm would have put in the blob,
//                         written to disk instead — contains zero blob:/createObjectURL)
//   - dsp-module.wasm  : the compiled Faust DSP
//   - dsp-meta.json    : param metadata (addresses, min/max/init/step, I/O counts)
//
// HOW THE STATIC WORKLET TEXT IS OBTAINED
// ---------------------------------------
// We don't hand-transcribe the worklet template. We drive faustwasm's OWN
// `FaustMonoDspGenerator.createNode()` in Node with `URL.createObjectURL`
// stubbed: createNode builds the processor source string, then calls
// createObjectURL(blob) — our stub captures `blob`'s text and throws a sentinel,
// short-circuiting before any real AudioWorkletNode is constructed. The captured
// text is byte-identical to what faustwasm ships, so the static worklet stays in
// lockstep with the installed faustwasm version.

import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// The package has no `exports` map, so a bare specifier resolves to the CJS
// build and drops the named ESM exports. Import the ESM entry + the internal
// compile helper by explicit path.
import faust2wasmFiles from '@grame/faustwasm/src/faust2wasmFiles.js'
import { FaustMonoDspGenerator } from '@grame/faustwasm/dist/esm/index.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Engine table: dsp source -> output engine dir. The processor name registered
// inside each worklet is the dsp file's base name (faustwasm uses `dspName` when
// no shaKey/processorName override is given). We pin processorName explicitly so
// the host knows it without parsing the meta.
const ENGINES = [
    { dsp: 'src/dsp/chorus_jpverb.dsp', name: 'chorus_jpverb', out: 'src/public/faust/jpverb' },
    { dsp: 'src/dsp/chorus_zita.dsp', name: 'chorus_zita', out: 'src/public/faust/zita' }
]

// Sentinel thrown from the stubbed createObjectURL to unwind createNode() right
// after it has built the processor source string (before it touches the DOM /
// AudioWorkletNode).
const CAPTURED = Symbol('captured-processor-code')

/**
 * Run faustwasm's createNode() far enough to capture the static worklet source,
 * without a real AudioContext. Returns the processor source string.
 */
async function captureProcessorCode({ wasmPath, metaPath, processorName }) {
    const wasmBuffer = readFileSync(wasmPath)
    const json = readFileSync(metaPath, 'utf8')

    // Compile the DSP wasm to a WebAssembly.Module — exactly the main-thread step
    // the real host performs. (Node allows this unconditionally; in the extension
    // it's permitted by `wasm-unsafe-eval`.)
    const module = await WebAssembly.compile(wasmBuffer)

    // The factory shape faustwasm's processor expects in processorOptions.factory.
    const meta = JSON.parse(json)
    const poly = String(meta.compile_options || '').includes('wasm-e')
    const factory = {
        cfactory: 0,
        code: new Uint8Array(wasmBuffer),
        module,
        json,
        poly,
        soundfiles: {}
    }

    const generator = new FaustMonoDspGenerator()
    generator.factory = factory
    generator.name = processorName

    // Minimal fake AudioContext: only used as a WeakMap key + passed to
    // loadSoundfiles (which is a no-op for our soundfile-free reverbs).
    const fakeContext = { sampleRate: 48000 }

    let captured = null
    const realCreateObjectURL = globalThis.URL.createObjectURL
    globalThis.URL.createObjectURL = (blob) => {
        // faustwasm passes `new Blob([processorCode], { type: 'text/javascript' })`.
        // Pull the text back out synchronously from the blob's parts.
        captured = blobToText(blob)
        throw CAPTURED
    }

    try {
        await generator.createNode(
            fakeContext,
            processorName, // name
            factory, // factory
            false, // sp (use AudioWorklet path, not ScriptProcessor)
            1024, // bufferSize
            processorName // processorName (the registerProcessor name)
        )
    } catch (e) {
        if (e !== CAPTURED) throw e
    } finally {
        globalThis.URL.createObjectURL = realCreateObjectURL
    }

    if (!captured) throw new Error(`Failed to capture processor code for ${processorName}`)
    return captured
}

// Extract the text passed to `new Blob([text], ...)`. Node's Blob keeps the
// parts; reading .text() is async, but the part is a plain string we can recover
// without I/O by reconstructing from the blob. We can't access internal parts
// portably, so fall back to a synchronous deopt: faustwasm always passes a single
// string part, so we stash it on the Blob via a wrapper is not possible here —
// instead we read it through a synchronous XHR-free path using the part list.
function blobToText(blob) {
    // Node >= 18 Blob exposes neither sync text nor parts. But the caller passes a
    // freshly-constructed Blob([string]); we monkeypatch Blob below so the string
    // is captured directly, making this a passthrough.
    if (typeof blob === 'string') return blob
    if (blob && typeof blob.__chorusText === 'string') return blob.__chorusText
    throw new Error('Unexpected Blob shape; cannot recover processor source synchronously')
}

// Capture the Blob's string part at construction time (sync), since reading it
// back later is async-only in Node.
function installBlobCapture() {
    const RealBlob = globalThis.Blob
    class CapturingBlob extends RealBlob {
        constructor(parts, options) {
            super(parts, options)
            if (Array.isArray(parts) && parts.length === 1 && typeof parts[0] === 'string') {
                this.__chorusText = parts[0]
            }
        }
    }
    globalThis.Blob = CapturingBlob
    return () => {
        globalThis.Blob = RealBlob
    }
}

async function buildEngine(engine) {
    const dspPath = resolve(root, engine.dsp)
    const outDir = resolve(root, engine.out)

    // Fresh output dir so stale artifacts can't linger.
    if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true })
    mkdirSync(outDir, { recursive: true })

    // 1) Compile the DSP -> dsp-module.wasm + dsp-meta.json (no template assets;
    //    we assemble our own static worklet below). `-no-template` is handled by
    //    calling faust2wasmFiles directly (it never writes template assets).
    console.log(`[build-faust] compiling ${engine.dsp}`)
    await faust2wasmFiles(dspPath, outDir, [], false)

    const wasmPath = join(outDir, 'dsp-module.wasm')
    const metaPath = join(outDir, 'dsp-meta.json')

    // 2) Capture the static, self-registering worklet source from faustwasm.
    const restoreBlob = installBlobCapture()
    let processorCode
    try {
        processorCode = await captureProcessorCode({
            wasmPath,
            metaPath,
            processorName: engine.name
        })
    } finally {
        restoreBlob()
    }

    // 3) Prepend a header documenting the host contract; write processor.js.
    const header = `// AUTO-GENERATED by scripts/build-faust.mjs — DO NOT EDIT.
// Static, CSP-clean Faust AudioWorklet for the "${engine.name}" reverb.
// Registers processor "${engine.name}". Mono-in / stereo-out.
//
// Host-side contract (main thread):
//   const wasm = await (await fetch(chrome.runtime.getURL(
//       'faust/${engine.out.split('/').pop()}/dsp-module.wasm'))).arrayBuffer()
//   const module = await WebAssembly.compile(wasm)               // wasm-unsafe-eval OK
//   const json = await (await fetch(chrome.runtime.getURL(
//       'faust/${engine.out.split('/').pop()}/dsp-meta.json'))).text()
//   await ctx.audioWorklet.addModule(chrome.runtime.getURL(
//       'faust/${engine.out.split('/').pop()}/processor.js'))
//   const node = new AudioWorkletNode(ctx, '${engine.name}', {
//       numberOfInputs: 1, numberOfOutputs: 1,
//       channelCount: 1, channelCountMode: 'explicit',
//       outputChannelCount: [2],
//       processorOptions: {
//           name: '${engine.name}',
//           factory: { cfactory: 0, code: new Uint8Array(wasm), module, json, poly: false, soundfiles: {} },
//           sampleSize: 4
//       }
//   })
// Set a param at runtime (no AudioParams — params are message-driven):
//   node.port.postMessage({ type: 'param', data: { path: '/${engine.name}/Dry_Wet', value: 0.5 } })
//
`
    const processorPath = join(outDir, 'processor.js')
    writeFileSync(processorPath, header + processorCode)

    // 4) CSP guard: the generated worklet MUST contain no blob loader.
    const written = readFileSync(processorPath, 'utf8')
    if (written.includes('createObjectURL') || written.includes('blob:')) {
        throw new Error(
            `[build-faust] FATAL: ${processorPath} contains a blob loader (createObjectURL/blob:) — not CSP-clean`
        )
    }

    console.log(`[build-faust] wrote ${engine.out}/processor.js (registerProcessor '${engine.name}')`)
    console.log(`[build-faust] wrote ${engine.out}/dsp-module.wasm + dsp-meta.json`)
}

;(async () => {
    for (const engine of ENGINES) {
        await buildEngine(engine)
    }
    console.log('[build-faust] done')
})().catch((err) => {
    console.error('[build-faust] FAILED:', err)
    process.exit(1)
})
