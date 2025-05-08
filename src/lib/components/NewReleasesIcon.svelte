<script lang="ts">
    import type { Component } from 'svelte'
    import { mount, unmount } from 'svelte'
    import { clickOutside } from '$lib/utils/click-outside'
    import { newReleasesStore, newReleasesUIStore } from '$lib/stores/new-releases'

    import Tippy from '$lib/components/Tippy.svelte'
    import { Button } from '$lib/components/ui/button'
    import BellPlus from '@lucide/svelte/icons/bell-plus'
    import NewReleasesView from '$lib/components/views/NewReleases.svelte'
    import NewReleasesHeader from '$lib/components/NewReleasesHeader.svelte'

    let showReleases = $state(false)
    let releasesViewComponent: Component | null = null
    let releasesHeaderComponent: Component | null = null

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
            releasesViewComponent = mount(NewReleasesView, { target: mainView }) as Component
            const parent = mainView?.parentElement?.parentElement
            if (parent) {
                releasesHeaderComponent = mount(NewReleasesHeader, { target: parent }) as Component
                showReleases = true
                newReleasesUIStore.set(true)
            }
        } else {
            mainEl.style.display = 'block'
            if (topBar) topBar.style.display = 'block'

            // First unmount the components and wait for them to complete
            await Promise.all([unmount(NewReleasesView), unmount(NewReleasesHeader)])

            const releasesView = document.getElementById('chorus-new-releases-view')
            const releasesHeader = document.getElementById('chorus-new-releases-header')
            if (releasesView) releasesView.remove()
            if (releasesHeader) releasesHeader.remove()
            releasesViewComponent = null
            releasesHeaderComponent = null
            showReleases = false
            newReleasesUIStore.set(false)
        }
    }

    function registerClickOutside(event: MouseEvent) {
        if (!$newReleasesUIStore) return

        const target = event.composedPath() as HTMLElement[]
        if (!target?.length) return

        const spanLinks = target.find(
            (t) => t.localName === 'span' && t.classList.contains('chorus-release-text')
        )
        if (spanLinks) return

        const isNewReleases = target.find(
            (t) =>
                t.localName === 'footer' ||
                [
                    'chorus-new-releases',
                    'chorus-new-releases-view',
                    'chorus-new-releases-header',
                    'chorus-new-releases-dialog-content',
                    'chorus-new-releases-dialog-trigger'
                ].includes(t.id)
        )
        if (!isNewReleases) toggleNewReleasesUI()
    }

    // Subscribe to store changes
    $effect(() => {
        if (!$newReleasesUIStore && showReleases) {
            toggleNewReleasesUI()
        }
    })
</script>

<div use:clickOutside={registerClickOutside}>
    <Tippy
        side="bottom"
        text="new releases"
        id="chorus-new-releases-icon"
        onTrigger={toggleNewReleasesUI}
        class="relative h-8 w-12 cursor-pointer border-white bg-transparent hover:bg-transparent [&_svg]:size-5"
    >
        <BellPlus class="stroke-red-500" />

        <span
            class="rounded-4 h-4 w-10 rounded-md bg-red-500 px-2 text-center text-xs font-semibold text-white"
            >{$newReleasesStore.count}</span
        >
    </Tippy>
</div>
