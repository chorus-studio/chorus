/**
 * One look as a file, for sharing a look between people and browsers:
 * `chorus-look-<name>.json` holds the look's record and, for a picture kept
 * in Chorus, the picture's bytes. Reading one back is strict: a file may come
 * from anyone, so every field is checked, clamped or dropped before the look
 * goes anywhere near storage. `sanitiseLook` does that checking for the
 * backup restore too.
 *
 * Pure; the tests check the strings.
 */
import {
    ANCHORS,
    COVER_ZOOM_MAX,
    COVER_ZOOM_MIN,
    GRADIENT_STOPS_MAX,
    GRADIENT_STOPS_MIN,
    IMAGE_BLUR_MAX,
    IMAGE_DIM_MAX,
    IMAGE_SATURATE_MAX,
    SHOW_THROUGH_MAX,
    type Anchor,
    type Backdrop,
    type GradientKind,
    type GradientStop,
    type ImageBackdrop,
    type ImageFit,
    type ImageInfo,
    type Look,
    type PaletteSource
} from '$lib/types/look'
import { THEME_NAMES, type CSSVariable, type ThemeName } from './theming'
import { completePalette, normaliseHex } from './look-palette'
import type { StoredWallpaper } from './wallpapers'

export const LOOK_FILE_APP = 'chorus'
export const LOOK_FILE_KIND = 'look'
/** Bump when the file's own shape changes. */
export const LOOK_FILE_FORMAT = 1
export const LOOK_NAME_MAX = 60

export type LookFile = {
    app: typeof LOOK_FILE_APP
    kind: typeof LOOK_FILE_KIND
    format: number
    /** The extension version that wrote the file. */
    version: string
    exported_at: string
    look: Look
    /** The bytes of a picture kept in Chorus, when the look has one. */
    wallpaper?: StoredWallpaper
}

export type ParsedLookFile = {
    look: Look
    wallpaper: StoredWallpaper | null
    /** The look named a picture kept in Chorus but the file did not carry it; the backdrop was dropped. */
    missingPicture: boolean
}

export class LookFileError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'LookFileError'
    }
}

const SLOTS: CSSVariable[] = [
    'text',
    'subtext',
    'main',
    'sidebar',
    'player',
    'card',
    'shadow',
    'selected_row',
    'button',
    'button_active',
    'button_disabled',
    'tab_active',
    'notification',
    'notification_error',
    'misc'
]
const GRADIENT_KINDS = new Set<GradientKind>(['linear', 'radial', 'conic', 'mesh'])
const IMAGE_FITS = new Set<ImageFit>(['cover', 'contain', 'tile'])
const WALLPAPER_MIME = /^(image|video)\/[\w.+-]+$/
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

const clamp = (value: unknown, lo: number, hi: number, fallback: number): number => {
    const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback
    return Math.min(hi, Math.max(lo, n))
}

const bool = (value: unknown, fallback: boolean): boolean =>
    typeof value === 'boolean' ? value : fallback

const anchor = (value: unknown, fallback: Anchor = 'center'): Anchor =>
    ANCHORS.includes(value as Anchor) ? (value as Anchor) : fallback

/** A picture address the page may load: https, or a data URL of an image. */
function pictureUrl(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const url = value.trim()
    if (/^https:\/\/\S+$/i.test(url) && url.length <= 2048) return url
    return null
}

function dataImage(value: unknown): string | undefined {
    return typeof value === 'string' && /^data:image\/[\w.+-]+;base64,/.test(value)
        ? value
        : undefined
}

function sanitisePalette(raw: unknown): PaletteSource {
    const fallback: PaletteSource = { kind: 'builtin', name: 'spotify' }
    if (!isRecord(raw)) return fallback
    if (raw.kind === 'builtin') {
        return THEME_NAMES.includes(raw.name as ThemeName)
            ? { kind: 'builtin', name: raw.name as ThemeName }
            : fallback
    }
    if (raw.kind === 'colours') {
        const base = normaliseHex(raw.base as string)
        const accent = normaliseHex(raw.accent as string)
        if (!base || !accent) return fallback
        const text = normaliseHex(raw.text as string)
        return text ? { kind: 'colours', base, accent, text } : { kind: 'colours', base, accent }
    }
    if (raw.kind === 'cover') return { kind: 'cover' }
    if (raw.kind === 'slots' && isRecord(raw.colours)) {
        const partial: Partial<Record<CSSVariable, string>> = {}
        for (const slot of SLOTS) {
            const hex = normaliseHex(raw.colours[slot] as string)
            if (hex) partial[slot] = hex
        }
        if (!Object.keys(partial).length) return fallback
        return { kind: 'slots', colours: completePalette(partial) }
    }
    return fallback
}

