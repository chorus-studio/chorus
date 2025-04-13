import { Vibrant } from 'node-vibrant/browser'
import { nowPlaying } from '$lib/stores/now-playing'
import type { ThemeVibrancy } from '$lib/stores/settings'

let text_colour: string | null = '#1bd954'
let bg_colour: string | null = '#0a0a0a'

function isLight(hex: string): boolean {
    const [r, g, b] = hexToRgb(hex).map(Number)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 128
}

function hexToRgb(hex: string): [number, number, number] {
    const bigint = parseInt(hex.replace('#', ''), 16)
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255
    return [r, g, b]
}

function rgbToHex([r, g, b]: [number, number, number]): string {
    const rgb = (r << 16) | (g << 8) | (b << 0)
    return `#${(0x1_00_00_00 + rgb).toString(16).slice(1)}`
}

function lightenDarkenColor(h: string, p: number): string {
    return (
        '#' +
        [1, 3, 5]
            .map((s) => parseInt(h.substring(s, s + 2), 16))
            .map((c) => Math.round((c * (100 + p)) / 100))
            .map((c) => (c < 255 ? c : 255))
            .map((c) => c.toString(16).padStart(2, '0'))
            .join('')
    )
}

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
    ;(r /= 255), (g /= 255), (b /= 255)
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2
    if (max == min) {
        h = s = 0 // achromatic
    } else {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0)
                break
            case g:
                h = (b - r) / d + 2
                break
            case b:
                h = (r - g) / d + 4
                break
        }
        h /= 6
    }
    return [h, s, l]
}

function hslToRgb([h, s, l]: [number, number, number]): [number, number, number] {
    let r
    let g
    let b
    if (s == 0) {
        r = g = b = l // achromatic
    } else {
        function hue2rgb(p: number, q: number, t: number) {
            if (t < 0) t++
            if (t > 1) t--
            if (t < 1 / 6) return p + (q - p) * 6 * t
            if (t < 1 / 2) return q
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
            return p
        }
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s
        const p = 2 * l - q
        r = hue2rgb(p, q, h + 1 / 3)
        g = hue2rgb(p, q, h)
        b = hue2rgb(p, q, h - 1 / 3)
    }
    return [r * 255, g * 255, b * 255]
}

function setLightness(hex: string, lightness: number) {
    const hsl = rgbToHsl(hexToRgb(hex))
    hsl[2] = lightness
    return rgbToHex(hslToRgb(hsl))
}

async function getVibrant({
    image,
    vibrancy
}: {
    image: HTMLImageElement
    vibrancy: ThemeVibrancy
}) {
    try {
        if (vibrancy == 'Auto') {
            const variants = isLight(text_colour ?? '#1bd954')
                ? ['Vibrant', 'DarkVibrant', 'Muted', 'LightVibrant']
                : ['Vibrant', 'LightVibrant', 'Muted', 'DarkVibrant']
            const palettes = await new Vibrant(image).getPalettes()

            for (const variant of variants) {
                if (palettes.default.hasOwnProperty(variant) && palettes.default[variant]) {
                    text_colour = palettes.default[variant]!.hex
                    bg_colour = palettes.default[variant]!.bodyTextColor
                    break
                }
            }
            return { text_colour, bg_colour }
        }

        const palette = await new Vibrant(image).getPalette()
        return { text_colour: palette[vibrancy]!.hex, bg_colour: palette[vibrancy]!.bodyTextColor }
    } catch (err) {
        console.error(err)
        return { text_colour, bg_colour }
    }
}

function loadImage(url: string, element: HTMLImageElement): Promise<void> {
    return new Promise((resolve, reject) => {
        element.onload = () => resolve()
        element.onerror = reject
        element.src = url
        element.crossOrigin = 'anonymous'
    })
}

async function getColours({ url, vibrancy }: { url: string; vibrancy: ThemeVibrancy }) {
    let img: HTMLImageElement | null = new Image(64, 64)
    await loadImage(url, img)

    const { text_colour, bg_colour } = await getVibrant({ image: img, vibrancy })
    await nowPlaying.updateState({ text_colour, bg_colour })
    img = null
}

export {
    getColours,
    getVibrant,
    isLight,
    setLightness,
    hexToRgb,
    rgbToHex,
    rgbToHsl,
    hslToRgb,
    lightenDarkenColor
}
