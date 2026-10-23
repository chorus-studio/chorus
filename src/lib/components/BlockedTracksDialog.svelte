<script lang="ts">
    import Ban from '@lucide/svelte/icons/ban'
    import Check from '@lucide/svelte/icons/check'
    import Search from '@lucide/svelte/icons/search'
    import * as Dialog from '$lib/components/ui/dialog'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import { Button, buttonVariants } from '$lib/components/ui/button'
    import { dataStore } from '$lib/stores/data'
    import type { SimpleTrack } from '$lib/stores/data/cache'
    import { cn } from '$lib/utils.js'

    let { open = false }: { open?: boolean } = $props()
    let searchQuery = $state('')
    let selectedTracks = $state<Set<string>>(new Set())
    let blockedTracks = $state<SimpleTrack[]>([])

    // Refresh blocked tracks list from dataStore
    function refreshBlockedTracks() {
        blockedTracks = dataStore.blocked
    }

    // Initialize blocked tracks and listen for block/unblock events (event-driven, no polling)
    $effect(() => {
        refreshBlockedTracks()

        const handle = () => refreshBlockedTracks()
        document.addEventListener('chorus:track-blocked', handle)
        document.addEventListener('chorus:track-unblocked', handle)

        return () => {
            document.removeEventListener('chorus:track-blocked', handle)
            document.removeEventListener('chorus:track-unblocked', handle)
        }
    })

    const filteredTracks = $derived(
        blockedTracks.filter((track) => {
            if (!searchQuery) return true
            return track.song_id.toLowerCase().includes(searchQuery.toLowerCase())
        })
    )

    const blockedCount = $derived(blockedTracks.length)
    const selectAll = $derived(
        selectedTracks.size === filteredTracks.length && filteredTracks.length > 0
    )

    function toggleSelectAll() {
        selectedTracks = selectAll ? new Set() : new Set(filteredTracks.map((t) => t.track_id))
    }

    function toggleTrackSelection(trackId: string) {
        const next = new Set(selectedTracks)
        if (next.has(trackId)) next.delete(trackId)
        else next.add(trackId)
        selectedTracks = next
    }

    async function unblockTrack(trackId: string) {
        await dataStore.updateTrack({ track_id: trackId, value: { blocked: null } })
        const next = new Set(selectedTracks)
        next.delete(trackId)
        selectedTracks = next
        refreshBlockedTracks()

        document.dispatchEvent(
            new CustomEvent('chorus:track-unblocked', { detail: { track_id: trackId } })
        )
    }

    async function unblockSelected() {
        const trackIds = Array.from(selectedTracks)
        await Promise.all(
            trackIds.map((trackId) =>
                dataStore.updateTrack({ track_id: trackId, value: { blocked: null } })
            )
        )
        selectedTracks = new Set()
        refreshBlockedTracks()

        trackIds.forEach((trackId) => {
            document.dispatchEvent(
                new CustomEvent('chorus:track-unblocked', { detail: { track_id: trackId } })
            )
        })
    }

    function parseSongId(songId: string): { title: string; artists: string } {
        const parts = songId.split(' by ')
        return {
            title: parts[0] || '',
            artists: parts.slice(1).join(', ') || ''
        }
    }

    const triggerLabel = $derived(
        blockedCount ? `Blocked tracks (${blockedCount})` : 'Blocked tracks'
    )
</script>