function sanitiseStops(raw: unknown): GradientStop[] | null {
    if (!Array.isArray(raw)) return null
    const stops: GradientStop[] = []
    for (const stop of raw) {
        if (!isRecord(stop)) continue
        const color = normaliseHex(stop.color as string)
        if (!color) continue
        stops.push({ color, at: clamp(stop.at, 0, 100, 0) })
        if (stops.length === GRADIENT_STOPS_MAX) break
    }
    return stops.length >= GRADIENT_STOPS_MIN ? stops : null
}

function sanitiseInfo(raw: unknown): ImageInfo | undefined {
    if (!isRecord(raw)) return undefined
    const thumb = dataImage(raw.thumb)
    if (!thumb || typeof raw.mime !== 'string') return undefined
    return {
        name: typeof raw.name === 'string' ? raw.name.slice(0, 120) : 'Picture',
        mime: raw.mime,
        width: clamp(raw.width, 0, 100000, 0),
        height: clamp(raw.height, 0, 100000, 0),
        bytes: clamp(raw.bytes, 0, Number.MAX_SAFE_INTEGER, 0),
        animated: bool(raw.animated, false),
        thumb,
        ...(raw.video === true ? { video: true } : {}),
        ...(typeof raw.duration === 'number' && Number.isFinite(raw.duration)
            ? { duration: clamp(raw.duration, 0, 100000, 0) }
            : {})
    }
}

/** A backdrop with every field checked; null when the record is not one, or names a picture the look cannot have. */
export function sanitiseBackdrop(raw: unknown): Backdrop | null {
    if (!isRecord(raw)) return null
    switch (raw.kind) {
        case 'gradient': {
            const stops = sanitiseStops(raw.stops)
            if (!stops) return null
            return {
                kind: 'gradient',
                type: GRADIENT_KINDS.has(raw.type as GradientKind)
                    ? (raw.type as GradientKind)
                    : 'linear',
                angle: clamp(raw.angle, 0, 360, 135),
                origin: anchor(raw.origin),
                stops,
                drift: bool(raw.drift, false)
            }
        }
        case 'image': {
            const source = isRecord(raw.source) ? raw.source : null
            let picked: ImageBackdrop['source'] | null = null
            if (source?.type === 'file' && typeof source.id === 'string' && source.id) {
                picked = { type: 'file', id: source.id.slice(0, 120) }
            } else if (source?.type === 'url') {
                const url = pictureUrl(source.url)
                if (url) picked = { type: 'url', url }
            }
            if (!picked) return null
            const info = sanitiseInfo(raw.info)
            return {
                kind: 'image',
                source: picked,
                ...(info ? { info } : {}),
                fit: IMAGE_FITS.has(raw.fit as ImageFit) ? (raw.fit as ImageFit) : 'cover',
                anchor: anchor(raw.anchor),
                dim: clamp(raw.dim, 0, IMAGE_DIM_MAX, 35),
                blur: clamp(raw.blur, 0, IMAGE_BLUR_MAX, 0),
                saturate: clamp(raw.saturate, 0, IMAGE_SATURATE_MAX, 100),
                tint: bool(raw.tint, true),
                animate: bool(raw.animate, true)
            }
        }
        case 'cover':
            return {
                kind: 'cover',
                blur: clamp(raw.blur, 0, IMAGE_BLUR_MAX, 40),
                dim: clamp(raw.dim, 0, IMAGE_DIM_MAX, 30),
                zoom: clamp(raw.zoom, COVER_ZOOM_MIN, COVER_ZOOM_MAX, 120)
            }
        default:
            return null
    }
}

/**
 * A look's record brought to the current shape, every field checked: an
 * unknown palette falls back to Spotify's, an unusable backdrop to none,
 * numbers are clamped to their sliders. Null when the record is not a look
 * at all (no name). The id is kept as given; callers re-identify imports.
 */
