/**
 * Finds Spotify's page panels so a backdrop can show through them.
 *
 * The web player lays its regions out on one CSS grid (top bar, library,
 * main view, right sidebar, player bar) with named areas, but the class
 * names on those regions are hashed per build, so nothing in theme.css can
 * name them. This module reads each grid child's computed `grid-area` and
 * tags the region `data-chorus-area="main-view"` and so on; theme.css takes
 * it from there. Two more tags make the translucency work:
 *
 * - `data-chorus-frame` on the grid container and its ancestors up to <body>
 *   (and on the player bar's bleeding wrapper), which paint the frame colour
 *   over the whole page and have to go transparent for the backdrop to show.
 * - `data-chorus-panel` on the one element that paints each panel, and
 *   `data-chorus-panel-layer` on any element under it that covers the panel
 *   (as wide as it, and at least as tall: the main view's scroll content runs
 *   far past the box on an artist or album page) and paints the same surface
 *   again (Spotify stacks a few), and on any sizeable element under it that
 *   paints one of the panel colours without covering the box: the library's
 *   list below its header, the Queue, the Now playing view inside its cell.
 *   The panel takes the translucent colour; the layers go transparent; a
 *   sticky header and anything small keeps its own opaque colour.
 *
 * The grid also holds overlays placed on the same areas (toasts, onboarding,
 * the cinema view), so each area name is claimed once, by the first child
 * that is (or holds) a painted panel; the bars are recognised by their test
 * ids. Spotify re-renders these regions on navigation, so the tags are
 * re-applied on a debounced mutation observer while a backdrop is on, and
 * removed when it goes.
 */

export const AREA_ATTR = 'data-chorus-area'
export const PANEL_ATTR = 'data-chorus-panel'
export const LAYER_ATTR = 'data-chorus-panel-layer'
export const FRAME_ATTR = 'data-chorus-frame'

const NAV_BAR = '[data-testid="global-nav-bar"]'
const PLAYER_BAR = '[data-testid="now-playing-bar"]'
/** Areas whose panel is found by walking down from the grid child; the bars are painted by their own selectors. */
const WALKED_AREAS = new Set(['left-sidebar', 'main-view', 'right-sidebar'])
const WALK_DEPTH_MAX = 10
/**
 * How much narrower or shorter than its area's box a child may be and still
 * count as covering it: a scrollbar gutter, an inset panel's margins (the
 * right sidebar's Now playing view sits a few px in from its grid cell).
 */
const COVER_SLACK = 24
/** The most elements one pass looks at under an area, so a huge tree stays cheap. */
const WALK_NODES_MAX = 80
/** The colour pass: how deep and how many elements under an area it checks. */
const PAINT_DEPTH_MAX = 8
const PAINT_NODES_MAX = 400
/** An element painted in a panel colour counts when it spans this much of the area's width and is at least this tall. */
const PAINT_MIN_WIDTH_SHARE = 0.4
const PAINT_MIN_HEIGHT = 48
/** The palette variables theming writes as plain hex, which panels paint in. */
const PANEL_COLOUR_VARS = ['--chorus-main', '--chorus-sidebar', '--chorus-player']
/** Tints theme.css builds with color-mix(); a probe element resolves them to rgb. */
const PANEL_TINT_VARS = ['--chorus-hero', '--chorus-hero-top']
const PROBE_ID = 'chorus-colour-probe'
const DEBOUNCE_MS = 120

let observer: MutationObserver | null = null
let bodyObserver: MutationObserver | null = null
let timer: ReturnType<typeof setTimeout> | null = null
let tagged: Set<Element> = new Set()
let onResize: (() => void) | null = null

function gridContainer(): HTMLElement | null {
    const nav = document.querySelector<HTMLElement>(NAV_BAR)
    let el: HTMLElement | null = nav?.parentElement ?? null
    while (el && el !== document.body) {
        if (getComputedStyle(el).display === 'grid') return el
        el = el.parentElement
    }
    return null
}

/**
 * Which region a grid child is. The bars are known by their test ids (the
 * top bar's placement starts at the banner line above its own area); the
 * rest by the first named line of their area, e.g. `main-view`; null for a
 * numbered placement.
 */
function areaOf(el: HTMLElement): string | null {
    if (el.matches(NAV_BAR) || el.querySelector(NAV_BAR)) return 'global-nav'
    if (el.matches(PLAYER_BAR) || el.querySelector(PLAYER_BAR)) return 'now-playing-bar'
    const start = getComputedStyle(el).gridRowStart
    return /^[a-z][a-z-]*$/.test(start) ? start : null
}

