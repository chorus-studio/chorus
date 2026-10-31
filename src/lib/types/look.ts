/**
 * A look is what the Theme tab saves: the colours Spotify's page wears (a
 * palette) and, optionally, a backdrop its panels float on (a gradient, an
 * image or the playing cover) with how much of that backdrop shows through
 * the panels. Built-in looks pair a gradient with one of the built-in
 * palettes. A person's own looks live in the looks store (stores/looks.ts);
 * the bytes of an uploaded image live apart from them (utils/wallpapers.ts),
 * so a settings write never carries a picture along.
 */
import type { CSSVariable, ThemeName } from '$lib/utils/theming'

export type GradientKind = 'linear' | 'radial' | 'conic' | 'mesh'
/** `at` is the stop's place along the gradient, 0–100. */
export type GradientStop = { color: string; at: number }
export type Anchor =
    | 'top left'
    | 'top'
    | 'top right'
    | 'left'
    | 'center'
    | 'right'
    | 'bottom left'
    | 'bottom'
    | 'bottom right'

export type GradientBackdrop = {
    kind: 'gradient'
    type: GradientKind
    /** Degrees; the direction of a linear gradient, the start of a conic one. */
    angle: number
    /** Where a radial or conic gradient sits. */
    origin: Anchor
    stops: GradientStop[]
    /** Slowly moves the gradient; held still under Reduce motion. */
    drift: boolean
}

export type ImageFit = 'cover' | 'contain' | 'tile'
export type ImageSource = { type: 'file'; id: string } | { type: 'url'; url: string }
/** What the importer learnt about a stored file, for the cards and the editor. */
export type ImageInfo = {
    name: string
    mime: string
    width: number
    height: number
    bytes: number
    animated: boolean
    /** A small data URL for cards and the editor's chip. */
    thumb: string
}

export type ImageBackdrop = {
    kind: 'image'
    source: ImageSource
    info?: ImageInfo
    fit: ImageFit
    anchor: Anchor
    /** 0–80 %: a wash of the frame colour (or black / white) over the image. */
    dim: number
    /** 0–40 px. */
    blur: number
    /** 0–200 %. */
    saturate: number
    /** The wash is the palette's frame colour rather than plain black or white. */
    tint: boolean
    /** Let an animated file play; off, its still frame is shown. */
    animate: boolean
}

export type CoverBackdrop = {
    kind: 'cover'
    blur: number
    dim: number
    /** 100–160 %: enlarges the cover so a blur's soft edge stays off screen. */
    zoom: number
}

export type Backdrop = GradientBackdrop | ImageBackdrop | CoverBackdrop
export type BackdropKind = Backdrop['kind']

export type PaletteSource =
    | { kind: 'builtin'; name: ThemeName }
    /** Two colours (and an optional text colour) derive all fifteen slots. */
    | { kind: 'colours'; base: string; accent: string; text?: string }
    /** Every slot by hand, Spicetify's keys one for one. */
    | { kind: 'slots'; colours: Record<CSSVariable, string> }

export type Panels = {
    /** 0–60 %: how much of the backdrop shows through the page's panels. */
    showThrough: number
    /** Blur the backdrop behind each panel. */
    glass: boolean
}

export type Look = {
    id: string
    name: string
    palette: PaletteSource
    backdrop: Backdrop | null
    panels: Panels
    builtIn?: boolean
    remixedFrom?: string
    createdAt: number
    updatedAt: number
}

export type LooksState = {
    version: 1
    /** The person's own looks, by id. */
    looks: Record<string, Look>
    /** Built-in palettes and looks taken off the Theme tab. */
    hiddenBuiltIn: string[]
}

export const DEFAULT_LOOKS_STATE: LooksState = { version: 1, looks: {}, hiddenBuiltIn: [] }

export const SHOW_THROUGH_MAX = 60
/** A light page shows dark text over a light panel; less of the backdrop can come through before it fights the text. */
export const SHOW_THROUGH_MAX_LIGHT = 40
export const GRADIENT_STOPS_MAX = 5
export const GRADIENT_STOPS_MIN = 2
export const IMAGE_DIM_MAX = 80
export const IMAGE_BLUR_MAX = 40
export const IMAGE_SATURATE_MAX = 200
export const COVER_ZOOM_MIN = 100
export const COVER_ZOOM_MAX = 160

export const ANCHORS: Anchor[] = [
    'top left',
    'top',
    'top right',
    'left',
    'center',
    'right',
    'bottom left',
    'bottom',
    'bottom right'
]

export const DEFAULT_PANELS: Panels = { showThrough: 25, glass: false }

export const DEFAULT_GRADIENT: GradientBackdrop = {
    kind: 'gradient',
    type: 'linear',
    angle: 135,
    origin: 'center',
    stops: [
        { color: '#0f0c29', at: 0 },
        { color: '#302b63', at: 50 },
        { color: '#24243e', at: 100 }
    ],
    drift: false
}

