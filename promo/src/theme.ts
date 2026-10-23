import { loadFont as loadInter } from '@remotion/google-fonts/Inter'
import { loadFont as loadGrotesk } from '@remotion/google-fonts/SpaceGrotesk'
import { loadFont as loadMono } from '@remotion/google-fonts/SpaceMono'

const inter = loadInter('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin'] })
const grotesk = loadGrotesk('normal', { weights: ['700'], subsets: ['latin'] })
const mono = loadMono('normal', { weights: ['400', '700'], subsets: ['latin'] })

export const FONT = {
    ui: `${inter.fontFamily}, system-ui, sans-serif`,
    display: `${grotesk.fontFamily}, ${inter.fontFamily}, sans-serif`,
    mono: `${mono.fontFamily}, ui-monospace, monospace`
}

export const C = {
    bg: '#0b0b0b',
    ground: '#121212',
    panel: '#181818',
    raised: '#1f1f1f',
    soft: '#2a2a2a',
    well: '#0a0a0a',
    line: 'rgba(255,255,255,.08)',
    border: 'rgba(255,255,255,.14)',
    text: '#ffffff',
    textDim: '#dcdcdc',
    muted: '#b3b3b3',
    dim: '#7f7f7f',
    green: '#1ed760',
    green2: '#1fdf64',
    alarm: '#f15e6c',
    amber: '#ffa42b',
    teal: '#1b6b63',
    tealText: '#eafff9'
}
