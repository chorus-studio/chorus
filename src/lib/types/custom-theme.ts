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
    gradientPreview?: {
        config: GradientConfig
        stops: GradientStop[]
    }
    imageThumbnail?: string
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

// Built-in gradient theme presets
export const BUILTIN_GRADIENT_THEMES: GradientTheme[] = [
    {
        id: 'builtin-gradient-aurora',
        name: 'Aurora',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'linear',
            angle: 135,
            repeating: false
        },
        stops: [
            { id: 'aurora-1', color: '#0f0c29', position: 0 },
            { id: 'aurora-2', color: '#302b63', position: 50 },
            { id: 'aurora-3', color: '#24243e', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-sunset',
        name: 'Sunset Vibes',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'linear',
            angle: 180,
            repeating: false
        },
        stops: [
            { id: 'sunset-1', color: '#ff512f', position: 0 },
            { id: 'sunset-2', color: '#f09819', position: 50 },
            { id: 'sunset-3', color: '#dd2476', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-midnight',
        name: 'Midnight',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'radial',
            shape: 'ellipse',
            position: { x: 50, y: 0 },
            repeating: false
        },
        stops: [
            { id: 'midnight-1', color: '#232526', position: 0 },
            { id: 'midnight-2', color: '#414345', position: 50 },
            { id: 'midnight-3', color: '#0f0f0f', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-ocean-breeze',
        name: 'Ocean Breeze',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'linear',
            angle: 160,
            repeating: false
        },
        stops: [
            { id: 'ocean-1', color: '#0052d4', position: 0 },
            { id: 'ocean-2', color: '#4364f7', position: 50 },
            { id: 'ocean-3', color: '#6fb1fc', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-northern-lights',
        name: 'Northern Lights',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'conic',
            angle: 180,
            position: { x: 50, y: 100 },
            repeating: false
        },
        stops: [
            { id: 'northern-1', color: '#43cea2', position: 0 },
            { id: 'northern-2', color: '#185a9d', position: 50 },
            { id: 'northern-3', color: '#43cea2', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-royal-purple',
        name: 'Royal Purple',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'linear',
            angle: 225,
            repeating: false
        },
        stops: [
            { id: 'royal-1', color: '#141e30', position: 0 },
            { id: 'royal-2', color: '#5b247a', position: 50 },
            { id: 'royal-3', color: '#1a1a2e', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-neon-nights',
        name: 'Neon Nights',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'linear',
            angle: 45,
            repeating: false
        },
        stops: [
            { id: 'neon-1', color: '#0f0f0f', position: 0 },
            { id: 'neon-2', color: '#ff00ff', position: 25 },
            { id: 'neon-3', color: '#00ffff', position: 75 },
            { id: 'neon-4', color: '#0f0f0f', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-ember',
        name: 'Ember',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'radial',
            shape: 'circle',
            position: { x: 30, y: 70 },
            repeating: false
        },
        stops: [
            { id: 'ember-1', color: '#ff4e00', position: 0 },
            { id: 'ember-2', color: '#ec9f05', position: 40 },
            { id: 'ember-3', color: '#1a1a1a', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-deep-space',
        name: 'Deep Space',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'linear',
            angle: 200,
            repeating: false
        },
        stops: [
            { id: 'space-1', color: '#000000', position: 0 },
            { id: 'space-2', color: '#0d0221', position: 30 },
            { id: 'space-3', color: '#0d324d', position: 60 },
            { id: 'space-4', color: '#7a5195', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-mint-fresh',
        name: 'Mint Fresh',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'linear',
            angle: 120,
            repeating: false
        },
        stops: [
            { id: 'mint-1', color: '#0b3d2e', position: 0 },
            { id: 'mint-2', color: '#11998e', position: 50 },
            { id: 'mint-3', color: '#38ef7d', position: 100 }
        ]
    },
    // Conic gradients
    {
        id: 'builtin-gradient-color-wheel',
        name: 'Color Wheel',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'conic',
            angle: 0,
            position: { x: 50, y: 50 },
            repeating: false
        },
        stops: [
            { id: 'wheel-1', color: '#1a1a2e', position: 0 },
            { id: 'wheel-2', color: '#4a1942', position: 25 },
            { id: 'wheel-3', color: '#1a4a42', position: 50 },
            { id: 'wheel-4', color: '#2a3a5a', position: 75 },
            { id: 'wheel-5', color: '#1a1a2e', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-sunset-conic',
        name: 'Sunset Swirl',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'conic',
            angle: 270,
            position: { x: 100, y: 100 },
            repeating: false
        },
        stops: [
            { id: 'swirl-1', color: '#1a0a0a', position: 0 },
            { id: 'swirl-2', color: '#4a1a0a', position: 30 },
            { id: 'swirl-3', color: '#8a3a1a', position: 60 },
            { id: 'swirl-4', color: '#1a0a0a', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-vortex',
        name: 'Vortex',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'conic',
            angle: 45,
            position: { x: 25, y: 75 },
            repeating: false
        },
        stops: [
            { id: 'vortex-1', color: '#0a0a1a', position: 0 },
            { id: 'vortex-2', color: '#1a2a4a', position: 20 },
            { id: 'vortex-3', color: '#0a1a2a', position: 40 },
            { id: 'vortex-4', color: '#2a1a4a', position: 60 },
            { id: 'vortex-5', color: '#0a0a1a', position: 100 }
        ]
    },
    // Repeating gradients
    {
        id: 'builtin-gradient-candy-stripes',
        name: 'Candy Stripes',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'linear',
            angle: 45,
            repeating: true
        },
        stops: [
            { id: 'candy-1', color: '#1a0a1a', position: 0 },
            { id: 'candy-2', color: '#2a1a2a', position: 5 },
            { id: 'candy-3', color: '#1a0a1a', position: 10 }
        ]
    },
    {
        id: 'builtin-gradient-retro-waves',
        name: 'Retro Waves',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'linear',
            angle: 180,
            repeating: true
        },
        stops: [
            { id: 'retro-1', color: '#0a0a2a', position: 0 },
            { id: 'retro-2', color: '#1a1a4a', position: 3 },
            { id: 'retro-3', color: '#2a0a3a', position: 6 },
            { id: 'retro-4', color: '#0a0a2a', position: 9 }
        ]
    },
    {
        id: 'builtin-gradient-ripple',
        name: 'Ripple',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'radial',
            shape: 'circle',
            position: { x: 50, y: 50 },
            repeating: true
        },
        stops: [
            { id: 'ripple-1', color: '#0a1a2a', position: 0 },
            { id: 'ripple-2', color: '#1a2a3a', position: 5 },
            { id: 'ripple-3', color: '#0a1a2a', position: 10 }
        ]
    },
    // More radial shapes and positions
    {
        id: 'builtin-gradient-spotlight',
        name: 'Spotlight',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'radial',
            shape: 'circle',
            position: { x: 50, y: 0 },
            repeating: false
        },
        stops: [
            { id: 'spot-1', color: '#ffd700', position: 0 },
            { id: 'spot-2', color: '#b8860b', position: 20 },
            { id: 'spot-3', color: '#1a1a0a', position: 50 },
            { id: 'spot-4', color: '#0a0a0a', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-corner-glow',
        name: 'Corner Glow',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'radial',
            shape: 'ellipse',
            position: { x: 0, y: 100 },
            repeating: false
        },
        stops: [
            { id: 'corner-1', color: '#4a0080', position: 0 },
            { id: 'corner-2', color: '#2a0050', position: 30 },
            { id: 'corner-3', color: '#0a0020', position: 60 },
            { id: 'corner-4', color: '#050010', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-dual-radial',
        name: 'Nebula',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'radial',
            shape: 'ellipse',
            position: { x: 80, y: 20 },
            repeating: false
        },
        stops: [
            { id: 'nebula-1', color: '#ff6b6b', position: 0 },
            { id: 'nebula-2', color: '#4a1a3a', position: 25 },
            { id: 'nebula-3', color: '#1a1a4a', position: 50 },
            { id: 'nebula-4', color: '#0a0a1a', position: 100 }
        ]
    },
    // Different linear angles
    {
        id: 'builtin-gradient-diagonal-split',
        name: 'Diagonal Split',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'linear',
            angle: 315,
            repeating: false
        },
        stops: [
            { id: 'diag-1', color: '#1a0a2a', position: 0 },
            { id: 'diag-2', color: '#2a1a4a', position: 48 },
            { id: 'diag-3', color: '#0a2a1a', position: 52 },
            { id: 'diag-4', color: '#1a4a2a', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-horizon',
        name: 'Horizon',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'linear',
            angle: 0,
            repeating: false
        },
        stops: [
            { id: 'horizon-1', color: '#0a0a2a', position: 0 },
            { id: 'horizon-2', color: '#1a2a4a', position: 40 },
            { id: 'horizon-3', color: '#3a4a6a', position: 50 },
            { id: 'horizon-4', color: '#1a2a4a', position: 60 },
            { id: 'horizon-5', color: '#0a0a2a', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-blood-moon',
        name: 'Blood Moon',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'radial',
            shape: 'circle',
            position: { x: 70, y: 30 },
            repeating: false
        },
        stops: [
            { id: 'blood-1', color: '#8b0000', position: 0 },
            { id: 'blood-2', color: '#4a0000', position: 15 },
            { id: 'blood-3', color: '#1a0000', position: 35 },
            { id: 'blood-4', color: '#0a0000', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-forest-mist',
        name: 'Forest Mist',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'linear',
            angle: 170,
            repeating: false
        },
        stops: [
            { id: 'forest-1', color: '#0a1a0a', position: 0 },
            { id: 'forest-2', color: '#1a3a1a', position: 30 },
            { id: 'forest-3', color: '#2a4a2a', position: 50 },
            { id: 'forest-4', color: '#1a2a1a', position: 70 },
            { id: 'forest-5', color: '#0a1a0a', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-cyberpunk',
        name: 'Cyberpunk',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'linear',
            angle: 135,
            repeating: false
        },
        stops: [
            { id: 'cyber-1', color: '#0a0a0a', position: 0 },
            { id: 'cyber-2', color: '#1a0a2a', position: 25 },
            { id: 'cyber-3', color: '#ff0080', position: 50 },
            { id: 'cyber-4', color: '#00ffff', position: 75 },
            { id: 'cyber-5', color: '#0a0a0a', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-twilight',
        name: 'Twilight',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'linear',
            angle: 180,
            repeating: false
        },
        stops: [
            { id: 'twi-1', color: '#0a0a1a', position: 0 },
            { id: 'twi-2', color: '#1a1a3a', position: 20 },
            { id: 'twi-3', color: '#3a2a4a', position: 40 },
            { id: 'twi-4', color: '#5a3a4a', position: 60 },
            { id: 'twi-5', color: '#2a1a2a', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-ice-cave',
        name: 'Ice Cave',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'radial',
            shape: 'ellipse',
            position: { x: 50, y: 100 },
            repeating: false
        },
        stops: [
            { id: 'ice-1', color: '#e0ffff', position: 0 },
            { id: 'ice-2', color: '#87ceeb', position: 20 },
            { id: 'ice-3', color: '#4682b4', position: 40 },
            { id: 'ice-4', color: '#1a3a5a', position: 70 },
            { id: 'ice-5', color: '#0a1a2a', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-volcanic',
        name: 'Volcanic',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'conic',
            angle: 90,
            position: { x: 50, y: 80 },
            repeating: false
        },
        stops: [
            { id: 'volc-1', color: '#0a0a0a', position: 0 },
            { id: 'volc-2', color: '#4a0a0a', position: 25 },
            { id: 'volc-3', color: '#ff4500', position: 50 },
            { id: 'volc-4', color: '#4a0a0a', position: 75 },
            { id: 'volc-5', color: '#0a0a0a', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-galaxy',
        name: 'Galaxy',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'conic',
            angle: 0,
            position: { x: 50, y: 50 },
            repeating: false
        },
        stops: [
            { id: 'gal-1', color: '#0a0a1a', position: 0 },
            { id: 'gal-2', color: '#1a0a3a', position: 20 },
            { id: 'gal-3', color: '#0a1a2a', position: 40 },
            { id: 'gal-4', color: '#2a0a4a', position: 60 },
            { id: 'gal-5', color: '#0a0a1a', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-peacock',
        name: 'Peacock',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'linear',
            angle: 60,
            repeating: false
        },
        stops: [
            { id: 'peacock-1', color: '#0a2a2a', position: 0 },
            { id: 'peacock-2', color: '#006666', position: 25 },
            { id: 'peacock-3', color: '#008b8b', position: 50 },
            { id: 'peacock-4', color: '#004040', position: 75 },
            { id: 'peacock-5', color: '#0a1a1a', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-rose-gold',
        name: 'Rose Gold',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'linear',
            angle: 145,
            repeating: false
        },
        stops: [
            { id: 'rose-1', color: '#1a0a0a', position: 0 },
            { id: 'rose-2', color: '#4a2a2a', position: 30 },
            { id: 'rose-3', color: '#b76e79', position: 50 },
            { id: 'rose-4', color: '#4a2a2a', position: 70 },
            { id: 'rose-5', color: '#1a0a0a', position: 100 }
        ]
    },
    // Tie-dye and psychedelic themes
    {
        id: 'builtin-gradient-tie-dye-classic',
        name: 'Tie Dye Classic',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'conic',
            angle: 0,
            position: { x: 50, y: 50 },
            repeating: false
        },
        stops: [
            { id: 'tdc-1', color: '#ff1493', position: 0 },
            { id: 'tdc-2', color: '#ff8c00', position: 20 },
            { id: 'tdc-3', color: '#ffff00', position: 40 },
            { id: 'tdc-4', color: '#00ff00', position: 60 },
            { id: 'tdc-5', color: '#1e90ff', position: 80 }
        ]
    },
    {
        id: 'builtin-gradient-acid-spiral',
        name: 'Acid Spiral',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'conic',
            angle: 45,
            position: { x: 50, y: 50 },
            repeating: true
        },
        stops: [
            { id: 'acid-1', color: '#ff00ff', position: 0 },
            { id: 'acid-2', color: '#00ffff', position: 5 },
            { id: 'acid-3', color: '#ff00ff', position: 10 }
        ]
    },
    {
        id: 'builtin-gradient-psychedelic-sunset',
        name: 'Psychedelic Sunset',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'radial',
            shape: 'ellipse',
            position: { x: 50, y: 100 },
            repeating: false
        },
        stops: [
            { id: 'psy-1', color: '#ff1493', position: 0 },
            { id: 'psy-2', color: '#ff4500', position: 25 },
            { id: 'psy-3', color: '#9400d3', position: 50 },
            { id: 'psy-4', color: '#4b0082', position: 75 },
            { id: 'psy-5', color: '#0a0a1a', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-rainbow-swirl',
        name: 'Rainbow Swirl',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'conic',
            angle: 180,
            position: { x: 30, y: 70 },
            repeating: false
        },
        stops: [
            { id: 'rsw-1', color: '#ff0000', position: 0 },
            { id: 'rsw-2', color: '#ff7f00', position: 17 },
            { id: 'rsw-3', color: '#ffff00', position: 33 },
            { id: 'rsw-4', color: '#00ff00', position: 50 },
            { id: 'rsw-5', color: '#0000ff', position: 67 }
        ]
    },
    {
        id: 'builtin-gradient-liquid-dreams',
        name: 'Liquid Dreams',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'radial',
            shape: 'circle',
            position: { x: 25, y: 25 },
            repeating: true
        },
        stops: [
            { id: 'liq-1', color: '#8b00ff', position: 0 },
            { id: 'liq-2', color: '#ff1493', position: 8 },
            { id: 'liq-3', color: '#00ced1', position: 16 },
            { id: 'liq-4', color: '#8b00ff', position: 24 }
        ]
    },
    {
        id: 'builtin-gradient-neon-tie-dye',
        name: 'Neon Tie Dye',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'conic',
            angle: 90,
            position: { x: 60, y: 40 },
            repeating: false
        },
        stops: [
            { id: 'ntd-1', color: '#39ff14', position: 0 },
            { id: 'ntd-2', color: '#ff073a', position: 25 },
            { id: 'ntd-3', color: '#bc13fe', position: 50 },
            { id: 'ntd-4', color: '#04d9ff', position: 75 },
            { id: 'ntd-5', color: '#39ff14', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-kaleidoscope',
        name: 'Kaleidoscope',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'conic',
            angle: 0,
            position: { x: 50, y: 50 },
            repeating: true
        },
        stops: [
            { id: 'kal-1', color: '#ff6b6b', position: 0 },
            { id: 'kal-2', color: '#feca57', position: 3 },
            { id: 'kal-3', color: '#48dbfb', position: 6 },
            { id: 'kal-4', color: '#ff9ff3', position: 9 },
            { id: 'kal-5', color: '#ff6b6b', position: 12 }
        ]
    },
    {
        id: 'builtin-gradient-electric-kool-aid',
        name: 'Electric Kool-Aid',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'linear',
            angle: 45,
            repeating: true
        },
        stops: [
            { id: 'eka-1', color: '#ff00ff', position: 0 },
            { id: 'eka-2', color: '#00ff00', position: 4 },
            { id: 'eka-3', color: '#ffff00', position: 8 },
            { id: 'eka-4', color: '#00ffff', position: 12 },
            { id: 'eka-5', color: '#ff00ff', position: 16 }
        ]
    },
    {
        id: 'builtin-gradient-mushroom-vision',
        name: 'Mushroom Vision',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'radial',
            shape: 'ellipse',
            position: { x: 50, y: 50 },
            repeating: true
        },
        stops: [
            { id: 'mush-1', color: '#2a0a3a', position: 0 },
            { id: 'mush-2', color: '#6b2d5c', position: 5 },
            { id: 'mush-3', color: '#ff6b35', position: 10 },
            { id: 'mush-4', color: '#2a0a3a', position: 15 }
        ]
    },
    {
        id: 'builtin-gradient-groovy',
        name: 'Groovy',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'conic',
            angle: 270,
            position: { x: 75, y: 25 },
            repeating: false
        },
        stops: [
            { id: 'grv-1', color: '#ff6f61', position: 0 },
            { id: 'grv-2', color: '#ffb347', position: 20 },
            { id: 'grv-3', color: '#77dd77', position: 40 },
            { id: 'grv-4', color: '#89cff0', position: 60 },
            { id: 'grv-5', color: '#ca9bf7', position: 80 }
        ]
    },
    {
        id: 'builtin-gradient-trippy-tunnel',
        name: 'Trippy Tunnel',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'radial',
            shape: 'circle',
            position: { x: 50, y: 50 },
            repeating: true
        },
        stops: [
            { id: 'trip-1', color: '#0a0a1a', position: 0 },
            { id: 'trip-2', color: '#ff00ff', position: 3 },
            { id: 'trip-3', color: '#0a0a1a', position: 6 },
            { id: 'trip-4', color: '#00ffff', position: 9 },
            { id: 'trip-5', color: '#0a0a1a', position: 12 }
        ]
    },
    {
        id: 'builtin-gradient-cosmic-spiral',
        name: 'Cosmic Spiral',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'conic',
            angle: 135,
            position: { x: 40, y: 60 },
            repeating: true
        },
        stops: [
            { id: 'cos-1', color: '#4a0080', position: 0 },
            { id: 'cos-2', color: '#ff1493', position: 4 },
            { id: 'cos-3', color: '#00bfff', position: 8 },
            { id: 'cos-4', color: '#4a0080', position: 12 }
        ]
    },
    {
        id: 'builtin-gradient-flower-power',
        name: 'Flower Power',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'conic',
            angle: 0,
            position: { x: 50, y: 50 },
            repeating: false
        },
        stops: [
            { id: 'flw-1', color: '#ff69b4', position: 0 },
            { id: 'flw-2', color: '#ffa500', position: 25 },
            { id: 'flw-3', color: '#adff2f', position: 50 },
            { id: 'flw-4', color: '#40e0d0', position: 75 },
            { id: 'flw-5', color: '#ff69b4', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-lava-lamp',
        name: 'Lava Lamp',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'radial',
            shape: 'ellipse',
            position: { x: 50, y: 80 },
            repeating: false
        },
        stops: [
            { id: 'lava-1', color: '#ff4500', position: 0 },
            { id: 'lava-2', color: '#ff1493', position: 30 },
            { id: 'lava-3', color: '#8b008b', position: 60 },
            { id: 'lava-4', color: '#1a0a2a', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-woodstock',
        name: 'Woodstock',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'linear',
            angle: 135,
            repeating: false
        },
        stops: [
            { id: 'wood-1', color: '#ff6347', position: 0 },
            { id: 'wood-2', color: '#ffd700', position: 25 },
            { id: 'wood-3', color: '#32cd32', position: 50 },
            { id: 'wood-4', color: '#4169e1', position: 75 },
            { id: 'wood-5', color: '#9932cc', position: 100 }
        ]
    },
    {
        id: 'builtin-gradient-disco-ball',
        name: 'Disco Ball',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'conic',
            angle: 30,
            position: { x: 50, y: 50 },
            repeating: true
        },
        stops: [
            { id: 'disc-1', color: '#c0c0c0', position: 0 },
            { id: 'disc-2', color: '#ff00ff', position: 2 },
            { id: 'disc-3', color: '#c0c0c0', position: 4 },
            { id: 'disc-4', color: '#00ffff', position: 6 },
            { id: 'disc-5', color: '#c0c0c0', position: 8 }
        ]
    },
    {
        id: 'builtin-gradient-acid-rain',
        name: 'Acid Rain',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'linear',
            angle: 180,
            repeating: true
        },
        stops: [
            { id: 'acr-1', color: '#0a2a0a', position: 0 },
            { id: 'acr-2', color: '#39ff14', position: 2 },
            { id: 'acr-3', color: '#0a2a0a', position: 4 }
        ]
    },
    {
        id: 'builtin-gradient-oil-slick',
        name: 'Oil Slick',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'linear',
            angle: 160,
            repeating: false
        },
        stops: [
            { id: 'oil-1', color: '#0a0a0a', position: 0 },
            { id: 'oil-2', color: '#1a0a3a', position: 20 },
            { id: 'oil-3', color: '#003366', position: 40 },
            { id: 'oil-4', color: '#006633', position: 60 },
            { id: 'oil-5', color: '#660033', position: 80 }
        ]
    },
    {
        id: 'builtin-gradient-fractals',
        name: 'Fractals',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'radial',
            shape: 'circle',
            position: { x: 30, y: 30 },
            repeating: true
        },
        stops: [
            { id: 'frac-1', color: '#000033', position: 0 },
            { id: 'frac-2', color: '#660066', position: 3 },
            { id: 'frac-3', color: '#003366', position: 6 },
            { id: 'frac-4', color: '#006600', position: 9 },
            { id: 'frac-5', color: '#000033', position: 12 }
        ]
    },
    {
        id: 'builtin-gradient-plasma',
        name: 'Plasma',
        type: 'gradient',
        createdAt: 0,
        updatedAt: 0,
        hidden: false,
        config: {
            type: 'conic',
            angle: 60,
            position: { x: 70, y: 30 },
            repeating: true
        },
        stops: [
            { id: 'plas-1', color: '#ff00ff', position: 0 },
            { id: 'plas-2', color: '#0000ff', position: 5 },
            { id: 'plas-3', color: '#ff0000', position: 10 },
            { id: 'plas-4', color: '#ff00ff', position: 15 }
        ]
    }
]

// Helper to check if a theme ID is a built-in gradient
export function isBuiltinGradientId(id: string): boolean {
    return id.startsWith('builtin-gradient-')
}

// Get a built-in gradient theme by ID
export function getBuiltinGradientTheme(id: string): GradientTheme | undefined {
    return BUILTIN_GRADIENT_THEMES.find((t) => t.id === id)
}
