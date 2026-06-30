// Copies the onnxruntime-web wasm runtime into src/public/ort/ so it is served
// from the EXTENSION origin. The MV3 content-script CSP (`script-src 'self'`)
// blocks loading ORT's wasm-glue .mjs from a remote CDN, so it must be local.
// Only the asyncify variant is needed — it's the one the webgpu bundle resolves
// to (and it already includes JSEP, so it also covers the WebGPU EP).
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'node_modules/onnxruntime-web/dist')
const dst = resolve(root, 'src/public/ort')

mkdirSync(dst, { recursive: true })
for (const f of ['ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm']) {
    copyFileSync(resolve(src, f), resolve(dst, f))
    console.log('[copy-ort]', f)
}
