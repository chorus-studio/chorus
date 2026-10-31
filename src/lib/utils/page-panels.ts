/**
 * Finds Spotify's page panels so a backdrop can show through them.
 *
 * The web player lays its regions out on one CSS grid (top bar, library,
 * main view, right sidebar, player bar) with named areas, but the class
 * names on those regions are hashed per build, so nothing in theme.css can
 * name them. This module reads each grid child's computed `grid-area` (or,
 * when the placement is numbered, tells the main view by what it holds and
 * the sides by where they sit) and tags the region
 * `data-chorus-area="main-view"` and so on; theme.css takes it from there. Two more tags make the translucency work:
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
 * ids. Spotify re-renders these regions on navigation and, on a signed-in
 * page, builds the grid itself after a first shell, so while a backdrop is
 * on the tags are re-applied on a debounced mutation observer over the whole
 * document (the grid is found afresh each pass), with a few timed retries
 * after a pass that left a sized region without a panel (its stylesheet or
 * its content still on the way); they are removed when the backdrop goes.
 */

export const AREA_ATTR = 'data-chorus-area'
export const PANEL_ATTR = 'data-chorus-panel'
export const LAYER_ATTR = 'data-chorus-panel-layer'
export const FRAME_ATTR = 'data-chorus-frame'

const NAV_BAR = '[data-testid="global-nav-bar"]'
const PLAYER_BAR = '[data-testid="now-playing-bar"]'
/** What the main view holds, for telling the regions apart when their placement is not named. */
const MAIN_VIEW = '.main-view-container, main'
/** A grid child this tall, relative to the grid, is a side region rather than a banner or a bar. */
const SIDE_REGION_HEIGHT_SHARE = 0.5
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
const WALK_NODES_MAX = 120
/** The colour pass: how deep and how many elements under an area it checks. */
const PAINT_DEPTH_MAX = 8
const PAINT_NODES_MAX = 400
/** An element painted in a panel colour counts when it spans this much of the area's width and is at least this tall. */
const PAINT_MIN_WIDTH_SHARE = 0.4
const PAINT_MIN_HEIGHT = 48
/** When nothing on the covering chain paints, a painted element this large (both ways) stands in as the panel. */
const FALLBACK_MIN_SHARE = 0.6
/** The palette variables theming writes as plain hex, which panels paint in. */
const PANEL_COLOUR_VARS = ['--chorus-main', '--chorus-sidebar', '--chorus-player']
/** Tints theme.css builds with color-mix(); a probe element resolves them to rgb. */
const PANEL_TINT_VARS = ['--chorus-hero', '--chorus-hero-top']
const PROBE_ID = 'chorus-colour-probe'
const DEBOUNCE_MS = 120
/** After a pass that left a sized region without a panel: try again at these delays, then leave it to the observer. */
const RETRY_DELAYS_MS = [400, 1500, 4000]

let observer: MutationObserver | null = null
let timer: ReturnType<typeof setTimeout> | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null
let retryIndex = 0
let tagged: Set<Element> = new Set()
let onWake: (() => void) | null = null

/** What one pass found, for the retry decision. */
export type PassResult = {
    /** A layout grid was on the page. */
    grid: boolean
    /** Walked areas with at least one child that has a box of its own. */
    sized: number
    /** Of those, the ones given a panel. */
    found: number
}

/**
 * The grid that lays the regions out: the nearest grid above the top bar that
 * also holds the main view. The nearest grid alone is not enough when the bar
 * sits in a grid of its own (the signed-in layout wraps it), which has no
 * regions among its children.
 */
function gridContainer(): HTMLElement | null {
    const nav = document.querySelector<HTMLElement>(NAV_BAR)
    const main = document.querySelector<HTMLElement>(MAIN_VIEW)
    let el: HTMLElement | null = nav?.parentElement ?? null
    let nearest: HTMLElement | null = null
    while (el && el !== document.body) {
        if (getComputedStyle(el).display === 'grid') {
            nearest ??= el
            if (!main || el.contains(main)) return el
        }
        el = el.parentElement
    }
    return nearest
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
    if (/^[a-z][a-z-]*$/.test(start)) return start
    // Numbered placement: the main view is known by what it holds; the sides by where they sit (regionsOf).
    if (el.matches(MAIN_VIEW) || el.querySelector(MAIN_VIEW)) return 'main-view'
    return null
}

