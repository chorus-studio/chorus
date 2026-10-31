import { mount, unmount } from 'svelte'
import { get } from 'svelte/store'

import { MatchPattern } from 'wxt/sandbox'
import { applyLook, removeTheme } from '$lib/utils/theming'
import { type VolumeState } from '$lib/stores/volume'
import { closePictureInPicture } from '$lib/utils/pip'
import { playbackObserver } from '$lib/observers/playback'
import { tracklistObserver } from '$lib/observers/tracklist'
import { discographyPages } from '$lib/utils/discography-pages'
import { getEnabled, watchEnabled } from '$lib/stores/enabled'
import { type SettingsState, SETTINGS_STORE_KEY } from '$lib/stores/settings'
import { readLooksState } from '$lib/utils/looks-state'
import { type ContentScriptContext, injectScript, createIntegratedUi } from 'wxt/client'
import { isReleasesRoute } from '$lib/utils/releases-route'
import { isThemeRoute } from '$lib/utils/theme-route'
import { lookEditing } from '$lib/stores/look-editor'

import '../app.css'
import App from '../App.svelte'
import Alert from '$lib/components/Alert.svelte'
import LoopButton from '$lib/components/LoopButton.svelte'
import SeekButton from '$lib/components/SeekButton.svelte'
import ChorusConfigDialog from '$lib/components/ChorusConfigDialog.svelte'
import BlockedTracksDialog from '$lib/components/BlockedTracksDialog.svelte'
import SnipsDialog from '$lib/components/SnipsDialog.svelte'
import DiscographyDialog from '$lib/components/DiscographyDialog.svelte'
import NewReleasesDialog from '$lib/components/NewReleasesDialog.svelte'
import NewReleasesPage from '$lib/components/NewReleasesPage.svelte'
import ThemePage from '$lib/components/ThemePage.svelte'
import LookDrawer from '$lib/components/theming/LookDrawer.svelte'

// Stable Spotify anchors. The footer `now-playing-bar` persists for the lifetime
// of the page (only its descendants swap), so it is a reliable observation root.
// The `now-playing-widget-v2` (track info) and the center control bar are both
// re-rendered — and frequently *element-swapped* — by Spotify as tracks change.
const NOW_PLAYING_BAR = '[data-testid="now-playing-bar"]'
const NOW_PLAYING_WIDGET = '[data-testid="now-playing-widget-v2"]'

// Tracks the master on/off state in this content-script world, kept in sync with
// the persisted `local:chorus_enabled` flag so injection points can bail fast.
let chorusEnabled = true

// The WXT integrated UI that owns the main App (#chorus-ui). We deliberately do
// NOT use its `autoMount()`: that helper decides whether to (re)mount by checking
// whether *a* node matching the anchor selector exists, which is blind to Spotify
// swapping the widget element out from under us (old removed + new inserted in one
// mutation batch keeps the selector "satisfied"). When that happens the App's DOM
// is destroyed along with the old widget but the Svelte instance keeps running as
// a zombie — its observers bound to detached nodes — which breaks song-change
// detection (stale snip/loop → playback yanked backwards) and drops the UI. We
// drive mount/remount ourselves from `reconcile()` instead.
let integratedUi: ReturnType<typeof createIntegratedUi> | undefined

// Persistent observer on the stable footer; survives widget/control-bar swaps and
// re-runs reconcile() so the UI self-heals without a page reload.
let reconcileObserver: MutationObserver | null = null
let reconcileTimer: ReturnType<typeof setTimeout> | null = null
// The element the reconciler is currently observing — `body` only as a bootstrap
// fallback until the footer exists, then narrowed to the footer to avoid a heavy
// document-wide subtree observer in steady state.
let reconcileTarget: Element | null = null

// One-time per page: the main-world scripts can't be un-injected, so guard against
// re-injecting (and double-installing their listeners) on re-enable/navigation.
let scriptsInjected = false

// Everything grafted into Spotify's own DOM, tracked so it can be torn down on
// master-off. `mountedExtras` = Alert + top-bar dialogs; `mountedControlButtons` =
// the seek/loop buttons grafted into the center control bar (re-injected on demand).
let mountedExtras: Array<{ instance: Record<string, any>; container?: HTMLElement }> = []
let mountedControlButtons: Array<{ instance: Record<string, any>; container?: HTMLElement }> = []

