<script lang="ts">
    import { onMount } from 'svelte'
    import { storage } from '@wxt-dev/storage'
    import OctagonX from '@lucide/svelte/icons/octagon-x'
    import Check from '@lucide/svelte/icons/check'
    import LayoutGrid from '@lucide/svelte/icons/layout-grid'
    import List from '@lucide/svelte/icons/list'
    import Minus from '@lucide/svelte/icons/minus'
    import Music from '@lucide/svelte/icons/music'
    import Search from '@lucide/svelte/icons/search'
    import Undo2 from '@lucide/svelte/icons/undo-2'
    import * as Dialog from '$lib/components/ui/dialog'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import { Button, buttonVariants } from '$lib/components/ui/button'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'
    import Keycaps from '$lib/components/Keycaps.svelte'
    import { dataStore } from '$lib/stores/data'
    import type { SimpleTrack } from '$lib/stores/data/cache'
    import { cn } from '$lib/utils.js'

    type View = 'list' | 'grid'
    const VIEW_KEY = 'local:chorus_blocked_view'

    let { open = false }: { open?: boolean } = $props()
    let searchQuery = $state('')
    let selectedTracks = $state<Set<string>>(new Set())
    let blockedTracks = $state<SimpleTrack[]>([])
    let view = $state<View>('list')

    // Newest block first; entries from before the timestamp existed sink to the end.
    function refreshBlockedTracks() {
        blockedTracks = [...dataStore.blocked].sort(
            (a, b) => (b.blocked_at ?? 0) - (a.blocked_at ?? 0)
        )
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

    onMount(() => {
        storage.getItem<View>(VIEW_KEY).then((saved) => {
            if (saved === 'grid' || saved === 'list') view = saved
        })
    })

    async function setView(next: string) {
        view = next as View
        await storage.setItem(VIEW_KEY, view)
    }

    const filteredTracks = $derived(
        blockedTracks.filter((track) => {
            if (!searchQuery) return true
            return track.song_id.toLowerCase().includes(searchQuery.toLowerCase())
        })
    )

    const blockedCount = $derived(blockedTracks.length)
    const allSelected = $derived(
        filteredTracks.length > 0 && filteredTracks.every((t) => selectedTracks.has(t.track_id))
    )
    const someSelected = $derived(!allSelected && selectedTracks.size > 0)

    function toggleSelectAll() {
        selectedTracks = allSelected ? new Set() : new Set(filteredTracks.map((t) => t.track_id))
    }

    function toggleTrackSelection(trackId: string) {
        const next = new Set(selectedTracks)
        if (next.has(trackId)) next.delete(trackId)
        else next.add(trackId)
        selectedTracks = next
    }

    async function unblock(trackIds: string[]) {
        await Promise.all(
            trackIds.map((track_id) =>
                dataStore.updateTrack({ track_id, value: { blocked: null, blocked_at: null } })
            )
        )
        const next = new Set(selectedTracks)
        trackIds.forEach((id) => next.delete(id))
        selectedTracks = next
        refreshBlockedTracks()

        trackIds.forEach((track_id) => {
            document.dispatchEvent(
                new CustomEvent('chorus:track-unblocked', { detail: { track_id } })
            )
        })
    }

    const unblockTrack = (trackId: string) => unblock([trackId])
    const unblockSelected = () => unblock(Array.from(selectedTracks))

    function parseSongId(songId: string): { title: string; artists: string } {
        const parts = songId.split(' by ')
        return {
            title: parts[0] || '',
            artists: parts.slice(1).join(', ') || ''
        }
    }

    const MINUTE = 60_000
    const HOUR = 60 * MINUTE
    const DAY = 24 * HOUR
    const WEEK = 7 * DAY
    const MONTH = 30 * DAY
    const YEAR = 365 * DAY

    /** "3d ago"-style age of a block; null when the entry predates the timestamp. */
    function blockedAgo(at?: number | null): string | null {
        if (!at) return null
        const elapsed = Date.now() - at
        if (elapsed < MINUTE) return 'just now'
        if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`
        if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`
        if (elapsed < WEEK) return `${Math.floor(elapsed / DAY)}d ago`
        if (elapsed < MONTH) return `${Math.floor(elapsed / WEEK)}w ago`
        if (elapsed < YEAR) return `${Math.floor(elapsed / MONTH)}mo ago`
        return `${Math.floor(elapsed / YEAR)}y ago`
    }

    const blockedOn = (at?: number | null) => (at ? new Date(at).toLocaleString() : undefined)

    const triggerLabel = $derived(
        blockedCount ? `Blocked tracks (${blockedCount})` : 'Blocked tracks'
    )

    const VIEW_OPTIONS = [
        { label: 'List', value: 'list', icon: List },
        { label: 'Grid', value: 'grid', icon: LayoutGrid }
    ]

    const checkboxBox =
        'inline-flex shrink-0 items-center justify-center rounded-[3px] transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-signal peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-panel'
</script>

{#snippet selectionBar(framed: boolean)}
    <div
        class={cn(
            'flex shrink-0 items-center justify-between gap-x-3 border-signal/30 bg-signal/10 px-3.5 py-2 text-xs',
            framed ? 'border-t' : 'rounded-lg border'
        )}
    >
        <span>
            <span class="font-semibold text-ink-fg">{selectedTracks.size} selected</span>
            <span class="text-ink-muted"> · they play again straight away</span>
        </span>
        <div class="flex items-center gap-x-1.5">
            <Button variant="ghost" size="sm" onclick={() => (selectedTracks = new Set())}>
                Clear
            </Button>
            <Button size="sm" onclick={unblockSelected}>Unblock {selectedTracks.size}</Button>
        </div>
    </div>
{/snippet}

{#snippet listHeader()}
    <div class="flex h-9 shrink-0 items-center justify-between gap-x-3 px-3.5">
        <label class="flex cursor-pointer items-center gap-x-3 text-[11px] text-ink-muted">
            <input
                type="checkbox"
                checked={allSelected}
                indeterminate={someSelected}
                onchange={toggleSelectAll}
                aria-label="Select all shown"
                class="peer sr-only"
            />
            <span
                aria-hidden="true"
                class={cn(
                    checkboxBox,
                    'size-3.5',
                    allSelected || someSelected
                        ? 'bg-signal text-ink'
                        : 'border-[1.5px] border-hairline-strong'
                )}
            >
                {#if allSelected}
                    <Check class="size-2.5" strokeWidth={3.5} />
                {:else if someSelected}
                    <Minus class="size-2.5" strokeWidth={3.5} />
                {/if}
            </span>
            {blockedCount} blocked{searchQuery ? ` · ${filteredTracks.length} match` : ''}
        </label>
        {#if selectedTracks.size === 0}
            <span class="text-[11px] text-ink-dim">
                Click a {view === 'grid' ? 'cover' : 'row'} to select it
            </span>
        {/if}
    </div>
{/snippet}

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
                        <OctagonX />
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
                    <OctagonX class="size-4" />
                </span>
                <div class="flex flex-col gap-y-0.5">
                    <Dialog.Title class="text-base font-semibold tracking-tight text-ink-fg"
                        >Blocked tracks</Dialog.Title
                    >
                    <Dialog.Description class="text-xs text-ink-muted">
                        Skipped automatically in playlists, albums, radio and the queue
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
                <SegmentedControl
                    size="md"
                    ariaLabel="View"
                    value={view}
                    onValueChange={setView}
                    options={VIEW_OPTIONS}
                />
            </div>

            {#if filteredTracks.length === 0}
                <div
                    class="flex min-h-0 flex-1 flex-col items-center justify-center gap-y-2 rounded-lg border border-hairline bg-panel p-10 text-center"
                >
                    <OctagonX class="size-8 text-ink-dim" />
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
            {:else if view === 'list'}
                <div
                    class="flex min-h-0 shrink flex-col overflow-hidden rounded-lg border border-hairline bg-panel"
                >
                    <div class="border-b border-hairline">
                        {@render listHeader()}
                    </div>
                    <div class="chorus-scroll min-h-0 overflow-y-auto">
                        {#each filteredTracks as track (track.track_id ?? track.song_id)}
                            {@const { title, artists } = parseSongId(track.song_id)}
                            {@const isSelected = selectedTracks.has(track.track_id)}
                            {@const ago = blockedAgo(track.blocked_at)}
                            <div
                                class={cn(
                                    'flex items-center gap-x-2 border-t border-hairline pr-2 transition-colors first:border-t-0',
                                    isSelected ? 'bg-signal/[0.06]' : 'hover:bg-surface/60'
                                )}
                            >
                                <label
                                    class="flex min-w-0 flex-1 cursor-pointer items-center gap-x-3 py-2 pl-3.5"
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onchange={() => toggleTrackSelection(track.track_id)}
                                        aria-label={`Select ${title}`}
                                        class="peer sr-only"
                                    />
                                    <span
                                        aria-hidden="true"
                                        class={cn(
                                            checkboxBox,
                                            'size-3.5',
                                            isSelected
                                                ? 'bg-signal text-ink'
                                                : 'border-[1.5px] border-hairline-strong'
                                        )}
                                    >
                                        {#if isSelected}
                                            <Check class="size-2.5" strokeWidth={3.5} />
                                        {/if}
                                    </span>
                                    <span
                                        class="inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded bg-surface-2 text-ink-dim"
                                    >
                                        {#if track.cover}
                                            <img
                                                src={track.cover}
                                                alt=""
                                                class="size-full object-cover"
                                            />
                                        {:else}
                                            <Music class="size-3.5" />
                                        {/if}
                                    </span>
                                    <span class="flex min-w-0 flex-1 flex-col">
                                        <span class="truncate text-[13px] font-medium text-ink-fg"
                                            >{title}</span
                                        >
                                        <span class="truncate text-[11px] text-ink-muted"
                                            >{artists}</span
                                        >
                                    </span>
                                </label>
                                {#if ago}
                                    <span
                                        class="shrink-0 font-mono text-[10px] text-ink-muted"
                                        title={blockedOn(track.blocked_at)}>{ago}</span
                                    >
                                {/if}
                                <Button
                                    variant="ghost"
                                    size="xs"
                                    class="gap-x-1 text-ink-muted hover:text-ink-fg [&_svg]:size-3.5"
                                    aria-label={`Unblock ${title}`}
                                    onclick={() => unblockTrack(track.track_id)}
                                >
                                    <Undo2 />
                                    Unblock
                                </Button>
                            </div>
                        {/each}
                    </div>
                    {#if selectedTracks.size > 0}
                        {@render selectionBar(true)}
                    {/if}
                </div>
            {:else}
                <div class="flex min-h-0 shrink flex-col gap-y-2">
                    {@render listHeader()}
                    <div class="chorus-scroll min-h-0 overflow-y-auto">
                        <div class="grid grid-cols-5 gap-x-3.5 gap-y-4 p-0.5">
                            {#each filteredTracks as track (track.track_id ?? track.song_id)}
                                {@const { title, artists } = parseSongId(track.song_id)}
                                {@const isSelected = selectedTracks.has(track.track_id)}
                                {@const ago = blockedAgo(track.blocked_at)}
                                <div class="group flex min-w-0 flex-col gap-y-1">
                                    <div
                                        class={cn(
                                            'relative aspect-square w-full overflow-hidden rounded-md bg-surface-2 text-ink-dim',
                                            isSelected && 'ring-2 ring-signal'
                                        )}
                                    >
                                        {#if track.cover}
                                            <img
                                                src={track.cover}
                                                alt=""
                                                class="size-full object-cover"
                                            />
                                        {:else}
                                            <div class="flex size-full items-center justify-center">
                                                <Music class="size-6" />
                                            </div>
                                        {/if}
                                        <label class="absolute inset-0 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onchange={() =>
                                                    toggleTrackSelection(track.track_id)}
                                                aria-label={`Select ${title}`}
                                                class="peer sr-only"
                                            />
                                            <span
                                                aria-hidden="true"
                                                class={cn(
                                                    'absolute left-2 top-2 inline-flex size-[18px] items-center justify-center rounded transition-opacity peer-focus-visible:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-signal',
                                                    isSelected
                                                        ? 'bg-signal text-ink'
                                                        : 'border-[1.5px] border-ink-fg/70 bg-ink/40 opacity-0 group-hover:opacity-100'
                                                )}
                                            >
                                                {#if isSelected}
                                                    <Check class="size-3" strokeWidth={3.5} />
                                                {/if}
                                            </span>
                                        </label>
                                        <div
                                            class="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
                                        >
                                            <button
                                                type="button"
                                                aria-label={`Unblock ${title}`}
                                                onclick={() => unblockTrack(track.track_id)}
                                                class="pointer-events-auto inline-flex h-6 items-center gap-x-1 rounded-full bg-ink-fg px-2.5 text-[11px] font-semibold text-ink shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                                            >
                                                <Undo2 class="size-3" strokeWidth={2.5} />
                                                Unblock
                                            </button>
                                        </div>
                                    </div>
                                    <span class="truncate text-xs font-medium text-ink-fg"
                                        >{title}</span
                                    >
                                    <span class="truncate text-[11px] text-ink-muted"
                                        >{artists}</span
                                    >
                                    {#if ago}
                                        <span
                                            class="font-mono text-[10px] text-ink-muted"
                                            title={blockedOn(track.blocked_at)}>{ago}</span
                                        >
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                    {#if selectedTracks.size > 0}
                        {@render selectionBar(false)}
                    {/if}
                </div>
            {/if}

            <div class="flex shrink-0 flex-wrap items-center gap-x-1 text-[11px] text-ink-muted">
                Block the playing track with
                <Keycaps combo="Alt+Shift+B" />
                or the ⊘ on any row of a tracklist. Unblocking takes effect right away.
            </div>
        </div>
    </Dialog.Content>
</Dialog.Root>