/**
 * Each grid child with its region. A child whose placement is numbered and
 * that holds nothing we know is a side region when it is tall and sits left
 * or right of the main view.
 */
function regionsOf(grid: HTMLElement): Array<{ child: HTMLElement; area: string | null }> {
    const entries = [...grid.children]
        .filter((child): child is HTMLElement => child instanceof HTMLElement)
        .map((child) => ({ child, area: areaOf(child) }))
    const main = entries.find((entry) => entry.area === 'main-view')
    if (!main) return entries
    const mainRect = main.child.getBoundingClientRect()
    const gridHeight = grid.getBoundingClientRect().height
    for (const entry of entries) {
        if (entry.area) continue
        const rect = entry.child.getBoundingClientRect()
        if (rect.width === 0 || rect.height < gridHeight * SIDE_REGION_HEIGHT_SHARE) continue
        if (rect.right <= mainRect.left + 1) entry.area = 'left-sidebar'
        else if (rect.left >= mainRect.right - 1) entry.area = 'right-sidebar'
    }
    return entries
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
 * rows scroll under) keep their colour. Shallowest first.
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

/**
 * Whether a computed background colour paints anything: everything but a
 * zero alpha. Computed colours come as `rgb(r, g, b)`, `rgba(r, g, b, a)`,
 * `color(srgb r g b / a)` or another space with a `/ a`; the alpha is only
 * ever the fourth channel, never a trailing zero blue channel (`rgb(122, 0,
 * 0)` is an opaque red).
 */
export function paintsColour(colour: string): boolean {
    if (!colour || colour === 'transparent') return false
    const open = colour.indexOf('(')
    if (open < 0) return true
    const inner = colour.slice(open + 1, colour.lastIndexOf(')'))
    const slash = inner.indexOf('/')
    if (slash >= 0) return parseFloat(inner.slice(slash + 1)) > 0
    const parts = inner.split(',')
    return parts.length < 4 || parseFloat(parts[3]) > 0
}

/**
 * Whether a box covers its area's box: about as wide as it, and about as
 * tall or taller. Scroll content is taller than the box and has to count, or
 * the main view's content wrapper (which paints the main colour edge to edge)
 * stays opaque over a translucent panel; a sticky header or a hero band is
 * shorter and keeps its colour, a card is narrower.
 */
function covers(rect: DOMRect, box: DOMRect): boolean {
    return (
        rect.width > 0 &&
        rect.width >= box.width - COVER_SLACK &&
        rect.height >= box.height - COVER_SLACK
    )
}

/** No box of its own (`display: contents`, an unsized wrapper): its children may still fill the area. */
function sizeless(rect: DOMRect): boolean {
    return rect.width === 0 || rect.height === 0
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
 * wrapper beside a sticky strip). Wrappers with no box of their own are
 * walked through, not counted. Null when nothing on the way paints (an
 * overlay, an empty region).
 */
function findPanel(
    root: HTMLElement,
    box: DOMRect
): { panel: HTMLElement; layers: HTMLElement[] } | null {
    let panel: HTMLElement | null = null
    const layers: HTMLElement[] = []
    const queue: Array<{ el: HTMLElement; depth: number; fills: boolean }> = [
        { el: root, depth: 0, fills: true }
    ]
    let seen = 0
    while (queue.length && seen < WALK_NODES_MAX) {
        const { el, depth, fills } = queue.shift()!
        seen++
        const style = getComputedStyle(el)
        if (style.display === 'none') continue
        if (fills && paintsColour(style.backgroundColor)) {
            if (panel) layers.push(el)
            else panel = el
        }
        if (depth >= WALK_DEPTH_MAX) continue
        for (const child of el.children) {
            if (!(child instanceof HTMLElement)) continue
            const rect = child.getBoundingClientRect()
            if (covers(rect, box)) queue.push({ el: child, depth: depth + 1, fills: true })
            else if (sizeless(rect)) queue.push({ el: child, depth: depth + 1, fills: false })
        }
    }
    return panel ? { panel, layers } : null
}

