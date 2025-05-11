function createNavigator() {
    function navigateTo(path: string) {
        history.pushState({}, '', path)
        ;(window as any).dispatchEvent(new PopStateEvent('popstate'))
    }
    ;(window as any).navigateTo = navigateTo
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