// When the media element first plays, read the persisted volume directly from
// chrome.storage (the single source of truth) and dispatch it to the main world.
// This avoids relying on the Svelte store which may still hold stale defaults.
// Module-scoped so it can be added on inject and removed on teardown (dedup is
// automatic since it's a stable reference).
async function handleMediaPlayInit() {
    const volume = await storage.getItem<VolumeState>('local:chorus_volume')
    if (volume) {
        window.postMessage({ type: 'FROM_VOLUME_LISTENER', data: volume }, '*')
    }
}

// Drop tracked entries whose grafted container Spotify has detached from the DOM,
// unmounting the orphaned Svelte instance first so its store subscriptions (e.g.
// LoopButton → loopStore) don't linger as stale subscribers. Without this, every
// control-bar re-render would leak a fresh set of subscribed-but-invisible buttons.
function pruneDetached(list: Array<{ instance: Record<string, any>; container?: HTMLElement }>) {
    return list.filter((entry) => {
        if (entry.container?.isConnected) return true
        try {
            unmount(entry.instance)
        } catch (error) {
            console.warn('Failed to unmount detached Chorus component', error)
        }
        entry.container?.remove()
        return false
    })
}

// Idempotently (re)graft the seek-back / seek-forward / loop buttons into Spotify's
// center control bar. Each button is created only when missing, so this is safe to
// call on every reconcile tick — it restores buttons Spotify wiped on a control-bar
// re-render and no-ops once they're present.
function injectControlButtons() {
    if (!chorusEnabled) return

    mountedControlButtons = pruneDetached(mountedControlButtons)

    const skipBack = document.querySelector('[data-testid="control-button-skip-back"]')
    const skipForward = document.querySelector('[data-testid="control-button-skip-forward"]')

    // Seek-back, immediately before Spotify's skip-back button.
    if (skipBack?.parentElement && !document.querySelector('#seek-player-rw-button')) {
        const div = document.createElement('div')
        skipBack.parentElement.insertBefore(div, skipBack)
        mountedControlButtons.push({
            instance: mount(SeekButton, { target: div, props: { role: 'seek-backward' } }),
            container: div
        })
    }

    // Seek-forward (after skip-forward) and loop (end of the control bar).
    if (skipForward?.parentElement) {
        const parentElement = skipForward.parentElement

        if (!document.querySelector('#seek-player-ff-button')) {
            const forwardDiv = document.createElement('div')
            parentElement.insertBefore(forwardDiv, skipForward.nextSibling)
            mountedControlButtons.push({
                instance: mount(SeekButton, {
                    target: forwardDiv,
                    props: { role: 'seek-forward' }
                }),
                container: forwardDiv
            })
        }

        if (!document.querySelector('#loop-button') && parentElement.lastElementChild) {
            const loopDiv = document.createElement('div')
            parentElement.insertBefore(loopDiv, parentElement.lastElementChild.nextSibling)
            mountedControlButtons.push({
                instance: mount(LoopButton, { target: loopDiv }),
                container: loopDiv
            })
        }
    }
}