/** `#rrggbb` as `rgb(r, g, b)`, the form computed styles use. */
function rgbString(hex: string): string | null {
    const h = hex.trim().replace('#', '')
    const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h
    if (!/^[0-9a-f]{6}$/i.test(full)) return null
    const n = parseInt(full, 16)
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

/** A hidden element that resolves a colour expression (a color-mix()) to the rgb computed styles report. */
function probeColour(expression: string): string {
    let probe = document.getElementById(PROBE_ID)
    if (!probe) {
        probe = document.createElement('span')
        probe.id = PROBE_ID
        probe.setAttribute('aria-hidden', 'true')
        probe.style.cssText =
            'position:fixed;left:-9999px;top:0;width:0;height:0;pointer-events:none;visibility:hidden'
        document.documentElement.appendChild(probe)
    }
    probe.style.backgroundColor = expression
    return getComputedStyle(probe).backgroundColor
}

/** The opaque colours a panel paints in under the current palette, resolved once per pass. */
function panelColours(): Set<string> {
    const root = document.documentElement
    const colours = new Set<string>()
    for (const name of PANEL_COLOUR_VARS) {
        const rgb = rgbString(root.style.getPropertyValue(name))
        if (rgb) colours.add(rgb)
    }
    for (const name of PANEL_TINT_VARS) {
        const rgb = probeColour(`var(${name})`)
        if (rgb && rgb !== 'rgba(0, 0, 0, 0)') colours.add(rgb)
    }
    return colours
}

/** One of Chorus's own surfaces (the theme page, the drawer, the trays): never a layer. */
function isChorusOwn(el: Element): boolean {
    return Boolean(el.closest('[id^="chorus-"], .chorus-tray'))
}

/**
 * Sizeable elements under an area that paint one of the panel colours without
 * covering the area's box: the sidebar's list below its header, the Queue, the
 * Now playing view inside its cell. Sticky and fixed things (a header that
 * rows scroll under) keep their colour.
 */
function paintedInPanelColours(
    root: HTMLElement,
    box: DOMRect,
    colours: Set<string>,
    skip: Set<Element>
): HTMLElement[] {
    const found: HTMLElement[] = []
    const queue: Array<{ el: HTMLElement; depth: number }> = [{ el: root, depth: 0 }]
    let seen = 0
    while (queue.length && seen < PAINT_NODES_MAX) {
        const { el, depth } = queue.shift()!
        seen++
        if (depth > 0 && !skip.has(el)) {
            const style = getComputedStyle(el)
            if (
                colours.has(style.backgroundColor) &&
                style.position !== 'sticky' &&
                style.position !== 'fixed'
            ) {
                const rect = el.getBoundingClientRect()
                if (
                    rect.width >= box.width * PAINT_MIN_WIDTH_SHARE &&
                    rect.height >= PAINT_MIN_HEIGHT &&
                    !isChorusOwn(el)
                ) {
                    found.push(el)
                }
            }
        }
        if (depth >= PAINT_DEPTH_MAX) continue
        for (const child of el.children) {
            if (child instanceof HTMLElement) queue.push({ el: child, depth: depth + 1 })
        }
    }
    return found
}

function paintsSomething(el: HTMLElement): boolean {
    const colour = getComputedStyle(el).backgroundColor
    if (!colour || colour === 'transparent') return false
    const alpha = /rgba?\([^)]*?(?:,|\/)\s*([\d.]+)\)$/.exec(colour)
    return !alpha || parseFloat(alpha[1]) > 0
}

/**
 * Whether a child covers its area's box: about as wide as it, and about as
 * tall or taller. Scroll content is taller than the box and has to count, or
 * the main view's content wrapper (which paints the main colour edge to edge)
 * stays opaque over a translucent panel; a sticky header or a hero band is
 * shorter and keeps its colour, a card is narrower.
 */
function covers(child: Element, box: DOMRect): boolean {
    const rect = child.getBoundingClientRect()
    return (
        rect.width > 0 &&
        rect.width >= box.width - COVER_SLACK &&
        rect.height >= box.height - COVER_SLACK
    )
}

function tag(el: Element, attr: string, value = ''): void {
    el.setAttribute(attr, value)
    tagged.add(el)
}

