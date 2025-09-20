<script lang="ts">
    import type { Component } from 'svelte'
    import { mount, unmount, onMount, onDestroy } from 'svelte'
    import { newReleasesStore, newReleasesUIStore, type Range } from '$lib/stores/new-releases'

    import Tippy from '$lib/components/Tippy.svelte'
    import BellPlus from '@lucide/svelte/icons/bell-plus'
    import NewReleasesView from '$lib/components/views/NewReleases.svelte'
    import NewReleasesHeader from '$lib/components/NewReleasesHeader.svelte'

    let showReleases = $state(false)
    let releasesViewComponent: Component | null = null
    let releasesHeaderComponent: Component | null = null
    let initialUrl: string | null = null

    async function toggleNewReleasesUI() {
        const mainView = document.querySelector(
            '.main-view-container__scroll-node-child'
        ) as HTMLElement
        const mainEl = mainView?.querySelector('main')

        if (!mainView || !mainEl) return

        const topBar = document.querySelector('header[data-testid="topbar"]') as HTMLElement

        if (!releasesViewComponent) {
            mainEl.style.display = 'none'
            if (topBar) topBar.style.display = 'none'

            // Store the current URL when showing New Releases
            initialUrl = window.location.href

            releasesViewComponent = mount(NewReleasesView, { target: mainView }) as Component
            const parent = mainView?.parentElement?.parentElement
            if (parent) {
                releasesHeaderComponent = mount(NewReleasesHeader, { target: parent }) as Component
                showReleases = true
                newReleasesUIStore.setVisible(true)
            }
        } else {
            mainEl.style.display = 'block'
            if (topBar) topBar.style.display = 'block'

            // First unmount the components and wait for them to complete
            if (releasesViewComponent) unmount(releasesViewComponent)
            if (releasesHeaderComponent) unmount(releasesHeaderComponent)

            const releasesView = document.getElementById('chorus-new-releases-view')
            const releasesHeader = document.getElementById('chorus-new-releases-header')
            if (releasesView) releasesView.remove()
            if (releasesHeader) releasesHeader.remove()
            releasesViewComponent = null
            releasesHeaderComponent = null
            showReleases = false
            newReleasesUIStore.setVisible(false)

            // Reset URL tracking
            initialUrl = null
        }
    }

    // Function to check URL changes and auto-hide New Releases
    function handleUrlChange() {
        if (showReleases && initialUrl && window.location.href !== initialUrl) {
            toggleNewReleasesUI()
        }
    }

    // Function to handle navigation detection through DOM changes
    function handleNavigationChange() {
        if (showReleases && initialUrl && window.location.href !== initialUrl) {
            toggleNewReleasesUI()
        }
    }

    // Subscribe to store changes
    $effect(() => {
        if (!$newReleasesUIStore.visible && showReleases) {
            toggleNewReleasesUI()
        }
    })

    const rangeMap: Record<Range, number> = {
        week: 7,
        month: 30,
        yesterday: 1,
        today: 0
    }

    const WHOLE_DAY = 24 * 3600 * 1000

    async function checkIfSupporter() {
        try {
            const { release_type } = $newReleasesStore
            newReleasesUIStore.setLoading(true)
            if (release_type === 'music') await refreshMusicReleases()
            else if (release_type === 'shows&podcasts') await refreshShowsReleases()
            else {
                await Promise.all([refreshMusicReleases(), refreshShowsReleases()])
            }
        } finally {
            newReleasesUIStore.setLoading(false)
        }
    }

    function getDiffDays({ updated_at, limit }: { updated_at: string; limit: number }) {
        const last_updated_date = new Date(updated_at)
        const today = Date.now()
        const diffTime = Math.abs(today - (last_updated_date.getTime() + limit * WHOLE_DAY))
        return Math.floor(diffTime / WHOLE_DAY)
    }

    async function refreshShowsReleases() {
        const { shows_updated_at, range, shows_data } = $newReleasesStore
        if (!shows_data?.length || !shows_updated_at)
            return await newReleasesStore.getShowsReleases(true)

        const rangeLimit = rangeMap[range]
        const diffDays = getDiffDays({ updated_at: shows_updated_at, limit: rangeLimit })
        if (diffDays > rangeLimit) await newReleasesStore.getShowsReleases(true)
    }

    async function refreshMusicReleases() {
        const { music_updated_at, range, music_data } = $newReleasesStore
        if (!music_data?.length || !music_updated_at)
            return await newReleasesStore.getMusicReleases(true)

        const rangeLimit = rangeMap[range]
        const diffDays = getDiffDays({ updated_at: music_updated_at, limit: rangeLimit })

        if (diffDays > rangeLimit) await newReleasesStore.getMusicReleases(true)
    }

    let music_count = $state($newReleasesStore.music_count)
    let shows_count = $state($newReleasesStore.shows_count)

    $effect(() => {
        music_count = $newReleasesStore.music_count
        shows_count = $newReleasesStore.shows_count
    })

    onMount(() => {
        checkIfSupporter()

        let navigationObserver: MutationObserver | null = null
        let urlCheckInterval: number | null = null

        // Listen for browser navigation events (back/forward buttons)
        window.addEventListener('popstate', handleUrlChange)

        // Also listen for programmatic navigation by intercepting pushState and replaceState
        const originalPushState = history.pushState
        const originalReplaceState = history.replaceState

        history.pushState = function (...args) {
            originalPushState.apply(history, args)
            // Use setTimeout to ensure URL has changed before checking
            setTimeout(handleUrlChange, 0)
        }

        history.replaceState = function (...args) {
            originalReplaceState.apply(history, args)
            setTimeout(handleUrlChange, 0)
        }

        // Monitor DOM changes that might indicate navigation
        const mainView = document.querySelector('.main-view-container__scroll-node-child')
        if (mainView) {
            navigationObserver = new MutationObserver((mutations) => {
                // Check if there are significant DOM changes that might indicate navigation
                const hasSubtreeChanges = mutations.some(
                    (mutation) =>
                        mutation.type === 'childList' &&
                        mutation.addedNodes.length > 0 &&
                        Array.from(mutation.addedNodes).some(
                            (node) =>
                                node.nodeType === Node.ELEMENT_NODE &&
                                (node as Element).tagName !== 'STYLE'
                        )
                )
                if (hasSubtreeChanges) {
                    setTimeout(handleNavigationChange, 100)
                }
            })
            navigationObserver.observe(mainView, {
                childList: true,
                subtree: true,
                attributes: false,
                characterData: false
            })
        }

        // Fallback: periodically check URL when New Releases is visible
        urlCheckInterval = setInterval(() => {
            if (showReleases) {
                handleUrlChange()
            }
        }, 1000) as unknown as number

        // Cleanup function
        return () => {
            window.removeEventListener('popstate', handleUrlChange)
            history.pushState = originalPushState
            history.replaceState = originalReplaceState
            if (navigationObserver) {
                navigationObserver.disconnect()
            }
            if (urlCheckInterval) {
                clearInterval(urlCheckInterval)
            }
        }
    })

    onDestroy(() => {
        // Additional cleanup if component is destroyed while New Releases is visible
        if (showReleases) {
            toggleNewReleasesUI()
        }
    })
</script>

<div class="relative z-[999999]">
    <Tippy
        side="bottom"
        text="new releases"
        id="chorus-new-releases-icon"
        onTrigger={toggleNewReleasesUI}
        class="relative h-8 w-12 cursor-pointer border-white bg-transparent py-0 hover:bg-transparent [&_svg]:size-[18px]"
    >
        <BellPlus class="size-[18px] stroke-[var(--text)]" />

        <span
            class="h-4 w-10 rounded-md bg-[var(--text)] px-2 text-center text-xs font-semibold text-[var(--bg)]"
            >{music_count + shows_count}</span
        >
    </Tippy>
</div>