// Idempotently mount the body-level Alert toaster and the top-bar config / snips /
// discography / blocked / new-releases dialogs. Re-runnable because the App can be re-mounted on a widget swap and we
// must not stack duplicates.
function injectExtras() {
    mountedExtras = pruneDetached(mountedExtras)

    const body = document.querySelector('body')
    if (body && !document.getElementById('chorus-alert-root')) {
        const alertRoot = document.createElement('div')
        alertRoot.id = 'chorus-alert-root'
        body.appendChild(alertRoot)
        mountedExtras.push({ instance: mount(Alert, { target: alertRoot }), container: alertRoot })
    }

    const formInput = document.querySelector(
        'input[data-encore-id="formInput"]'
    ) as HTMLInputElement | null
    if (formInput) {
        formInput.style.paddingRight = '0 !important'
        formInput.style.paddingLeft = '48px !important'
    }

    const newFeedButton = document.querySelector('[data-testid="whats-new-feed-button"]')
    if (newFeedButton?.parentElement) {
        // One tray for the Chorus buttons, the pill Spotify's search box is,
        // before Spotify's What's New bell. A detached tray (Spotify re-rendered
        // the bar) is not found by id, so a fresh one is made and refilled.
        let tray = document.getElementById('chorus-top-bar-tray')
        if (!tray) {
            tray = document.createElement('div')
            tray.id = 'chorus-top-bar-tray'
            tray.className = 'chorus-tray chorus-tray--bar'
            newFeedButton.parentElement.insertBefore(tray, newFeedButton)
        }

        if (!document.getElementById('chorus-config-dialog-trigger')) {
            const configDialog = document.createElement('div')
            tray.appendChild(configDialog)
            mountedExtras.push({
                instance: mount(ChorusConfigDialog, { target: configDialog }),
                container: configDialog
            })
        }
        if (!document.getElementById('snips-dialog-trigger')) {
            const snipsDialog = document.createElement('div')
            tray.appendChild(snipsDialog)
            mountedExtras.push({
                instance: mount(SnipsDialog, { target: snipsDialog }),
                container: snipsDialog
            })
        }
        if (!document.getElementById('discography-dialog-trigger')) {
            const discographyDialog = document.createElement('div')
            tray.appendChild(discographyDialog)
            mountedExtras.push({
                instance: mount(DiscographyDialog, { target: discographyDialog }),
                container: discographyDialog
            })
        }
        if (!document.getElementById('blocked-tracks-dialog-trigger')) {
            const blockedDialog = document.createElement('div')
            tray.appendChild(blockedDialog)
            mountedExtras.push({
                instance: mount(BlockedTracksDialog, { target: blockedDialog }),
                container: blockedDialog
            })
        }
        // Beside Spotify's own What's New bell, which covers the same ground.
        if (!document.getElementById('new-releases-dialog-trigger')) {
            const releasesDialog = document.createElement('div')
            tray.appendChild(releasesDialog)
            mountedExtras.push({
                instance: mount(NewReleasesDialog, { target: releasesDialog }),
                container: releasesDialog
            })
        }
    }
}

// The New releases page: an overlay on Spotify's main view while the URL
// carries #chorus/releases. syncReleasesPage() mounts or removes it, and runs
// on every navigation the main-world router reports (FROM_ROUTER), on
// hashchange / popstate, on reconcile, and on a 1 s tick while the page is
// open in case Spotify re-renders the container underneath it. The tick goes
// through an event rather than naming syncReleasesPage: WXT reads this file at
// build time with main() emptied and prunes what is then unused, and a
// function that refers to itself never becomes unused, so every import it
// touches would be evaluated in that read (where the proxy services throw).
const MAIN_VIEW = '.main-view-container'
const RELEASES_SYNC_EVENT = 'chorus:releases-sync'
let releasesPage: { instance: Record<string, any>; container: HTMLElement } | null = null
let releasesPageTimer: ReturnType<typeof setInterval> | null = null
let routeListenersBound = false

function unmountReleasesPage() {
    if (releasesPageTimer != null) {
        clearInterval(releasesPageTimer)
        releasesPageTimer = null
    }
    if (!releasesPage) return
    try {
        unmount(releasesPage.instance)
    } catch (error) {
        console.warn('Failed to unmount the New releases page', error)
    }
    releasesPage.container.remove()
    releasesPage = null
}

/** Spotify's main view, made a containing block for the overlays Chorus puts over it. */
function mainViewHost(): HTMLElement | null {
    const host =
        document.querySelector<HTMLElement>(MAIN_VIEW) ??
        document.querySelector('main')?.parentElement ??
        null
    if (host && getComputedStyle(host).position === 'static') host.style.position = 'relative'
    return host
}

function syncReleasesPage() {
    if (!chorusEnabled || !isReleasesRoute(location.hash)) return unmountReleasesPage()
    if (releasesPage?.container.isConnected) return
    unmountReleasesPage()

    const host = mainViewHost()
    if (!host) return
    const container = document.createElement('div')
    container.id = 'chorus-releases-page'
    host.appendChild(container)
    releasesPage = { instance: mount(NewReleasesPage, { target: container }), container }
    releasesPageTimer = setInterval(
        () => window.dispatchEvent(new Event(RELEASES_SYNC_EVENT)),
        1000
    )
}

