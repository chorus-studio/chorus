/**
 * The playing cover's palette, for a look whose palette follows the music.
 *
 * The page (App.svelte) and the toolbar popup call `followPlayingCover` with
 * each cover the now-playing store reports. theming learns the cover at once
 * (a cover backdrop follows the picture), and its palette once node-vibrant
 * has read it; until then the palette already known stays on, so a track
 * change never flashes Spotify's colours. Palettes are cached by cover
 * address. `playingPalette` is a store the Theme tab's sketches read, so the
 * cards and the editor redraw when a palette lands.
 */
import { writable } from 'svelte/store'
import type { CSSVariable } from './theming'
import { setPlayingCover } from './theming'
import { imageSwatches } from './image-swatches'
import { paletteFromSwatches } from './look-palette'

type Palette = Record<CSSVariable, string>

const CACHE_MAX = 24
const cache = new Map<string, Promise<Palette | null>>()

/** The palette a cover gives; null when it has no colour, or could not be read (not cached, so a flaky load is retried). */
export function coverPalette(url: string): Promise<Palette | null> {
    const cached = cache.get(url)
    if (cached) return cached
    const loading = imageSwatches(url)
        .then(paletteFromSwatches)
        .catch((error) => {
            console.warn('[chorus] cover palette:', error)
            cache.delete(url)
            return null
        })
    cache.set(url, loading)
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string)
    return loading
}

export const playingPalette = writable<{ url: string | null; palette: Palette | null }>({
    url: null,
    palette: null
})

let current: string | null = null

/** Hand theming the playing cover, then its palette once read. A cover overtaken by the next is dropped. */
export async function followPlayingCover(url: string | null): Promise<void> {
    current = url
    setPlayingCover(url)
    if (!url) return
    const palette = await coverPalette(url)
    if (current !== url) return
    setPlayingCover(url, palette)
    playingPalette.set({ url, palette })
}
