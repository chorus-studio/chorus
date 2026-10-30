/**
 * Paints the toolbar popup and the PiP player: node-vibrant reads the cover
 * art, popup-palette.ts turns the swatches into a palette for the current
 * appearance, and the result lands on the root as --bg / --text / --text-2 /
 * --album-accent. "Popup: Theme" in the Theme tab points those variables at
 * the rack tokens instead, and so does a cover with no colour to offer, so
 * the popup always matches either the record or the theme.
 */
import { Vibrant } from 'node-vibrant/browser'
import type { SettingsState } from '$lib/stores/settings'
import type { Mode } from '$lib/utils/theme-surfaces'
import { applyThemePopupPalette, resolveMode } from '$lib/utils/theming'
import {
    derivePopupPalette,
    hexToHsl,
    type PopupPalette,
    type Swatch
} from '$lib/utils/popup-palette'

export * from '$lib/utils/popup-palette'

const cache = new Map<string, { palette: PopupPalette | null; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000

function loadImage(url: string, element: HTMLImageElement): Promise<void> {
    return new Promise((resolve, reject) => {
        element.onload = () => resolve()
        element.onerror = reject
        element.crossOrigin = 'anonymous'
        element.src = url
    })
}

async function coverSwatches(url: string): Promise<Swatch[]> {
    const image = new Image(64, 64)
    await loadImage(url, image)
    const palette = await new Vibrant(image).getPalette()
    return Object.values(palette)
        .filter((swatch) => swatch != null)
        .map((swatch) => ({ hex: swatch.hex, population: swatch.population }))
}

/**
 * The cover's popup palette for the mode, null when it has no colour to wear.
 * A cover that cannot be read also yields null, uncached, so a flaky load is
 * retried on the next paint.
 */
export async function getColours({
    url,
    mode
}: {
    url: string
    mode: Mode
}): Promise<PopupPalette | null> {
    const key = `${mode}|${url}`
    const cached = cache.get(key)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) return cached.palette

    return new Promise<PopupPalette | null>((resolve) => {
        const run = async () => {
            try {
                const palette = derivePopupPalette(await coverSwatches(url), mode)
                cache.set(key, { palette, timestamp: Date.now() })
                resolve(palette)
            } catch (error) {
                console.error('[chorus] cover colours:', error)
                resolve(null)
            }
        }
        // Colour work waits for an idle moment so a track change in the page
        // (PiP) is not made jankier by it.
        if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 2000 })
        else setTimeout(run, 0)
    })
}

/** Push a palette onto the popup/PiP root as CSS variables. */
export function applyPalette(root: HTMLElement, palette: PopupPalette): PopupPalette {
    root.style.setProperty('--bg', palette.bg)
    root.style.setProperty('--text', palette.text)
    root.style.setProperty('--text-2', palette.text2)
    root.style.setProperty('--album-accent', palette.accent)
    // The accent as an HSL triplet too, for rack primitives that take hsl(var(--signal)).
    const [h, s, l] = hexToHsl(palette.accent)
    root.style.setProperty(
        '--album-accent-hsl',
        `${Math.round(h)} ${s.toFixed(1)}% ${l.toFixed(1)}%`
    )
    return palette
}

/** The settings that decide the popup's colours; repaint when it changes. */
export function popupLookKey(settings: SettingsState): string {
    return `${settings.theme?.popup}|${settings.theme?.appearance}`
}

const paints = new WeakMap<HTMLElement, number>()

/**
 * Paint `root` for the settings: the cover's palette in the current
 * appearance when "Popup: Album" has a colourful cover to work from, else the
 * rack tokens (the theme). A paint overtaken by a newer one for the same root
 * is dropped.
 */
export async function paintPopup(
    root: HTMLElement,
    settings: SettingsState,
    cover: string | null | undefined
): Promise<void> {
    const paint = (paints.get(root) ?? 0) + 1
    paints.set(root, paint)
    if (settings.theme?.popup === 'theme') {
        applyThemePopupPalette(root)
        return
    }
    const mode = resolveMode(settings.theme?.appearance)
    const palette = cover ? await getColours({ url: cover, mode }) : null
    if (paints.get(root) !== paint) return
    if (palette) applyPalette(root, palette)
    else applyThemePopupPalette(root)
}
