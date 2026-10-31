/**
 * The bytes behind an image backdrop.
 *
 * A picture a person drops on the Theme tab is checked, resized if it is a
 * big still, and kept in extension storage under its own key, one per look,
 * never inside the looks record or the settings: those are small JSON that
 * every window re-reads on each change, and a 6 MB GIF has no business
 * riding along. Extension storage (with `unlimitedStorage`) is the one place
 * the page's content script, the popup and the PiP window can all read, and
 * it survives Spotify clearing its own site data. The page turns the stored
 * bytes into an object URL once and reuses it (a data URL in Firefox, whose
 * content scripts cannot hand the page a blob URL of their own).
 */
import { storage } from '@wxt-dev/storage'
import type { ImageInfo } from '$lib/types/look'

export const WALLPAPER_KEY_PREFIX = 'local:chorus_wallpaper_'
/** Stills longer than this on either side are resized before they are stored. */
export const MAX_STILL_EDGE = 2560
/** The most a stored file may weigh; a still is re-encoded to fit, an animation is refused. */
export const MAX_BYTES = 8 * 1024 * 1024
/** Files above this are refused before any decoding, so a dropped video does not stall the page. */
const MAX_INPUT_BYTES = 48 * 1024 * 1024
const THUMB_WIDTH = 160
/** The still frame shown for an animated file under Reduce motion (or with its animation off). */
const STILL_WIDTH = 1280
const WEBP_QUALITY = 0.86
const THUMB_QUALITY = 0.7
const STILL_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export type StoredWallpaper = {
    mime: string
    /** The file, base64. */
    data: string
    width: number
    height: number
    bytes: number
    animated: boolean
    /** A still frame of an animated file, as a data URL. */
    still?: string
}

export type ImportedWallpaper = { blob: Blob; info: ImageInfo; still?: string }

export class WallpaperError extends Error {}

const wallpaperKey = (id: string) => `${WALLPAPER_KEY_PREFIX}${id}` as `local:${string}`

/** `acTL` before `IDAT` makes a PNG animated; a `ANIM` chunk makes a WebP animated. GIFs are taken as animated. */
async function isAnimated(file: Blob): Promise<boolean> {
    if (file.type === 'image/gif') return true
    if (file.type !== 'image/png' && file.type !== 'image/webp') return false
    const head = new Uint8Array(await file.slice(0, 1024 * 1024).arrayBuffer())
    const text = Array.from(head.subarray(0, Math.min(head.length, 256 * 1024)), (b) =>
        String.fromCharCode(b)
    ).join('')
    if (file.type === 'image/webp') return text.includes('ANIM')
    const actl = text.indexOf('acTL')
    const idat = text.indexOf('IDAT')
    return actl >= 0 && (idat < 0 || actl < idat)
}

function scaledSize(width: number, height: number, longest: number): [number, number] {
    const edge = Math.max(width, height)
    if (edge <= longest) return [width, height]
    const ratio = longest / edge
    return [Math.round(width * ratio), Math.round(height * ratio)]
}

/** The bitmap drawn at a width, as a WebP blob. */
async function encode(bitmap: ImageBitmap, longest: number, quality: number): Promise<Blob> {
    const [w, h] = scaledSize(bitmap.width, bitmap.height, longest)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new WallpaperError('This browser cannot resize images.')
    ctx.drawImage(bitmap, 0, 0, w, h)
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) =>
                blob ? resolve(blob) : reject(new WallpaperError('Could not encode the image.')),
            'image/webp',
            quality
        )
    })
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new WallpaperError('Could not read the image.'))
        reader.readAsDataURL(blob)
    })
}

async function blobToBase64(blob: Blob): Promise<string> {
    return (await blobToDataUrl(blob)).split(',')[1] ?? ''
}