// The theme page works the same way at #chorus/theme (lib/utils/theme-route),
// and the look drawer (lib/components/theming/LookDrawer) is mounted over the
// main view while lib/stores/look-editor holds a draft: it sits beside the live
// page, so the page itself previews the draft. Both re-mount on the same
// signals as the releases page, the drawer also when its store changes.
const THEME_SYNC_EVENT = 'chorus:theme-sync'
const DRAWER_SYNC_EVENT = 'chorus:drawer-sync'
let themePage: { instance: Record<string, any>; container: HTMLElement } | null = null
let themePageTimer: ReturnType<typeof setInterval> | null = null
let lookDrawer: { instance: Record<string, any>; container: HTMLElement } | null = null
let lookDrawerTimer: ReturnType<typeof setInterval> | null = null

function unmountThemePage() {
    if (themePageTimer != null) {
        clearInterval(themePageTimer)
        themePageTimer = null
    }
    showUnderThemePage()
    if (!themePage) return
    try {
        unmount(themePage.instance)
    } catch (error) {
        console.warn('Failed to unmount the theme page', error)
    }
    themePage.container.remove()
    themePage = null
}

/**
 * Spotify's own main-view content would show through the theme page, which
 * paints like a translucent panel under a backdrop, so it is hidden while the
 * page is there: the host's other children, marked so they can be put back.
 * (app.css has the same rule by class; this does not depend on the class.)
 */
const HIDDEN_UNDER_PAGE = 'data-chorus-under-page'
function hideUnderThemePage(host: HTMLElement, page: HTMLElement) {
    for (const child of host.children) {
        if (child === page || !(child instanceof HTMLElement)) continue
        if (child.hasAttribute(HIDDEN_UNDER_PAGE)) continue
        child.setAttribute(HIDDEN_UNDER_PAGE, child.style.visibility || '')
        child.style.visibility = 'hidden'
    }
}
function showUnderThemePage() {
    for (const el of document.querySelectorAll<HTMLElement>(`[${HIDDEN_UNDER_PAGE}]`)) {
        el.style.visibility = el.getAttribute(HIDDEN_UNDER_PAGE) || ''
        el.removeAttribute(HIDDEN_UNDER_PAGE)
    }
}

function syncThemePage() {
    if (!chorusEnabled || !isThemeRoute(location.hash)) return unmountThemePage()
    if (themePage?.container.isConnected) {
        // Spotify may have re-rendered part of the view underneath: keep it hidden.
        const host = themePage.container.parentElement
        if (host) hideUnderThemePage(host, themePage.container)
        return
    }
    unmountThemePage()

    const host = mainViewHost()
    if (!host) return
    const container = document.createElement('div')
    container.id = 'chorus-theme-page'
    host.appendChild(container)
    hideUnderThemePage(host, container)
    themePage = { instance: mount(ThemePage, { target: container }), container }
    themePageTimer = setInterval(() => window.dispatchEvent(new Event(THEME_SYNC_EVENT)), 1000)
}

function unmountLookDrawer() {
    if (lookDrawerTimer != null) {
        clearInterval(lookDrawerTimer)
        lookDrawerTimer = null
    }
    if (!lookDrawer) return
    try {
        unmount(lookDrawer.instance)
    } catch (error) {
        console.warn('Failed to unmount the look drawer', error)
    }
    lookDrawer.container.remove()
    lookDrawer = null
}

function syncLookDrawer() {
    if (!chorusEnabled || !get(lookEditing)) return unmountLookDrawer()
    if (lookDrawer?.container.isConnected) return
    unmountLookDrawer()

    const host = mainViewHost()
    if (!host) return
    const container = document.createElement('div')
    container.id = 'chorus-look-drawer'
    host.appendChild(container)
    lookDrawer = { instance: mount(LookDrawer, { target: container }), container }
    lookDrawerTimer = setInterval(() => window.dispatchEvent(new Event(DRAWER_SYNC_EVENT)), 1000)
}

function syncRoutes() {
    syncReleasesPage()
    syncThemePage()
    syncLookDrawer()
}

function onRouterMessage(event: MessageEvent) {
    if (event.source !== window || event.data?.type !== 'FROM_ROUTER') return
    syncRoutes()
}

