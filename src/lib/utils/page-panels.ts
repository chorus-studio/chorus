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
 *   again (Spotify stacks a few). The panel takes the translucent colour; the
 *   layers go transparent; anything narrower or shorter than the panel (a
 *   sticky header, a hero band, a card) keeps its own opaque colour.
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