function formatBytes(bytes: number): string {
    return bytes >= 1024 * 1024
        ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(bytes / 1024)} KB`
}

/**
 * Check a dropped file and prepare it for storage: a JPEG, PNG or WebP still
 * is resized to MAX_STILL_EDGE and re-encoded as WebP when it is too big;
 * a GIF, APNG or animated WebP is kept byte for byte (resizing would lose
 * the animation) and gets a still frame for Reduce motion. Throws a
 * WallpaperError with a sentence for the person when the file will not do.
 */
export async function importWallpaper(file: File): Promise<ImportedWallpaper> {
    if (!file.type.startsWith('image/')) {
        throw new WallpaperError('Pick an image: JPEG, PNG, WebP, GIF or APNG.')
    }
    if (file.size > MAX_INPUT_BYTES) {
        throw new WallpaperError(
            `That file is ${formatBytes(file.size)}; the most is ${formatBytes(MAX_INPUT_BYTES)}.`
        )
    }
    let bitmap: ImageBitmap
    try {
        bitmap = await createImageBitmap(file)
    } catch {
        throw new WallpaperError('That image could not be read.')
    }
    try {
        const animated = await isAnimated(file)
        let blob: Blob = file
        let still: string | undefined
        if (animated) {
            if (file.size > MAX_BYTES) {
                throw new WallpaperError(
                    `An animated image has to stay under ${formatBytes(MAX_BYTES)}; this one is ${formatBytes(file.size)}. A shorter or smaller loop will do.`
                )
            }
            still = await blobToDataUrl(await encode(bitmap, STILL_WIDTH, WEBP_QUALITY))
        } else {
            const tooLarge =
                Math.max(bitmap.width, bitmap.height) > MAX_STILL_EDGE || file.size > MAX_BYTES
            if (tooLarge || !STILL_TYPES.has(file.type)) {
                blob = await encode(bitmap, MAX_STILL_EDGE, WEBP_QUALITY)
            }
            if (blob.size > MAX_BYTES) {
                throw new WallpaperError('Even resized, that image is too heavy to keep.')
            }
        }
        const thumb = await blobToDataUrl(await encode(bitmap, THUMB_WIDTH, THUMB_QUALITY))
        const [width, height] = animated
            ? [bitmap.width, bitmap.height]
            : scaledSize(bitmap.width, bitmap.height, MAX_STILL_EDGE)
        return {
            blob,
            still,
            info: {
                name: file.name,
                mime: blob.type || file.type,
                width,
                height,
                bytes: blob.size,
                animated,
                thumb
            }
        }
    } finally {
        bitmap.close()
    }
}

export async function saveWallpaper(id: string, imported: ImportedWallpaper): Promise<void> {
    const { info } = imported
    const stored: StoredWallpaper = {
        mime: info.mime,
        data: await blobToBase64(imported.blob),
        width: info.width,
        height: info.height,
        bytes: info.bytes,
        animated: info.animated,
        still: imported.still
    }
    release(id)
    await storage.setItem<StoredWallpaper>(wallpaperKey(id), stored)
}

export async function deleteWallpaper(id: string): Promise<void> {
    release(id)
    await storage.removeItem(wallpaperKey(id))
}

export function readWallpaper(id: string): Promise<StoredWallpaper | null> {
    return storage.getItem<StoredWallpaper>(wallpaperKey(id))
}

// ---- Addresses the page can load -------------------------------------------

type Urls = { full?: string; still?: string }
const urls = new Map<string, Urls>()
const pending = new Map<string, Promise<Urls | null>>()

/** Firefox content scripts cannot give the page a blob: URL it may load; a data URL works everywhere. */
const useDataUrls = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent)

function base64ToBlob(data: string, mime: string): Blob {
    const binary = atob(data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mime })
}

async function load(id: string): Promise<Urls | null> {
    const stored = await readWallpaper(id)
    if (!stored) return null
    const full = useDataUrls
        ? `data:${stored.mime};base64,${stored.data}`
        : URL.createObjectURL(base64ToBlob(stored.data, stored.mime))
    const entry: Urls = { full, still: stored.still }
    urls.set(id, entry)
    return entry
}

/**
 * An address for a stored wallpaper, made once per document and reused:
 * the full file, or its still frame when `still` is asked for and the file
 * has one. Null when nothing is stored under the id.
 */
export async function wallpaperUrl(id: string, still = false): Promise<string | null> {
    let entry = urls.get(id) ?? null
    if (!entry) {
        let loading = pending.get(id)
        if (!loading) {
            loading = load(id).finally(() => pending.delete(id))
            pending.set(id, loading)
        }
        entry = await loading
    }
    if (!entry) return null
    return (still && entry.still) || entry.full || null
}

/** Forget a wallpaper's address (and free its blob) after it is replaced or deleted. */
export function release(id: string): void {
    const entry = urls.get(id)
    if (entry?.full && !useDataUrls) URL.revokeObjectURL(entry.full)
    urls.delete(id)
}

export function releaseAllWallpapers(): void {
    for (const id of [...urls.keys()]) release(id)
}