function bindRouteListeners() {
    if (routeListenersBound) return
    routeListenersBound = true
    window.addEventListener('message', onRouterMessage)
    window.addEventListener('hashchange', syncRoutes)
    window.addEventListener('popstate', syncRoutes)
    window.addEventListener(RELEASES_SYNC_EVENT, syncReleasesPage)
    window.addEventListener(THEME_SYNC_EVENT, syncThemePage)
    window.addEventListener(DRAWER_SYNC_EVENT, syncLookDrawer)
    lookEditing.subscribe(() => syncLookDrawer())
}

// The single source of truth for "is the Chorus UI where it should be?". Re-mounts
// the App into the *current* widget whenever Spotify swapped/destroyed the previous
// one (which also re-binds the App's song-change/media observers to live nodes),
// and restores any control-bar buttons Spotify wiped. Cheap and convergent: when
// everything is healthy it does nothing.
function reconcile() {
    if (!chorusEnabled || !integratedUi) return

    // Narrow a bootstrap body-wide observation down to the footer as soon as it
    // exists, so steady state never watches the whole document.
    ensureBarScope()

    // The Track pill on the artist / album pages needs only the main view, not
    // the now-playing widget, so it is armed here rather than from the App and
    // survives the App's remounts. No-ops once watching.
    if (!discographyPages.observing) discographyPages.observe()

    // The pages Chorus puts over the main view (New releases, Theme, the look
    // drawer) need no player, so they come before the widget check: a page
    // that is still loading, or a logged-out one, gets them too.
    syncRoutes()

    const widget = document.querySelector(NOW_PLAYING_WIDGET)
    if (!widget) return

    const appHealthy =
        Boolean(integratedUi.mounted) &&
        Boolean(document.getElementById('chorus-ui')) &&
        widget.contains(integratedUi.wrapper)

    if (!appHealthy) {
        // Tear down any detached/zombie App (runs the App's cleanup → disconnects
        // its stale observers) before mounting a fresh one into the live widget.
        try {
            integratedUi.remove()
        } catch (error) {
            console.warn('Failed to remove stale Chorus UI', error)
        }
        integratedUi.mount()
    }

    injectControlButtons()

    // The progress row and volume column are re-rendered by Spotify on their
    // own (the music ↔ podcast layout switch, for one), which detaches the
    // Chorus bar/slider and uncovers the native ones. Idempotent, so it runs
    // on every tick once the App is up.
    if (document.getElementById('chorus-ui')) playbackObserver.updateChorusUI()
}

// Debounced reconcile — coalesces Spotify's bursty mutation batches. setTimeout
// (not rAF) so it still fires while the tab is backgrounded, where track changes
// and the stale-snip rewind would otherwise go unhealed.
function scheduleReconcile() {
    if (reconcileTimer != null) return
    reconcileTimer = setTimeout(() => {
        reconcileTimer = null
        reconcile()
    }, 100)
}

function startReconciler() {
    // Prefer the stable footer; fall back to body only until it exists (reconcile
    // re-scopes to the footer once present to avoid a permanent body-wide observer).
    const target = document.querySelector(NOW_PLAYING_BAR) ?? document.body
    reconcileTarget = target
    reconcileObserver = new MutationObserver(scheduleReconcile)
    reconcileObserver.observe(target, { childList: true, subtree: true })
}

// Narrow the observation root from the bootstrap `body` fallback down to the footer
// once Spotify has rendered it. No-ops once already scoped to the footer.
function ensureBarScope() {
    if (!reconcileObserver) return
    const bar = document.querySelector(NOW_PLAYING_BAR)
    if (!bar || reconcileTarget === bar) return
    reconcileObserver.disconnect()
    reconcileObserver.observe(bar, { childList: true, subtree: true })
    reconcileTarget = bar
}

