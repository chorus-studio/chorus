<script lang="ts">
    import { onMount } from 'svelte'
    import Sparkles from '@lucide/svelte/icons/sparkles'
    import Maximize2 from '@lucide/svelte/icons/maximize-2'
    import * as Dialog from '$lib/components/ui/dialog'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import { buttonVariants } from '$lib/components/ui/button'
    import NewReleasesBrowser from '$lib/components/NewReleasesBrowser.svelte'
    import { newReleasesStore } from '$lib/stores/new-releases'
    import { unseenReleases } from '$lib/utils/releases-badge'
    import { openReleasesPage } from '$lib/utils/releases-route'

    // The quick view of the latest releases from the artists and shows the
    // person follows: open it from the top bar, play, save or dismiss, close.
    // "Open as a page" hands the same filters and search to the New releases
    // page across Spotify's main view. The shell is the blocked-tracks
    // dialog's; the body is NewReleasesBrowser.
    let { open = false }: { open?: boolean } = $props()
    let query = $state('')

    const unseen = $derived(unseenReleases($newReleasesStore))
    const triggerLabel = $derived(unseen ? `New releases (${unseen} new)` : 'New releases')

    onMount(() => {
        // Spotify just loaded: bring stale lists up to date, so the toolbar badge is right.
        void newReleasesStore.refresh()
    })

    function expand() {
        open = false
        openReleasesPage(query)
    }
</script>

<Dialog.Root bind:open>
    <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
            <Tooltip.Trigger>
                {#snippet child({ props: tooltipProps })}
                    <Dialog.Trigger
                        {...tooltipProps}
                        id="new-releases-dialog-trigger"
                        aria-label={triggerLabel}
                        class={buttonVariants({
                            variant: 'bar',
                            size: 'icon-sm',
                            class: 'relative [&_svg]:size-[18px]'
                        })}
                    >
                        <Sparkles />
                        {#if unseen > 0}
                            <span
                                class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-signal px-1 font-mono text-[9px] font-bold text-ink"
                            >
                                {unseen > 99 ? '99+' : unseen}
                            </span>
                        {/if}
                    </Dialog.Trigger>
                {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom">{triggerLabel}</Tooltip.Content>
        </Tooltip.Root>
    </Tooltip.Provider>

    <Dialog.Content
        id="new-releases-dialog-content"
        class="flex h-[600px] max-h-[90vh] w-[760px] max-w-[92vw] flex-col gap-0 overflow-hidden p-0"
    >
        <div class="flex items-start justify-between px-6 pb-3.5 pt-5">
            <div class="flex items-center gap-x-3">
                <span
                    class="inline-flex size-8 items-center justify-center rounded-lg bg-surface text-ink-fg"
                >
                    <Sparkles class="size-4" />
                </span>
                <div class="flex flex-col gap-y-0.5">
                    <Dialog.Title class="text-base font-semibold tracking-tight text-ink-fg"
                        >New releases</Dialog.Title
                    >
                    <Dialog.Description class="text-xs text-ink-muted">
                        The latest from the artists and shows you follow on Spotify
                    </Dialog.Description>
                </div>
            </div>
        </div>
        <button
            type="button"
            id="new-releases-open-page"
            aria-label="Open as a page"
            title="Open as a page, across Spotify's main view"
            onclick={expand}
            class="absolute right-12 top-4 inline-flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
            <Maximize2 class="size-4" />
        </button>

        <div class="flex min-h-0 flex-1 flex-col px-6 pb-5">
            <NewReleasesBrowser
                layout="dialog"
                active={open}
                bind:query
                onNavigate={() => (open = false)}
            />
        </div>
    </Dialog.Content>
</Dialog.Root>