function clearTags(): void {
    for (const el of tagged) {
        el.removeAttribute(AREA_ATTR)
        el.removeAttribute(PANEL_ATTR)
        el.removeAttribute(LAYER_ATTR)
        el.removeAttribute(FRAME_ATTR)
    }
    tagged = new Set()
}

/**
 * Down from an area's grid child through everything that covers it, breadth
 * first, so the shallowest painter is the panel and every deeper one a layer
 * (Spotify's regions branch: a scroll node beside an overlay, a content
 * wrapper beside a sticky strip). Null when nothing on the way paints (an
 * overlay, an empty region).
 */
function findPanel(root: HTMLElement): { panel: HTMLElement; layers: HTMLElement[] } | null {
    const box = root.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) return null
    let panel: HTMLElement | null = null
    const layers: HTMLElement[] = []
    const queue: Array<{ el: HTMLElement; depth: number }> = [{ el: root, depth: 0 }]
    let seen = 0
    while (queue.length && seen < WALK_NODES_MAX) {
        const { el, depth } = queue.shift()!
        seen++
        if (paintsSomething(el)) {
            if (panel) layers.push(el)
            else panel = el
        }
        if (depth >= WALK_DEPTH_MAX) continue
        for (const child of el.children) {
            if (child instanceof HTMLElement && covers(child, box)) {
                queue.push({ el: child, depth: depth + 1 })
            }
        }
    }
    return panel ? { panel, layers } : null
}

/** One tagging pass over the page. Safe to call with no grid on the page yet. */
export function tagPagePanels(): void {
    // Our own tags change computed backgrounds, so each pass measures a clean page.
    clearTags()
    const grid = gridContainer()
    if (!grid) return
    for (let el: HTMLElement | null = grid; el && el !== document.body; el = el.parentElement) {
        tag(el, FRAME_ATTR)
    }
    const claimed = new Set<string>()
    const colours = panelColours()
    for (const child of grid.children) {
        if (!(child instanceof HTMLElement)) continue
        const area = areaOf(child)
        if (!area || claimed.has(area)) continue
        if (area === 'global-nav') {
            claimed.add(area)
            tag(child, AREA_ATTR, area)
        } else if (area === 'now-playing-bar') {
            claimed.add(area)
            tag(child, AREA_ATTR, area)
            // The bar's wrapper bleeds into the gaps and paints the frame colour; the <aside> is the panel.
            if (!child.matches(PLAYER_BAR)) tag(child, FRAME_ATTR)
        } else if (WALKED_AREAS.has(area)) {
            const found = findPanel(child)
            if (!found) continue
            claimed.add(area)
            tag(child, AREA_ATTR, area)
            tag(found.panel, PANEL_ATTR)
            for (const layer of found.layers) tag(layer, LAYER_ATTR)
            const skip = new Set<Element>([found.panel, ...found.layers])
            const box = child.getBoundingClientRect()
            for (const layer of paintedInPanelColours(child, box, colours, skip)) {
                tag(layer, LAYER_ATTR)
            }
        }
    }
}

function schedule(): void {
    if (timer) return
    timer = setTimeout(() => {
        timer = null
        tagPagePanels()
    }, DEBOUNCE_MS)
}

/** Keep the page's panels tagged while a backdrop is on. Idempotent. */
export function watchPagePanels(): void {
    if (observer || typeof document === 'undefined') return
    observer = new MutationObserver(schedule)
    const start = () => {
        const grid = gridContainer()
        if (!grid) return false
        observer?.observe(grid, { childList: true, subtree: true })
        tagPagePanels()
        return true
    }
    if (!start()) {
        // The grid is not there yet (first paint): wait for it.
        bodyObserver = new MutationObserver(() => {
            if (start()) {
                bodyObserver?.disconnect()
                bodyObserver = null
            }
        })
        bodyObserver.observe(document.body ?? document.documentElement, {
            childList: true,
            subtree: true
        })
    }
    onResize = schedule
    window.addEventListener('resize', onResize)
}

/** Stop watching and take every tag off the page. */
export function unwatchPagePanels(): void {
    observer?.disconnect()
    observer = null
    bodyObserver?.disconnect()
    bodyObserver = null
    if (timer) {
        clearTimeout(timer)
        timer = null
    }
    if (onResize) {
        window.removeEventListener('resize', onResize)
        onResize = null
    }
    clearTags()
}