/** One tagging pass over the page. Safe to call with no grid on the page yet. */
export function tagPagePanels(): PassResult {
    // Our own tags change computed backgrounds, so each pass measures a clean page.
    clearTags()
    const result: PassResult = { grid: false, sized: 0, found: 0 }
    const grid = gridContainer()
    if (!grid) return result
    result.grid = true
    for (let el: HTMLElement | null = grid; el && el !== document.body; el = el.parentElement) {
        tag(el, FRAME_ATTR)
    }
    const claimed = new Set<string>()
    const sizedAreas = new Set<string>()
    const colours = panelColours()
    for (const { child, area } of regionsOf(grid)) {
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
            const box = child.getBoundingClientRect()
            if (sizeless(box)) continue
            sizedAreas.add(area)
            let found = findPanel(child, box)
            let painted: HTMLElement[]
            if (found) {
                painted = paintedInPanelColours(
                    child,
                    box,
                    colours,
                    new Set([found.panel, ...found.layers])
                )
            } else {
                // Nothing on the covering chain paints: the painter sits inset
                // past the slack, or beside a wrapper the chain cannot see
                // through. The shallowest large element in a panel colour is
                // the panel, the rest of them layers.
                painted = paintedInPanelColours(child, box, colours, new Set())
                const panel = painted.find((el) => {
                    const rect = el.getBoundingClientRect()
                    return (
                        rect.width >= box.width * FALLBACK_MIN_SHARE &&
                        rect.height >= box.height * FALLBACK_MIN_SHARE
                    )
                })
                if (!panel) continue
                found = { panel, layers: [] }
                painted = painted.filter((el) => el !== panel)
            }
            claimed.add(area)
            tag(child, AREA_ATTR, area)
            tag(found.panel, PANEL_ATTR)
            for (const layer of found.layers) tag(layer, LAYER_ATTR)
            for (const layer of painted) tag(layer, LAYER_ATTR)
        }
    }
    result.sized = sizedAreas.size
    result.found = [...sizedAreas].filter((area) => claimed.has(area)).length
    return result
}

/**
 * A pass, and when it left a sized region without a panel (its stylesheet
 * or content still loading, a transition mid-way) a few timed retries,
 * growing apart; a complete pass starts the count over.
 */
function runPass(): void {
    const { grid, sized, found } = tagPagePanels()
    if (!grid || found >= sized) {
        retryIndex = 0
        return
    }
    if (retryTimer || retryIndex >= RETRY_DELAYS_MS.length) return
    retryTimer = setTimeout(() => {
        retryTimer = null
        runPass()
    }, RETRY_DELAYS_MS[retryIndex++])
}

function schedule(): void {
    if (timer) return
    timer = setTimeout(() => {
        timer = null
        runPass()
    }, DEBOUNCE_MS)
}

/**
 * Keep the page's panels tagged while a backdrop is on. Idempotent. The
 * observer covers the whole document rather than the grid: a signed-in page
 * builds its grid after a first shell, and Spotify's stylesheets (and our
 * rewritten copies of them) land in <head>; each pass finds the grid afresh.
 */
export function watchPagePanels(): void {
    if (observer || typeof document === 'undefined') return
    observer = new MutationObserver(schedule)
    observer.observe(document.documentElement, { childList: true, subtree: true })
    onWake = schedule
    window.addEventListener('resize', onWake)
    document.addEventListener('visibilitychange', onWake)
    runPass()
}

/** Stop watching and take every tag off the page. */
export function unwatchPagePanels(): void {
    observer?.disconnect()
    observer = null
    if (timer) {
        clearTimeout(timer)
        timer = null
    }
    if (retryTimer) {
        clearTimeout(retryTimer)
        retryTimer = null
    }
    retryIndex = 0
    if (onWake) {
        window.removeEventListener('resize', onWake)
        document.removeEventListener('visibilitychange', onWake)
        onWake = null
    }
    clearTags()
}
