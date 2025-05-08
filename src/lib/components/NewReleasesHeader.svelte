<script lang="ts">
    import { newReleasesStore } from '$lib/stores/new-releases'

    import Undo from '@lucide/svelte/icons/undo'
    import Tippy from '$lib/components/Tippy.svelte'
    import RefreshCw from '@lucide/svelte/icons/refresh-cw'
    import NewReleasesDialog from '$lib/components/NewReleasesDialog.svelte'

    async function refresh() {
        await newReleasesStore.getNewReleases(true)
    }

    async function undoDismiss() {
        await newReleasesStore.undoDismiss()
    }

    const disabled = $derived($newReleasesStore.dismissed.length == 0)
</script>

<div
    id="chorus-new-releases-header"
    class="xl:container absolute left-1/2 z-[99999] flex w-full -translate-x-1/2 rounded-t-md bg-[#121212]"
>
    <div class="mx-auto flex w-full max-w-screen-4xl justify-between gap-4 px-10 py-6">
        <div class="flex flex-col gap-2">
            <h1 class="text-left text-4xl font-bold">New Releases</h1>
            <p class="text-lg text-muted-foreground">
                The latest releases from artists, podcasts, and shows you follow.
            </p>
        </div>

        <div class="flex h-8 items-center justify-end gap-2">
            {#if $newReleasesStore.dismissed.length > 0}
                <Tippy {disabled} text="undo dismiss" onTrigger={undoDismiss} side="bottom">
                    <Undo />
                </Tippy>
            {/if}
            <div>
                <Tippy text="resync" onTrigger={refresh} side="left">
                    <RefreshCw />
                </Tippy>
            </div>
            <NewReleasesDialog />
        </div>
    </div>
</div>