<Dialog.Root bind:open>
    <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
            <Tooltip.Trigger>
                {#snippet child({ props: tooltipProps })}
                    <Dialog.Trigger
                        {...tooltipProps}
                        id="blocked-tracks-dialog-trigger"
                        aria-label={triggerLabel}
                        class={buttonVariants({
                            variant: 'bar',
                            size: 'icon-sm',
                            class: 'relative [&_svg]:size-[18px]'
                        })}
                    >
                        <Ban />
                        {#if blockedCount > 0}
                            <span
                                class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-signal px-1 font-mono text-[9px] font-bold text-ink"
                            >
                                {blockedCount > 99 ? '99+' : blockedCount}
                            </span>
                        {/if}
                    </Dialog.Trigger>
                {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom">{triggerLabel}</Tooltip.Content>
        </Tooltip.Root>
    </Tooltip.Provider>

    <Dialog.Content
        id="blocked-tracks-dialog-content"
        class="flex h-[600px] max-h-[90vh] w-[760px] max-w-[92vw] flex-col gap-0 overflow-hidden p-0"
    >
        <div class="flex items-start justify-between px-6 pb-3.5 pt-5">
            <div class="flex items-center gap-x-3">
                <span
                    class="inline-flex size-8 items-center justify-center rounded-lg bg-surface text-ink-fg"
                >
                    <Ban class="size-4" />
                </span>
                <div class="flex flex-col gap-y-0.5">
                    <Dialog.Title class="text-base font-semibold tracking-tight text-ink-fg"
                        >Blocked tracks</Dialog.Title
                    >
                    <Dialog.Description class="text-xs text-ink-muted">
                        {blockedCount === 0
                            ? 'Nothing blocked yet'
                            : `${blockedCount} ${blockedCount === 1 ? 'track' : 'tracks'} · skipped automatically in playlists, albums, radio and the queue`}
                    </Dialog.Description>
                </div>
            </div>
        </div>

        <div class="flex min-h-0 flex-1 flex-col gap-y-3 px-6 pb-5">
            <div class="flex items-center gap-x-2.5">
                <label class="relative flex-1">
                    <Search
                        class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-dim"
                    />
                    <input
                        type="search"
                        placeholder="Search title or artist"
                        aria-label="Search blocked tracks"
                        bind:value={searchQuery}
                        class="flex h-8 w-full rounded-md border border-hairline bg-inset pl-8 pr-3 text-[13px] text-ink-fg placeholder:text-dim hover:border-hairline-strong focus-visible:border-signal/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/30"
                    />
                </label>
                {#if filteredTracks.length > 0}
                    <Button variant="outline" size="sm" onclick={toggleSelectAll}>
                        {selectAll ? 'Deselect all' : 'Select all'}
                    </Button>
                {/if}
            </div>

            {#if selectedTracks.size > 0}
                <div
                    class="flex items-center justify-between gap-x-3 rounded-lg border border-signal/30 bg-signal/10 px-3 py-2 text-xs"
                >
                    <span>
                        <span class="font-semibold text-ink-fg">{selectedTracks.size} selected</span
                        >
                        <span class="text-ink-muted"> · they will play again immediately</span>
                    </span>
                    <div class="flex items-center gap-x-1.5">
                        <Button
                            variant="ghost"
                            size="sm"
                            onclick={() => (selectedTracks = new Set())}>Clear</Button
                        >
                        <Button size="sm" onclick={unblockSelected}
                            >Unblock {selectedTracks.size}</Button
                        >
                    </div>
                </div>
            {/if}

            <div
                class="chorus-scroll min-h-0 flex-1 overflow-y-auto rounded-lg border border-hairline bg-panel"
            >
                {#if filteredTracks.length === 0}
                    <div
                        class="flex h-full flex-col items-center justify-center gap-y-2 p-10 text-center"
                    >
                        <Ban class="size-8 text-ink-dim" />
                        {#if searchQuery}
                            <p class="text-[13px] text-ink-fg-2">
                                No blocked tracks match “{searchQuery}”
                            </p>
                        {:else}
                            <p class="text-[13px] text-ink-fg-2">No blocked tracks</p>
                            <p class="text-xs text-ink-muted">
                                Block the playing track with the ⊘ button in the player bar, or any
                                row's ⊘ in a tracklist.
                            </p>
                        {/if}
                    </div>
                {:else}
                    {#each filteredTracks as track (track.track_id)}
                        {@const { title, artists } = parseSongId(track.song_id)}
                        {@const isSelected = selectedTracks.has(track.track_id)}
                        <div
                            class={cn(
                                'flex items-center gap-x-3.5 border-t border-hairline px-3.5 py-2.5 first:border-t-0 hover:bg-surface/60',
                                isSelected && 'bg-signal/[0.06]'
                            )}
                        >
                            <button
                                type="button"
                                role="checkbox"
                                aria-checked={isSelected}
                                onclick={() => toggleTrackSelection(track.track_id)}
                                class={cn(
                                    'flex size-4 shrink-0 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60',
                                    isSelected
                                        ? 'border-signal bg-signal text-ink'
                                        : 'border-ink-dim hover:border-ink-muted'
                                )}
                                aria-label={`Select ${title}`}
                            >
                                {#if isSelected}
                                    <Check class="size-3" strokeWidth={3} />
                                {/if}
                            </button>

                            <div class="size-10 shrink-0 overflow-hidden rounded bg-surface-2">
                                {#if track.cover}
                                    <img src={track.cover} alt="" class="size-full object-cover" />
                                {:else}
                                    <div
                                        class="flex size-full items-center justify-center text-ink-dim"
                                    >
                                        <Ban class="size-4" />
                                    </div>
                                {/if}
                            </div>

                            <div class="min-w-0 flex-1">
                                <p class="truncate text-[13px] font-medium text-ink-fg">{title}</p>
                                <p class="truncate text-xs text-ink-muted">{artists}</p>
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                onclick={() => unblockTrack(track.track_id)}
                            >
                                Unblock
                            </Button>
                        </div>
                    {/each}
                {/if}
            </div>

            <div class="flex items-center justify-between text-[11px] text-ink-muted">
                <span class="flex items-center gap-x-1">
                    Block the playing track with
                    {#each ['Alt', 'Shift', 'B'] as key (key)}
                        <kbd
                            class="rounded border border-hairline-strong bg-surface px-1 py-px font-mono text-[10px] text-ink-fg-2"
                            >{key}</kbd
                        >
                    {/each}
                </span>
                <span>
                    {searchQuery
                        ? `Showing ${filteredTracks.length} of ${blockedCount}`
                        : `${blockedCount} total`}
                </span>
            </div>
        </div>
    </Dialog.Content>
</Dialog.Root>
