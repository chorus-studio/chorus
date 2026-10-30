// Runs in the page's own world: Spotify's router is a history-API app, and the
// content script's isolated world can neither drive it nor see its pushState
// calls (a wrapper set there lands on that world's own History wrapper).
function createNavigator() {
    function navigateTo(path: string) {
        history.pushState({}, '', path)
        window.dispatchEvent(new PopStateEvent('popstate'))
    }
    ;(window as any).navigateTo = navigateTo

    // Tell the content script about every navigation, Spotify's included:
    // pushState and replaceState raise no event of their own. The New
    // releases page is bound to the URL and leaves when it changes.
    const announce = () =>
        window.postMessage(
            { type: 'FROM_ROUTER', data: { path: location.pathname, hash: location.hash } },
            '*'
        )
    for (const method of ['pushState', 'replaceState'] as const) {
        const original = history[method]
        history[method] = function (this: History, ...args: Parameters<History['pushState']>) {
            const before = location.href
            const result = original.apply(this, args)
            if (location.href !== before) announce()
            return result
        }
    }
}

declare global {
    interface Window {
        navigateTo: (path: string) => void
    }
}

export default defineUnlistedScript({
    main() {
        createNavigator()
    }
})
