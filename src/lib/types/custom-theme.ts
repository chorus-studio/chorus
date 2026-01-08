import type { CSSVariable } from '$lib/utils/theming'

// Theme type discriminator
export type CustomThemeType = 'color' | 'image' | 'gradient'

// Mix blend modes for background images
export type MixBlendMode =
    | 'normal'
    | 'multiply'
    | 'screen'
    | 'overlay'
    | 'darken'
    | 'lighten'
    | 'color-dodge'
    | 'color-burn'
    | 'hard-light'
    | 'soft-light'
    | 'difference'
    | 'exclusion'
    | 'hue'
    | 'saturation'
    | 'color'
    | 'luminosity'

// Object fit options for background images
export type ObjectFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'

// Gradient types
export type GradientType = 'linear' | 'radial' | 'conic'

// Radial gradient shapes
export type RadialShape = 'circle' | 'ellipse'

// Base metadata for all custom themes
export interface CustomThemeBase {
    id: string
    name: string
    type: CustomThemeType
    createdAt: number
    updatedAt: number
    remixedFrom?: string
    hidden: boolean
}

// Color theme (like existing built-in themes)
export interface ColorTheme extends CustomThemeBase {
    type: 'color'
    colors: Record<CSSVariable, string>
}

// Image filter options
export interface ImageFilters {
    blur?: number
    brightness?: number
    contrast?: number
    saturate?: number
    grayscale?: number
}

// Background position
export interface Position {
    x: number
    y: number
}

// Background image options
export interface ImageOptions {
    objectFit: ObjectFit
    mixBlendMode: MixBlendMode
    opacity: number
    position: Position | string
    filters: ImageFilters
}

// Image source configuration
export interface ImageSource {
    source: 'url' | 'base64'
    data: string
    thumbnail?: string
}

// Text color overrides for image/gradient themes
export interface TextColors {
    text?: string
    subtext?: string
}

// Image theme
export interface ImageTheme extends CustomThemeBase {
    type: 'image'
    image: ImageSource
    options: ImageOptions
    textColors?: TextColors
}

// Gradient color stop
export interface GradientStop {
    id: string
    color: string
    position: number
}

// Gradient configuration
export interface GradientConfig {
    type: GradientType
    angle?: number
    position?: Position
    shape?: RadialShape
    repeating: boolean
}

// Gradient theme
export interface GradientTheme extends CustomThemeBase {
    type: 'gradient'
    stops: GradientStop[]
    config: GradientConfig
    textColors?: TextColors
}

// Union type for all custom themes
export type CustomTheme = ColorTheme | ImageTheme | GradientTheme

// Storage state for custom themes
export interface CustomThemesState {
    version: number
    themes: Record<string, CustomTheme>
    hiddenBuiltIn: string[]
    activeCustomThemeId: string | null
}

// Default state
export const DEFAULT_CUSTOM_THEMES_STATE: CustomThemesState = {
    version: 1,
    themes: {},
    hiddenBuiltIn: [],
    activeCustomThemeId: null
}

// Default image options
export const DEFAULT_IMAGE_OPTIONS: ImageOptions = {
    objectFit: 'cover',
    mixBlendMode: 'normal',
    opacity: 100,
    position: 'center',
    filters: {
        blur: 0,
        brightness: 100,
        contrast: 100,
        saturate: 100,
        grayscale: 0
    }
}

// Default gradient config
export const DEFAULT_GRADIENT_CONFIG: GradientConfig = {
    type: 'linear',
    angle: 180,
    repeating: false
}

// Type guards
export function isColorTheme(theme: CustomTheme): theme is ColorTheme {
    return theme.type === 'color'
}

export function isImageTheme(theme: CustomTheme): theme is ImageTheme {
    return theme.type === 'image'
}

export function isGradientTheme(theme: CustomTheme): theme is GradientTheme {
    return theme.type === 'gradient'
}

// Export/Import types
export interface ThemeExportData {
    version: number
    theme: Omit<CustomTheme, 'id' | 'createdAt' | 'updatedAt'>
    checksum: string
}

export interface ThemeImportResult {
    success: boolean
    theme?: CustomTheme
    error?: string
}

// Theme list item (unified for UI)
export interface ThemeListItem {
    id: string
    name: string
    isBuiltIn: boolean
    hidden: boolean
    type?: CustomThemeType
    previewColors?: {
        shadow?: string
        sidebar?: string
        text?: string
    }
}

// Available mix blend mode options
export const MIX_BLEND_MODES: MixBlendMode[] = [
    'normal',
    'multiply',
    'screen',
    'overlay',
    'darken',
    'lighten',
    'color-dodge',
    'color-burn',
    'hard-light',
    'soft-light',
    'difference',
    'exclusion',
    'hue',
    'saturation',
    'color',
    'luminosity'
]

// Available object fit options
export const OBJECT_FIT_OPTIONS: ObjectFit[] = ['cover', 'contain', 'fill', 'none', 'scale-down']

// Available gradient types
export const GRADIENT_TYPES: GradientType[] = ['linear', 'radial', 'conic']

// Position presets
export const POSITION_PRESETS = [
    { label: 'Center', value: 'center' },
    { label: 'Top', value: 'top' },
    { label: 'Bottom', value: 'bottom' },
    { label: 'Left', value: 'left' },
    { label: 'Right', value: 'right' },
    { label: 'Top Left', value: 'top left' },
    { label: 'Top Right', value: 'top right' },
    { label: 'Bottom Left', value: 'bottom left' },
    { label: 'Bottom Right', value: 'bottom right' }
] as const
