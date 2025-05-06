<script lang="ts">
    import { mount, unmount, type Component } from 'svelte'
    import BellPlus from '@lucide/svelte/icons/bell-plus'
    import { Button } from '$lib/components/ui/button'
    import { getNewReleasesService } from '$lib/api/services/new-releases'
    import NewReleases from '$lib/components/views/NewReleases.svelte'

    let releasesCount = $state(0)
    let releasesComponent: Component | null = $state(null)

    async function getReleasesCount() {
        releasesCount = 10
        // const releases = await getNewReleasesService().getMusicReleases()
        // releasesCount = releases.length
    }

    async function toggleNewReleasesUI() {
        const releasesView = document.getElementById('chorus-new-releases-view') as HTMLElement

        const mainView = document.querySelector(
            '.main-view-container__scroll-node-child'
        ) as HTMLElement
        const mainEl = mainView?.querySelector('main')

        if (!mainView || !mainEl) return

        const topBar = document.querySelector('header[data-testid="topbar"]') as HTMLElement

        if (!releasesView) {
            mainEl.style.display = 'none'
            if (topBar) topBar.style.display = 'none'
            releasesComponent = mount(NewReleases, { target: mainView }) as Component
        } else {
            mainEl.style.display = 'block'
            if (topBar) topBar.style.display = 'block'
            if (!releasesComponent) return

            unmount(NewReleases, { outro: true })
            releasesView.remove()
            releasesComponent = null
        }
    }

    onMount(() => {
        getReleasesCount()
    })
</script>

<Button
    size="icon"
    id="chorus-new-releases"
    variant="ghost"
    class="relative h-8 w-12 cursor-pointer border-white bg-transparent hover:bg-transparent [&_svg]:size-5"
    onclick={toggleNewReleasesUI}
>
    <BellPlus class="stroke-red-500" />
    <span
        class="rounded-4 h-4 w-10 rounded-md bg-red-500 px-2 text-center text-xs font-semibold text-white"
        >{releasesCount}</span
    >
</Button>
