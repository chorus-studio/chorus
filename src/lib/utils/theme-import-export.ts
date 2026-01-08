import type { CustomTheme, ThemeExportData, ThemeImportResult } from '$lib/types/custom-theme'
import { customThemesStore } from '$lib/stores/custom-themes'

const EXPORT_VERSION = 1
const MAGIC_PREFIX = 'CHORUS_THEME:'

/**
 * Calculate a simple checksum for validation
 */
function calculateChecksum(data: string): string {
    let hash = 0
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36)
}

/**
 * Export a theme to a shareable base64 code
 */
export function exportTheme(theme: CustomTheme): string {
    // Prepare export data (exclude runtime-only properties)
    const exportTheme: Omit<CustomTheme, 'id' | 'createdAt' | 'updatedAt'> = {
        name: theme.name,
        type: theme.type,
        hidden: false, // Don't export hidden state
        remixedFrom: theme.remixedFrom
    } as Omit<CustomTheme, 'id' | 'createdAt' | 'updatedAt'>

    // Add type-specific properties
    if (theme.type === 'color') {
        ;(exportTheme as any).colors = (theme as any).colors
    } else if (theme.type === 'image') {
        ;(exportTheme as any).image = (theme as any).image
        ;(exportTheme as any).options = (theme as any).options
        ;(exportTheme as any).textColors = (theme as any).textColors
    } else if (theme.type === 'gradient') {
        ;(exportTheme as any).stops = (theme as any).stops
        ;(exportTheme as any).config = (theme as any).config
        ;(exportTheme as any).textColors = (theme as any).textColors
    }

    const exportData: ThemeExportData = {
        version: EXPORT_VERSION,
        theme: exportTheme,
        checksum: ''
    }

    // Calculate checksum before encoding (without the checksum field)
    const jsonWithoutChecksum = JSON.stringify({ ...exportData, checksum: '' })
    exportData.checksum = calculateChecksum(jsonWithoutChecksum)

    // Encode to base64
    const jsonString = JSON.stringify(exportData)
    const base64 = btoa(unescape(encodeURIComponent(jsonString)))

    return MAGIC_PREFIX + base64
}

/**
 * Parse and validate an import code
 */
export function parseImportCode(code: string): {
    success: boolean
    data?: ThemeExportData
    error?: string
} {
    try {
        // Validate prefix
        if (!code.startsWith(MAGIC_PREFIX)) {
            return { success: false, error: 'Invalid theme code format' }
        }

        // Decode base64
        const base64 = code.slice(MAGIC_PREFIX.length)
        const jsonString = decodeURIComponent(escape(atob(base64)))
        const exportData: ThemeExportData = JSON.parse(jsonString)

        // Validate version
        if (exportData.version > EXPORT_VERSION) {
            return {
                success: false,
                error: 'Theme was created with a newer version. Please update your extension.'
            }
        }

        // Validate checksum
        const dataForChecksum = JSON.stringify({ ...exportData, checksum: '' })
        const expectedChecksum = calculateChecksum(dataForChecksum)
        if (exportData.checksum !== expectedChecksum) {
            return { success: false, error: 'Theme data is corrupted or tampered with' }
        }

        // Validate required fields
        if (!exportData.theme.name || !exportData.theme.type) {
            return { success: false, error: 'Invalid theme data structure' }
        }

        // Validate theme type
        if (!['color', 'image', 'gradient'].includes(exportData.theme.type)) {
            return { success: false, error: 'Unknown theme type' }
        }

        // Validate image size if present
        if (exportData.theme.type === 'image') {
            const imageTheme = exportData.theme as any
            if (imageTheme.image?.source === 'base64' && imageTheme.image?.data) {
                const sizeInBytes = (imageTheme.image.data.length * 3) / 4
                const maxSize = 5 * 1024 * 1024 // 5MB limit
                if (sizeInBytes > maxSize) {
                    return {
                        success: false,
                        error: 'Image exceeds maximum size of 5MB'
                    }
                }
            }
        }

        return { success: true, data: exportData }
    } catch (e) {
        return { success: false, error: 'Failed to parse theme code' }
    }
}

/**
 * Import a theme from a shareable code
 */
export async function importTheme(code: string): Promise<ThemeImportResult> {
    const parseResult = parseImportCode(code)

    if (!parseResult.success || !parseResult.data) {
        return { success: false, error: parseResult.error }
    }

    const exportData = parseResult.data

    // Generate a unique name if needed
    let newName = exportData.theme.name
    let counter = 1
    while (!customThemesStore.isNameUnique(newName)) {
        newName = `${exportData.theme.name} (${counter++})`
    }

    // Create the theme with new ID and timestamps
    const themeToCreate = {
        ...exportData.theme,
        name: newName,
        hidden: false
    }

    const result = await customThemesStore.createTheme(themeToCreate as any)

    if (result.success && result.theme) {
        return { success: true, theme: result.theme }
    }

    return { success: false, error: result.error || 'Failed to create theme' }
}

/**
 * Preview an import without saving
 */
export function previewImport(code: string): {
    success: boolean
    theme?: Omit<CustomTheme, 'id' | 'createdAt' | 'updatedAt'>
    error?: string
    nameConflict?: boolean
} {
    const parseResult = parseImportCode(code)

    if (!parseResult.success || !parseResult.data) {
        return { success: false, error: parseResult.error }
    }

    const nameConflict = !customThemesStore.isNameUnique(parseResult.data.theme.name)

    return {
        success: true,
        theme: parseResult.data.theme,
        nameConflict
    }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch (e) {
        // Fallback for older browsers
        try {
            const textarea = document.createElement('textarea')
            textarea.value = text
            textarea.style.position = 'fixed'
            textarea.style.opacity = '0'
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand('copy')
            document.body.removeChild(textarea)
            return true
        } catch {
            return false
        }
    }
}
