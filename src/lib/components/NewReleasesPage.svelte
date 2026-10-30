<script lang="ts">
    import Sparkles from '@lucide/svelte/icons/sparkles'
    import X from '@lucide/svelte/icons/x'
    import { Button } from '$lib/components/ui/button'
    import NewReleasesBrowser from '$lib/components/NewReleasesBrowser.svelte'
    import { closeReleasesPage, releasesQuery } from '$lib/utils/releases-route'

    // New releases across Spotify's main view: the content script mounts this
    // over the main view while the URL carries #chorus/releases, and removes
    // it when the URL changes (Back, a sidebar click, a release's own page).
    // The sidebar, top bar and player bar stay. The surface is Spotify's main
    // background, so it reads as one of Spotify's pages; the controls are
    // Chorus's.
    let query = $state(releasesQuery(location.hash))
</script>

<div
    id="chorus-releases-page-root"
    class="chorus-releases-page dark absolute inset-0 z-[9] flex flex-col text-ink-fg"
    role="region"
    aria-label="New releases"
>
    <div class="chorus-scroll min-h-0 flex-1 overflow-y-auto">
        <div class="mx-auto flex w-full max-w-[1480px] flex-col gap-y-5 px-8 pb-20 pt-6">
            <div class="flex items-start justify-between gap-x-6">
                <div class="flex items-center gap-x-4">
                    <span
                        class="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface text-ink-fg shadow-float"
                    >
                        <Sparkles class="size-6" />
                    </span>
                    <div class="flex flex-col gap-y-1">
                        <h1 class="text-[28px] font-bold leading-none tracking-tight text-ink-fg">
                            New releases
                        </h1>
                        <p class="text-sm text-ink-muted">
                            The latest from the artists and shows you follow on Spotify
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    class="shrink-0 text-ink-muted hover:text-ink-fg"
                    aria-label="Close New releases"
                    onclick={closeReleasesPage}
                >
                    <X class="size-4" />
                    Close
                </Button>
            </div>

            <NewReleasesBrowser layout="page" bind:query />
        </div>
    </div>
</div>

<style>
    /* Spotify's own main background, themed by Chorus when a theme is on. */
    .chorus-releases-page {
        background: var(--background-base, #121212);
    }
</style>
