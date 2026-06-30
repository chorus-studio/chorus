# Vocal-separation models (not committed)

Drop the ONNX model here to use the **bundled / local** model path (no CORS, no
runtime download — most reliable for testing):

```
src/public/models/UVR-MDX-NET-Inst_HQ_3.onnx   (~67 MB)
```

Download it from:
https://huggingface.co/seanghay/uvr_models/blob/main/UVR-MDX-NET-Inst_HQ_3.onnx

The build copies `src/public/*` into the extension, and the manifest exposes
`/models/*` as a web-accessible resource, so the engine loads it via
`chrome.runtime.getURL('models/UVR-MDX-NET-Inst_HQ_3.onnx')`.

If this file is **absent**, the engine falls back to downloading it from Hugging
Face on the first snapshot and caching it (Cache API). `*.onnx` is gitignored so
the large binary never lands in the repo.
