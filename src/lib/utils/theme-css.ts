import type {
    ImageFilters,
    ImageTheme,
    GradientTheme,
    GradientConfig,
    GradientStop,
    Position
} from '$lib/types/custom-theme'

/**
 * Generate CSS filter string from filter options
 */
export function generateFilterCSS(filters: ImageFilters): string {
    const parts: string[] = []

    if (filters.blur !== undefined && filters.blur > 0) {
        parts.push(`blur(${filters.blur}px)`)
    }
    if (filters.brightness !== undefined && filters.brightness !== 100) {
        parts.push(`brightness(${filters.brightness}%)`)
    }
    if (filters.contrast !== undefined && filters.contrast !== 100) {
        parts.push(`contrast(${filters.contrast}%)`)
    }
    if (filters.saturate !== undefined && filters.saturate !== 100) {
        parts.push(`saturate(${filters.saturate}%)`)
    }
    if (filters.grayscale !== undefined && filters.grayscale > 0) {
        parts.push(`grayscale(${filters.grayscale}%)`)
    }

    return parts.length > 0 ? parts.join(' ') : 'none'
}

/**
 * Format position for CSS
 */
function formatPosition(position: Position | string): string {
    if (typeof position === 'string') {
        return position
    }
    return `${position.x}% ${position.y}%`
}

/**
 * Generate gradient CSS from config and stops
 */
export function generateGradientCSS(config: GradientConfig, stops: GradientStop[]): string {
    // Sort stops by position
    const sortedStops = [...stops].sort((a, b) => a.position - b.position)

    // Generate color stops string
    const stopsCSS = sortedStops.map((stop) => `${stop.color} ${stop.position}%`).join(', ')

    const repeating = config.repeating ? 'repeating-' : ''

    switch (config.type) {
        case 'linear': {
            const angle = config.angle ?? 180
            return `${repeating}linear-gradient(${angle}deg, ${stopsCSS})`
        }
        case 'radial': {
            const shape = config.shape ?? 'ellipse'
            const position = config.position ? formatPosition(config.position) : 'center'
            return `${repeating}radial-gradient(${shape} at ${position}, ${stopsCSS})`
        }
        case 'conic': {
            const angle = config.angle ?? 0
            const position = config.position ? formatPosition(config.position) : 'center'
            return `${repeating}conic-gradient(from ${angle}deg at ${position}, ${stopsCSS})`
        }
        default:
            return `linear-gradient(180deg, ${stopsCSS})`
    }
}

/**
 * Generate background image CSS styles for image themes
 */
export function generateImageBackgroundCSS(theme: ImageTheme): string {
    const { image, options } = theme

    // Generate image URL
    const imageUrl =
        image.source === 'base64' ? `url(data:image/png;base64,${image.data})` : `url(${image.data})`

    // Generate filter
    const filterValue = generateFilterCSS(options.filters)

    // Generate position
    const positionValue = formatPosition(options.position)

    // Build CSS properties
    const cssLines = [
        `background-image: ${imageUrl}`,
        `background-size: ${options.objectFit === 'cover' || options.objectFit === 'contain' ? options.objectFit : '100% 100%'}`,
        `background-position: ${positionValue}`,
        `background-repeat: no-repeat`,
        `opacity: ${options.opacity / 100}`,
        `mix-blend-mode: ${options.mixBlendMode}`
    ]

    if (filterValue !== 'none') {
        cssLines.push(`filter: ${filterValue}`)
    }

    return cssLines.join(';\n    ')
}

/**
 * Generate gradient background CSS for gradient themes
 */
export function generateGradientBackgroundCSS(theme: GradientTheme): string {
    const gradientCSS = generateGradientCSS(theme.config, theme.stops)
    return `background: ${gradientCSS}`
}

/**
 * Generate UI element background CSS for image/gradient themes
 * Only applies backgrounds to elements that absolutely need them for readability (tooltips, menus)
 * Uses CSS variables for everything else to keep background visible
 */
function generateUIBackgroundCSS(): string {
    return `
/* Menus and popovers - need solid background for readability */
.SboKmDrCTZng7t4EgNoM,
.k4sYYpEpX2f7RMAPHv3F,
.NbcaczStd8vD2rHWwaKv,
.wlb3dYO07PZuYfmNfmkS,
.LJej9EszIMJShPMMExpj {
    background-color: rgba(20, 20, 20, 0.9) !important;
}

/* Tooltips - need solid background */
[data-tippy-root] .tippy-box,
[role="tooltip"],
.Tippy__transition-container,
.eKcLjnIANRB8fWqSMNv_,
.z7B_YJImD6MLB4OkOnk6 {
    background-color: rgba(20, 20, 20, 0.9) !important;
}

/* Context menus */
.encore-dark-theme [data-encore-id="popover"],
.VNuHhGlPD7kJyHrqptKX {
    background-color: rgba(20, 20, 20, 0.9) !important;
}

/* Album/artist info popup on hover */
.bnlZ3qtshEXCqAz7FFPx,
.Nv3tJVZ5qd0rbyVG3V7s {
    background-color: rgba(20, 20, 20, 0.85) !important;
}
`
}

