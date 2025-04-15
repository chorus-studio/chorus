import { get } from 'svelte/store'
import { storage } from '@wxt-dev/storage'
import { nowPlaying, type NowPlaying } from '$lib/stores/now-playing'
import { hexToRgb, isLight, lightenDarkenColor, setLightness } from './vibrant-colors'

const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
toggleDark(systemDark)

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    toggleDark(e.matches)
})

export function setRootColour(name: string, colHex: string) {
    const root = document.documentElement
    if (root === null) return
    root.style.setProperty(`--chorus-${name}`, colHex)
    root.style.setProperty(`--chorus-rgb-${name}`, hexToRgb(colHex).join(','))
}

async function toggleDark(setDark?: boolean) {
    const state = await storage.getItem<NowPlaying>('local:chorus_now_playing')
    let textColorBg =
        state?.bg_colour ??
        getComputedStyle(document.documentElement).getPropertyValue('--chorus-main')

    if (setDark === undefined) setDark = false //isLight(textColorBg)

    document.documentElement.style.setProperty('--is_light', `${setDark ? 0 : 1}`)
    textColorBg = setDark ? '#0A0A0A' : '#FAFAFA'

    setRootColour('main', textColorBg)
    setRootColour('sidebar', textColorBg)
    setRootColour('player', textColorBg)
    setRootColour('shadow', textColorBg)
    setRootColour('card', setDark ? '#040404' : '#ECECEC')
    setRootColour('subtext', setDark ? '#EAEAEA' : '#3D3D3D')
    setRootColour('selected-row', setDark ? '#EAEAEA' : '#3D3D3D')
    setRootColour('main-elevated', setDark ? '#303030' : '#DDDDDD')
    setRootColour('notification', setDark ? '#303030' : '#DDDDDD')
    setRootColour('highlight-elevated', setDark ? '#303030' : '#DDDDDD')

    updateColours()
}

export function updateColours() {
    let { text_colour, bg_colour } = get(nowPlaying)

    const isLightBg = isLight(bg_colour!)
    text_colour = isLightBg
        ? lightenDarkenColor(text_colour!, -15) // vibrant color is always too bright for white bg mode
        : setLightness(text_colour!, 0.45)

    const darkColHex = lightenDarkenColor(text_colour, isLightBg ? 12 : -20)
    const darkerColHex = lightenDarkenColor(text_colour, isLightBg ? 30 : -40)
    const softHighlightHex = setLightness(text_colour, isLightBg ? 0.9 : 0.14)

    setRootColour('text', text_colour)
    setRootColour('button', darkerColHex)
    setRootColour('button-active', darkColHex)
    setRootColour('tab-active', softHighlightHex)
    setRootColour('button-disabled', softHighlightHex)

    const softerHighlightHex = setLightness(text_colour, isLightBg ? 0.9 : 0.1)
    setRootColour('highlight', softerHighlightHex)

    // compute hue rotation to change spotify green to main color
    const rgb = hexToRgb(text_colour)
    const m = `url('data:image/svg+xml;utf8,
      <svg xmlns="http://www.w3.org/2000/svg">
        <filter id="recolor" color-interpolation-filters="sRGB">
          <feColorMatrix type="matrix" values="
            0 0 0 0 ${rgb[0] / 255}
            0 0 0 0 ${rgb[1] / 255}
            0 0 0 0 ${rgb[2] / 255}
            0 0 0 1 0
          "/>
        </filter>
      </svg>
      #recolor')`
    document.documentElement.style.setProperty('--colourmatrix', encodeURI(m))
}

export function removeTheme() {
    const themeLink = document.getElementById('chorus-dynamic-theme')
    if (themeLink) {
        document.head.removeChild(themeLink)
    }
}

export function injectTheme() {
    if (document.getElementById('chorus-dynamic-theme')) return

    const style = document.createElement('link')
    style.id = 'chorus-dynamic-theme'
    style.rel = 'stylesheet'
    style.href = chrome.runtime.getURL('/content-scripts/dynamic-theme.css')
    document.head.appendChild(style)
}