/** The options an imported image starts with; the source is filled in by the importer. */
export const DEFAULT_IMAGE_OPTIONS: Omit<ImageBackdrop, 'kind' | 'source' | 'info'> = {
    fit: 'cover',
    anchor: 'center',
    dim: 35,
    blur: 0,
    saturate: 100,
    tint: true,
    animate: true
}

export const DEFAULT_COVER: CoverBackdrop = { kind: 'cover', blur: 40, dim: 30, zoom: 120 }

function builtin(
    id: string,
    name: string,
    palette: ThemeName,
    gradient: Omit<GradientBackdrop, 'kind' | 'drift' | 'origin'> & Partial<GradientBackdrop>
): Look {
    return {
        id,
        name,
        builtIn: true,
        palette: { kind: 'builtin', name: palette },
        backdrop: { kind: 'gradient', drift: false, origin: 'center', ...gradient },
        panels: { ...DEFAULT_PANELS },
        createdAt: 0,
        updatedAt: 0
    }
}

/**
 * The built-in looks: a gradient over the built-in palette nearest its
 * colours, so a gradient is never a bare wash with Spotify's greys on top.
 * Eight kept from the fifty the first custom-theming branch carried.
 */
export const BUILTIN_LOOKS: Look[] = [
    builtin('aurora', 'Aurora', 'regal', {
        type: 'linear',
        angle: 135,
        stops: [
            { color: '#0f0c29', at: 0 },
            { color: '#302b63', at: 50 },
            { color: '#24243e', at: 100 }
        ]
    }),
    builtin('sunset', 'Sunset', 'lava', {
        type: 'linear',
        angle: 180,
        stops: [
            { color: '#ff512f', at: 0 },
            { color: '#f09819', at: 50 },
            { color: '#dd2476', at: 100 }
        ]
    }),
    builtin('ocean_breeze', 'Ocean breeze', 'sky', {
        type: 'linear',
        angle: 160,
        stops: [
            { color: '#0052d4', at: 0 },
            { color: '#4364f7', at: 50 },
            { color: '#6fb1fc', at: 100 }
        ]
    }),
    builtin('northern_lights', 'Northern lights', 'lagoon', {
        type: 'conic',
        angle: 180,
        origin: 'bottom',
        stops: [
            { color: '#43cea2', at: 0 },
            { color: '#185a9d', at: 50 },
            { color: '#43cea2', at: 100 }
        ]
    }),
    builtin('ember', 'Ember', 'mars', {
        type: 'radial',
        angle: 0,
        origin: 'bottom left',
        stops: [
            { color: '#ff4e00', at: 0 },
            { color: '#ec9f05', at: 40 },
            { color: '#1a1a1a', at: 100 }
        ]
    }),
    builtin('deep_space', 'Deep space', 'midnight', {
        type: 'linear',
        angle: 200,
        stops: [
            { color: '#000000', at: 0 },
            { color: '#0d0221', at: 30 },
            { color: '#0d324d', at: 60 },
            { color: '#7a5195', at: 100 }
        ]
    }),
    builtin('mint', 'Mint', 'forest_green', {
        type: 'linear',
        angle: 120,
        stops: [
            { color: '#0b3d2e', at: 0 },
            { color: '#11998e', at: 50 },
            { color: '#38ef7d', at: 100 }
        ]
    }),
    builtin('nebula', 'Nebula', 'synthwave', {
        type: 'mesh',
        angle: 0,
        stops: [
            { color: '#ff6ec7', at: 0 },
            { color: '#7c4dff', at: 33 },
            { color: '#00e5ff', at: 66 },
            { color: '#0b0620', at: 100 }
        ]
    })
]

const BUILTIN_BY_ID = new Map(BUILTIN_LOOKS.map((look) => [look.id, look]))

export function isBuiltinLook(id: string): boolean {
    return BUILTIN_BY_ID.has(id)
}

export function builtinLook(id: string): Look | undefined {
    return BUILTIN_BY_ID.get(id)
}

/** A fresh look of the person's own, ready for the editor. */
export function newLook(partial: Partial<Look> = {}): Look {
    const now = Date.now()
    return {
        id: crypto.randomUUID(),
        name: 'New look',
        palette: { kind: 'colours', base: '#141a2e', accent: '#ffb36b' },
        backdrop: null,
        panels: { ...DEFAULT_PANELS },
        createdAt: now,
        updatedAt: now,
        ...partial
    }
}

/** A look's record with a new identity, for remixing a built-in or copying one's own. */
export function remixLook(source: Look, name: string): Look {
    const now = Date.now()
    return {
        ...structuredClone(source),
        id: crypto.randomUUID(),
        name,
        builtIn: undefined,
        remixedFrom: source.id,
        createdAt: now,
        updatedAt: now
    }
}
