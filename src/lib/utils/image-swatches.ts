/**
 * The colours in a picture the page may load (a cover, a wallpaper's
 * thumbnail), by population, read with node-vibrant off a 64 px copy. Kept
 * apart from theming so the background worker, which imports theming for the
 * palette names, never bundles node-vibrant.
 */
import { Vibrant } from 'node-vibrant/browser'
import type { Swatch } from './popup-palette'

function loadImage(url: string, element: HTMLImageElement): Promise<void> {
    return new Promise((resolve, reject) => {
        element.onload = () => resolve()
        element.onerror = reject
        element.crossOrigin = 'anonymous'
        element.src = url
    })
}

export async function imageSwatches(url: string): Promise<Swatch[]> {
    const image = new Image(64, 64)
    await loadImage(url, image)
    const palette = await new Vibrant(image).getPalette()
    return Object.values(palette)
        .filter((swatch) => swatch != null)
        .map((swatch) => ({ hex: swatch.hex, population: swatch.population }))
}