async function injectChorusUI(ctx: ContentScriptContext) {
    if (!chorusEnabled) return

    // Already set up (re-entry from navigation/re-enable): just let the reconciler
    // re-sync against whatever the DOM looks like now.
    if (integratedUi) {
        scheduleReconcile()
        return
    }

    document.addEventListener('FROM_MEDIA_PLAY_INIT', handleMediaPlayInit)
    bindRouteListeners()

    if (!scriptsInjected) {
        await injectScript('/router.js')
        await injectScript('/media-override.js')
        scriptsInjected = true
    }

    const settings = await storage.getItem<SettingsState>(SETTINGS_STORE_KEY)
    // Palette, appearance and glass are all resolved from settings (a saved
    // palette only comes back while the Theme tab's "Apply theme" is on); a
    // saved look's details come from the looks record.
    if (settings) await applyLook(settings, await readLooksState())

    integratedUi = createIntegratedUi(ctx, {
        position: 'inline',
        anchor: NOW_PLAYING_WIDGET,
        onMount: (container) => {
            if (!chorusEnabled) return
            if (document.getElementById('chorus-ui')) return

            // Mount main app
            const app = mount(App, { target: container })

            injectExtras()
            injectControlButtons()

            return app
        },
        onRemove: (app) => {
            if (app) unmount(app)
        }
    })

    startReconciler()
    // Mount immediately if the player is already present; otherwise the reconciler
    // fires as soon as the now-playing bar/widget appears.
    reconcile()
}

// Fully tears down everything `injectChorusUI` added: the integrated App, the
// buttons/dialogs grafted into Spotify's DOM, the active theme, and any media
// overrides — leaving the page as vanilla Spotify until re-enabled.
function removeChorusUI() {
    // Close any open PiP window first — its UI is useless once the App (and the
    // observers feeding it) is torn down, and the PipButton that owned the close
    // handle is about to be unmounted.
    closePictureInPicture()

    if (reconcileTimer != null) {
        clearTimeout(reconcileTimer)
        reconcileTimer = null
    }
    reconcileObserver?.disconnect()
    reconcileObserver = null
    reconcileTarget = null

    integratedUi?.remove()
    integratedUi = undefined

    // The App's own cleanup only *stops* the observers (lightweight, so reconcile's
    // remounts don't churn). Master-OFF additionally restores Spotify's native
    // controls and removes the per-row tracklist buttons, returning the page to
    // vanilla. These singletons survive App remounts, so it's safe to call here.
    playbackObserver.teardown()
    tracklistObserver.teardown()
    discographyPages.teardown()

    for (const { instance, container } of mountedControlButtons) {
        try {
            unmount(instance)
        } catch (error) {
            console.warn('Failed to unmount Chorus control button', error)
        }
        container?.remove()
    }
    mountedControlButtons = []

    for (const { instance, container } of mountedExtras) {
        try {
            unmount(instance)
        } catch (error) {
            console.warn('Failed to unmount Chorus component', error)
        }
        container?.remove()
    }
    mountedExtras = []
    document.getElementById('chorus-top-bar-tray')?.remove()
    unmountReleasesPage()
    unmountThemePage()
    lookEditing.set(null)
    unmountLookDrawer()

    document.removeEventListener('FROM_MEDIA_PLAY_INIT', handleMediaPlayInit)

    removeTheme()

    // Hand the audio element back to vanilla Spotify: the main-world override
    // bypasses its graph (no effects/gain/speed) and restores native rate/pitch.
    window.postMessage({ type: 'FROM_ENABLED_LISTENER', data: { enabled: false } }, '*')
}

const watchPattern = new MatchPattern('*://open.spotify.com/*')

export default defineContentScript({
    matches: ['*://open.spotify.com/*'],

    async main(ctx) {
        chorusEnabled = await getEnabled()

        if (chorusEnabled) await injectChorusUI(ctx)

        // React to the master on/off toggle (fired from the keyboard command in the
        // background or the popup) without needing a page reload.
        const unwatchEnabled = watchEnabled(async (enabled) => {
            if (enabled === chorusEnabled) return
            chorusEnabled = enabled
            if (enabled) {
                // Rearm the (still-installed) main-world override first, then re-inject UI.
                window.postMessage({ type: 'FROM_ENABLED_LISTENER', data: { enabled: true } }, '*')
                await injectChorusUI(ctx)
            } else {
                removeChorusUI()
            }
        })
        ctx.onInvalidated(() => unwatchEnabled())

        ctx.addEventListener(window, 'wxt:locationchange', async ({ newUrl }) => {
            if (watchPattern.includes(newUrl)) await injectChorusUI(ctx)
        })
    }
})