export function sanitiseLook(raw: unknown): Look | null {
    if (!isRecord(raw) || typeof raw.name !== 'string') return null
    const name = raw.name.trim().slice(0, LOOK_NAME_MAX)
    if (!name) return null
    const panels = isRecord(raw.panels) ? raw.panels : {}
    const now = Date.now()
    return {
        id: typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 120) : crypto.randomUUID(),
        name,
        palette: sanitisePalette(raw.palette),
        backdrop: sanitiseBackdrop(raw.backdrop),
        panels: {
            showThrough: clamp(panels.showThrough, 0, SHOW_THROUGH_MAX, 25),
            glass: bool(panels.glass, false)
        },
        ...(typeof raw.remixedFrom === 'string'
            ? { remixedFrom: raw.remixedFrom.slice(0, 120) }
            : {}),
        createdAt: clamp(raw.createdAt, 0, Number.MAX_SAFE_INTEGER, now),
        updatedAt: clamp(raw.updatedAt, 0, Number.MAX_SAFE_INTEGER, now)
    }
}

/** A stored picture's record as a file may carry it: a mime, base64 bytes, and the rest checked. */
export function sanitiseWallpaper(raw: unknown): StoredWallpaper | null {
    if (!isRecord(raw)) return null
    if (typeof raw.mime !== 'string' || !WALLPAPER_MIME.test(raw.mime)) return null
    if (typeof raw.data !== 'string' || !raw.data || !BASE64.test(raw.data)) return null
    const still = dataImage(raw.still)
    return {
        mime: raw.mime,
        data: raw.data,
        width: clamp(raw.width, 0, 100000, 0),
        height: clamp(raw.height, 0, 100000, 0),
        bytes: clamp(raw.bytes, 0, Number.MAX_SAFE_INTEGER, Math.floor((raw.data.length * 3) / 4)),
        animated: bool(raw.animated, false),
        ...(still ? { still } : {})
    }
}

/** The wallpaper id a look's backdrop names, when its picture is kept in Chorus. */
export function lookWallpaperId(look: Pick<Look, 'backdrop'>): string | null {
    const backdrop = look.backdrop
    return backdrop?.kind === 'image' && backdrop.source.type === 'file' ? backdrop.source.id : null
}

export function serialiseLookFile(
    look: Look,
    version: string,
    wallpaper: StoredWallpaper | null = null
): string {
    const file: LookFile = {
        app: LOOK_FILE_APP,
        kind: LOOK_FILE_KIND,
        format: LOOK_FILE_FORMAT,
        version,
        exported_at: new Date().toISOString(),
        look: { ...look, builtIn: undefined },
        ...(wallpaper ? { wallpaper } : {})
    }
    return JSON.stringify(file, null, 2)
}

/** `chorus-look-northern-lights.json`. */
export function lookFileName(look: Pick<Look, 'name'>): string {
    const slug = look.name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40)
    return `chorus-look-${slug || 'look'}.json`
}

/**
 * Read a look file. Throws a LookFileError with a sentence for the person
 * when the file is not one of ours; a look whose picture is missing from the
 * file comes back without its backdrop, flagged.
 */
export function parseLookFile(text: string): ParsedLookFile {
    let raw: unknown
    try {
        raw = JSON.parse(text)
    } catch {
        throw new LookFileError('That file is not JSON.')
    }
    if (!isRecord(raw) || raw.app !== LOOK_FILE_APP || raw.kind !== LOOK_FILE_KIND) {
        throw new LookFileError('That file is not a Chorus look.')
    }
    const format = typeof raw.format === 'number' ? raw.format : 0
    if (format > LOOK_FILE_FORMAT) {
        throw new LookFileError(
            'This look was saved by a newer Chorus. Update the extension, then try again.'
        )
    }
    const look = sanitiseLook(raw.look)
    if (!look) throw new LookFileError('The look in that file is damaged.')
    let wallpaper = sanitiseWallpaper(raw.wallpaper)
    let missingPicture = false
    if (lookWallpaperId(look)) {
        if (!wallpaper) {
            missingPicture = true
            look.backdrop = null
        }
    } else {
        wallpaper = null
    }
    return { look, wallpaper, missingPicture }
}

/**
 * A parsed look as one of the person's own: a fresh id, its picture (if any)
 * under a fresh wallpaper id, and the clock reset.
 */
export function adoptLook(parsed: ParsedLookFile, id: string, wallpaperId: string): Look {
    const now = Date.now()
    const look: Look = { ...parsed.look, id, builtIn: undefined, createdAt: now, updatedAt: now }
    if (look.backdrop?.kind === 'image' && look.backdrop.source.type === 'file') {
        look.backdrop = { ...look.backdrop, source: { type: 'file', id: wallpaperId } }
    }
    return look
}