/**
 * Generate complete CSS for a custom theme background (image or gradient)
 * This targets the main Spotify content areas
 */
export function generateCustomThemeBackgroundCSS(theme: ImageTheme | GradientTheme): string {
    const selector = `.Root__main-view, .main-view-container`
    const uiCSS = generateUIBackgroundCSS()

    if (theme.type === 'image') {
        const bgCSS = generateImageBackgroundCSS(theme)
        return `
${selector}::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: -1;
    ${bgCSS};
    pointer-events: none;
}
${uiCSS}
`.trim()
    } else {
        const bgCSS = generateGradientBackgroundCSS(theme)
        return `
${selector} {
    ${bgCSS} !important;
}
${uiCSS}
`.trim()
    }
}

/**
 * Generate CSS variables for text color overrides
 */
export function generateTextColorOverridesCSS(textColors?: {
    text?: string
    subtext?: string
}): string {
    if (!textColors) return ''

    const lines: string[] = []

    if (textColors.text) {
        lines.push(`--chorus-text: ${textColors.text}`)
    }
    if (textColors.subtext) {
        lines.push(`--chorus-subtext: ${textColors.subtext}`)
    }

    if (lines.length === 0) return ''

    return `:root {
    ${lines.join(';\n    ')};
}`
}

/**
 * Helper to convert hex to rgba
 */
export function hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return hex

    const r = parseInt(result[1], 16)
    const g = parseInt(result[2], 16)
    const b = parseInt(result[3], 16)

    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Helper to darken a hex color
 */
export function darkenColor(hex: string, percent: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return hex

    const r = Math.max(0, Math.floor(parseInt(result[1], 16) * (1 - percent / 100)))
    const g = Math.max(0, Math.floor(parseInt(result[2], 16) * (1 - percent / 100)))
    const b = Math.max(0, Math.floor(parseInt(result[3], 16) * (1 - percent / 100)))

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Helper to lighten a hex color
 */
export function lightenColor(hex: string, percent: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return hex

    const r = Math.min(255, Math.floor(parseInt(result[1], 16) + (255 - parseInt(result[1], 16)) * (percent / 100)))
    const g = Math.min(255, Math.floor(parseInt(result[2], 16) + (255 - parseInt(result[2], 16)) * (percent / 100)))
    const b = Math.min(255, Math.floor(parseInt(result[3], 16) + (255 - parseInt(result[3], 16)) * (percent / 100)))

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Generate default gradient stops
 */
export function createDefaultGradientStops(): GradientStop[] {
    return [
        { id: crypto.randomUUID(), color: '#1a1a2e', position: 0 },
        { id: crypto.randomUUID(), color: '#16213e', position: 50 },
        { id: crypto.randomUUID(), color: '#0f3460', position: 100 }
    ]
}

/**
 * Add a new gradient stop
 */
export function addGradientStop(stops: GradientStop[]): GradientStop[] {
    if (stops.length >= 5) return stops

    // Find a position between existing stops
    const sortedStops = [...stops].sort((a, b) => a.position - b.position)
    let newPosition = 50
    let newColor = '#808080'

    if (sortedStops.length >= 2) {
        // Find the largest gap
        let maxGap = 0
        let gapStart = 0
        let gapEnd = 100

        for (let i = 0; i < sortedStops.length - 1; i++) {
            const gap = sortedStops[i + 1].position - sortedStops[i].position
            if (gap > maxGap) {
                maxGap = gap
                gapStart = sortedStops[i].position
                gapEnd = sortedStops[i + 1].position
            }
        }

        newPosition = Math.round((gapStart + gapEnd) / 2)

        // Interpolate color
        const startStop = sortedStops.find((s) => s.position === gapStart)
        const endStop = sortedStops.find((s) => s.position === gapEnd)
        if (startStop && endStop) {
            newColor = interpolateColor(startStop.color, endStop.color, 0.5)
        }
    }

    return [
        ...stops,
        {
            id: crypto.randomUUID(),
            color: newColor,
            position: newPosition
        }
    ]
}

/**
 * Interpolate between two hex colors
 */
function interpolateColor(color1: string, color2: string, factor: number): string {
    const result1 = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color1)
    const result2 = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color2)

    if (!result1 || !result2) return color1

    const r = Math.round(parseInt(result1[1], 16) + (parseInt(result2[1], 16) - parseInt(result1[1], 16)) * factor)
    const g = Math.round(parseInt(result1[2], 16) + (parseInt(result2[2], 16) - parseInt(result1[2], 16)) * factor)
    const b = Math.round(parseInt(result1[3], 16) + (parseInt(result2[3], 16) - parseInt(result1[3], 16)) * factor)

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
