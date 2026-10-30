<script lang="ts">
    import { onMount } from 'svelte'
    import { storage } from '@wxt-dev/storage'
    import { toast } from 'svelte-sonner'
    import ListMusic from '@lucide/svelte/icons/list-music'
    import Check from '@lucide/svelte/icons/check'
    import LayoutGrid from '@lucide/svelte/icons/layout-grid'
    import List from '@lucide/svelte/icons/list'
    import Minus from '@lucide/svelte/icons/minus'
    import Music from '@lucide/svelte/icons/music'
    import Search from '@lucide/svelte/icons/search'
    import Play from '@lucide/svelte/icons/play'
    import Pause from '@lucide/svelte/icons/pause'
    import Pencil from '@lucide/svelte/icons/pencil'
    import Scissors from '@lucide/svelte/icons/scissors'
    import Trash2 from '@lucide/svelte/icons/trash-2'
    import * as Dialog from '$lib/components/ui/dialog'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import { Button, buttonVariants } from '$lib/components/ui/button'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'
    import { dataStore } from '$lib/stores/data'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { mediaStore } from '$lib/stores/media'
    import { getPlayerService } from '$lib/api/services/player'
    import type { Collection, SimpleTrack } from '$lib/stores/data/cache'
    import { cn } from '$lib/utils.js'
    import { timeAgo } from '$lib/utils/time-ago'
    import { formatRulerTime } from '$lib/utils/snip-time'
    import {
        describeRanges,
        parseSongId,
        rangesLength,
        snippedTracks
    } from '$lib/utils/snip-library'

    // Every track with saved sections, newest first: play it, open it in the
    // editor, or drop the snip. The shell, and the list / grid pair, are the
    // blocked-tracks dialog's.
    type View = 'list' | 'grid'
    const VIEW_KEY = 'local:chorus_snips_view'

    let { open = false }: { open?: boolean } = $props()
    let searchQuery = $state('')
    let selectedTracks = $state<Set<string>>(new Set())
    let tracks = $state<SimpleTrack[]>([])
    let starting = $state<string | null>(null)
    let view = $state<View>('list')

    // A list that cannot be built must not take the dialog down with it: an
    // error here used to leave the page behind the scrim with no dialog.
    function withSnips(collection: SimpleTrack[]): SimpleTrack[] {
        try {
            return snippedTracks(collection)
        } catch (error) {
            console.error('[chorus] could not list the snips', error)
            return []
        }
    }

    function refresh() {
        tracks = withSnips(dataStore.collection)
    }

    $effect(() => {
        if (open) refresh()
    })

    onMount(() => {
        storage.getItem<View>(VIEW_KEY).then((saved) => {
            if (saved === 'grid' || saved === 'list') view = saved
        })
        // Saves and removals from any Chorus surface (the editor, PiP, a restore)
        // land in storage; read the written value, since this page's cache may lag.
        return storage.watch<Collection>('local:chorus_collection', (collection) => {
            if (collection) tracks = withSnips(Object.values(collection))
        })
    })

    async function setView(next: string) {
        view = next as View
        await storage.setItem(VIEW_KEY, view)
    }

    const filteredTracks = $derived(
        tracks.filter((track) => {
            if (!searchQuery) return true
            return (track.song_id ?? '').toLowerCase().includes(searchQuery.toLowerCase())
        })
    )

    const count = $derived(tracks.length)
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

    const isCurrent = (track: SimpleTrack) => $nowPlaying.track_id === track.track_id
    const isPlaying = (track: SimpleTrack) => isCurrent(track) && $mediaStore.playing

    function clickPlayPause() {
        const button = document.querySelector<HTMLButtonElement>(
            'button[data-testid="control-button-playpause"]'
        )
        button?.click()
    }

    /** Start the track through Spotify Connect; its snip applies as it starts. */
    async function start(track: SimpleTrack) {
        starting = track.track_id
        try {
            await getPlayerService().playRelease(`spotify:track:${track.track_id}`)
        } catch (error) {
            console.error('Error playing snipped track:', error)
            toast.error('Could not start that track')
        } finally {
            starting = null
        }
    }

    const play = (track: SimpleTrack) => (isCurrent(track) ? clickPlayPause() : start(track))

    /** Play the track, then open the Chorus controls on the Snip tab, where its sections are edited. */
    async function edit(track: SimpleTrack) {
        if (!isCurrent(track)) await start(track)
        await storage.setItem('local:chorus_view', 'snip')
        open = false
        // Let this dialog close before the popover opens, so focus lands in the editor.
        setTimeout(() => document.getElementById('chorus-settings')?.click(), 150)
    }

    async function remove(trackIds: string[]) {
        await Promise.all(
            trackIds.map((track_id) =>
                dataStore.updateTrack({ track_id, value: { snip: null, snipped_at: null } })
            )
        )
        // The playing track follows the now-playing state, not the collection.
        if ($nowPlaying.track_id && trackIds.includes($nowPlaying.track_id)) {
            nowPlaying.set({ ...$nowPlaying, snip: null })
        }
        const next = new Set(selectedTracks)
        trackIds.forEach((id) => next.delete(id))
        selectedTracks = next
        refresh()
    }

    const removeTrack = (trackId: string) => remove([trackId])
    const removeSelected = () => remove(Array.from(selectedTracks))

    const savedOn = (at?: number | null) => (at ? new Date(at).toLocaleString() : undefined)
    const sectionsTitle = (snip: NonNullable<SimpleTrack['snip']>) =>
        `${snip.ranges.length} section${snip.ranges.length === 1 ? '' : 's'}, ${formatRulerTime(rangesLength(snip))} in all`

    const triggerLabel = $derived(count ? `Snips (${count})` : 'Snips')

    const VIEW_OPTIONS = [
        { label: 'List', value: 'list', icon: List },
        { label: 'Grid', value: 'grid', icon: LayoutGrid }
    ]

    const checkboxBox =
        'inline-flex shrink-0 items-center justify-center rounded-[3px] transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-signal peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-panel'
    const onCoverButton =
        'pointer-events-auto inline-flex h-6 items-center justify-center rounded-full shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal'
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
            <span class="text-ink-muted"> · the tracks play whole again</span>
        </span>
        <div class="flex items-center gap-x-1.5">
            <Button variant="ghost" size="sm" onclick={() => (selectedTracks = new Set())}>
                Clear
            </Button>
            <Button size="sm" onclick={removeSelected}>Remove {selectedTracks.size}</Button>
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
            {count} snipped{searchQuery ? ` · ${filteredTracks.length} match` : ''}
        </label>
        {#if selectedTracks.size === 0}
            <span class="text-[11px] text-ink-dim">
                Click a {view === 'grid' ? 'cover' : 'row'} to select it
            </span>
        {/if}
    </div>
{/snippet}

{#snippet modePill(mode: 'play' | 'skip', onCover: boolean)}
    <span
        class={cn(
            'inline-flex h-[18px] shrink-0 items-center gap-x-1 rounded-full px-1.5 font-mono text-[10px] uppercase tracking-[0.12em]',
            mode === 'play'
                ? onCover
                    ? 'bg-signal text-ink shadow-float'
                    : 'bg-signal/15 text-signal'
                : onCover
                  ? 'bg-ink/80 text-ink-fg shadow-float'
                  : 'bg-surface-2 text-ink-fg-2'
        )}
    >
        {#if mode === 'play'}
            <Play class="size-2.5" strokeWidth={2.5} />
        {:else}
            <Scissors class="size-2.5" strokeWidth={2.5} />
        {/if}
        {mode === 'play' ? 'Play' : 'Skip'}
    </span>
{/snippet}

{#snippet failedNote()}
    <p class="px-3.5 py-3 text-xs text-ink-muted">
        Some of these snips could not be shown. The others still play.
    </p>
{/snippet}

<Dialog.Root bind:open>
    <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
            <Tooltip.Trigger>
                {#snippet child({ props: tooltipProps })}
                    <Dialog.Trigger
                        {...tooltipProps}
                        id="snips-dialog-trigger"
                        aria-label={triggerLabel}
                        class={buttonVariants({
                            variant: 'bar',
                            size: 'icon-sm',
                            class: 'relative [&_svg]:size-[18px]'
                        })}
                    >
                        <ListMusic />
                        {#if count > 0}
                            <span
                                class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-signal px-1 font-mono text-[9px] font-bold text-ink"
                            >
                                {count > 99 ? '99+' : count}
                            </span>
                        {/if}
                    </Dialog.Trigger>
                {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom">{triggerLabel}</Tooltip.Content>
        </Tooltip.Root>
    </Tooltip.Provider>

    <Dialog.Content
        id="snips-dialog-content"
        class="flex h-[600px] max-h-[90vh] w-[760px] max-w-[92vw] flex-col gap-0 overflow-hidden p-0"
    >
        <div class="flex items-start justify-between px-6 pb-3.5 pt-5">
            <div class="flex items-center gap-x-3">
                <span
                    class="inline-flex size-8 items-center justify-center rounded-lg bg-surface text-ink-fg"
                >
                    <ListMusic class="size-4" />
                </span>
                <div class="flex flex-col gap-y-0.5">
                    <Dialog.Title class="text-base font-semibold tracking-tight text-ink-fg"
                        >Snips</Dialog.Title
                    >
                    <Dialog.Description class="text-xs text-ink-muted">
                        Tracks with saved sections: only those play, or they are skipped, every time
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
                        aria-label="Search snips"
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
                    <ListMusic class="size-8 text-ink-dim" />
                    {#if searchQuery}
                        <p class="text-[13px] text-ink-fg-2">No snips match “{searchQuery}”</p>
                    {:else}
                        <p class="text-[13px] text-ink-fg-2">No snips yet</p>
                        <p class="text-xs text-ink-muted">
                            Mark sections of the playing track in the Snip tab of the Chorus
                            controls and save them; they will be listed here.
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
                        <svelte:boundary
                            onerror={(error) =>
                                console.error('[chorus] a snip row failed to render', error)}
                        >
                            {#each filteredTracks as track, i (track.track_id || track.song_id || i)}
                                {@const { title, artists } = parseSongId(track.song_id)}
                                {@const shownTitle = title || 'Untitled track'}
                                {@const snip = track.snip!}
                                {@const isSelected = selectedTracks.has(track.track_id)}
                                {@const ago = timeAgo(track.snipped_at)}
                                {@const current = isCurrent(track)}
                                {@const playing = isPlaying(track)}
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
                                            <span
                                                class={cn(
                                                    'truncate text-[13px] font-medium',
                                                    current ? 'text-signal' : 'text-ink-fg'
                                                )}>{shownTitle}</span
                                            >
                                            <span class="truncate text-[11px] text-ink-muted"
                                                >{artists}</span
                                            >
                                        </span>
                                        <span
                                            class="flex w-[236px] shrink-0 items-center gap-x-2"
                                            title={sectionsTitle(snip)}
                                        >
                                            {@render modePill(snip.mode, false)}
                                            <span
                                                class="truncate font-mono text-[11px] text-ink-muted"
                                                >{describeRanges(snip, 2)}</span
                                            >
                                        </span>
                                    </label>
                                    <span
                                        class="w-12 shrink-0 whitespace-nowrap text-right font-mono text-[10px] text-ink-muted"
                                        title={savedOn(track.snipped_at)}>{ago ?? ''}</span
                                    >
                                    <Button
                                        variant="ghost"
                                        size="xs"
                                        class={cn(
                                            'gap-x-1 hover:text-ink-fg [&_svg]:size-3.5',
                                            current ? 'text-signal' : 'text-ink-muted'
                                        )}
                                        aria-label={`${playing ? 'Pause' : 'Play'} ${title}`}
                                        disabled={starting === track.track_id}
                                        onclick={() => play(track)}
                                    >
                                        {#if playing}
                                            <Pause />
                                            Pause
                                        {:else}
                                            <Play />
                                            Play
                                        {/if}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="xs"
                                        class="gap-x-1 text-ink-muted hover:text-ink-fg [&_svg]:size-3.5"
                                        aria-label={`Edit the snip of ${title}`}
                                        onclick={() => edit(track)}
                                    >
                                        <Pencil />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="xs"
                                        class="gap-x-1 text-ink-muted hover:text-alarm [&_svg]:size-3.5"
                                        aria-label={`Remove the snip of ${title}`}
                                        onclick={() => removeTrack(track.track_id)}
                                    >
                                        <Trash2 />
                                        Remove
                                    </Button>
                                </div>
                            {/each}
                            {#snippet failed()}
                                {@render failedNote()}
                            {/snippet}
                        </svelte:boundary>
                    </div>
                    {#if selectedTracks.size > 0}
                        {@render selectionBar(true)}
                    {/if}
                </div>
            {:else}
                <!-- Grid: the cover carries the mode, the selection box and, on hover, the actions. -->
                <div class="flex min-h-0 shrink flex-col gap-y-2">
                    {@render listHeader()}
                    <div class="chorus-scroll min-h-0 overflow-y-auto">
                        <svelte:boundary
                            onerror={(error) =>
                                console.error('[chorus] a snip card failed to render', error)}
                        >
                            <div class="grid grid-cols-5 gap-x-3.5 gap-y-4 p-0.5">
                                {#each filteredTracks as track, i (track.track_id || track.song_id || i)}
                                    {@const { title, artists } = parseSongId(track.song_id)}
                                    {@const shownTitle = title || 'Untitled track'}
                                    {@const snip = track.snip!}
                                    {@const isSelected = selectedTracks.has(track.track_id)}
                                    {@const ago = timeAgo(track.snipped_at)}
                                    {@const current = isCurrent(track)}
                                    {@const playing = isPlaying(track)}
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
                                                <div
                                                    class="flex size-full items-center justify-center"
                                                >
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
                                            <span
                                                class="pointer-events-none absolute right-2 top-2"
                                                title={sectionsTitle(snip)}
                                            >
                                                {@render modePill(snip.mode, true)}
                                            </span>
                                            <div
                                                class="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-x-1.5 p-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
                                            >
                                                <button
                                                    type="button"
                                                    aria-label={`${playing ? 'Pause' : 'Play'} ${title}`}
                                                    disabled={starting === track.track_id}
                                                    onclick={() => play(track)}
                                                    class={cn(
                                                        onCoverButton,
                                                        'gap-x-1 bg-ink-fg px-2.5 text-[11px] font-semibold text-ink disabled:opacity-60'
                                                    )}
                                                >
                                                    {#if playing}
                                                        <Pause class="size-3" strokeWidth={2.5} />
                                                        Pause
                                                    {:else}
                                                        <Play class="size-3" strokeWidth={2.5} />
                                                        Play
                                                    {/if}
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label={`Edit the snip of ${title}`}
                                                    onclick={() => edit(track)}
                                                    class={cn(
                                                        onCoverButton,
                                                        'w-6 bg-ink/80 text-ink-fg hover:bg-ink'
                                                    )}
                                                >
                                                    <Pencil class="size-3" strokeWidth={2.5} />
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label={`Remove the snip of ${title}`}
                                                    onclick={() => removeTrack(track.track_id)}
                                                    class={cn(
                                                        onCoverButton,
                                                        'w-6 bg-ink/80 text-ink-fg hover:bg-ink hover:text-alarm'
                                                    )}
                                                >
                                                    <Trash2 class="size-3" strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </div>
                                        <span
                                            class={cn(
                                                'truncate text-xs font-medium',
                                                current ? 'text-signal' : 'text-ink-fg'
                                            )}>{shownTitle}</span
                                        >
                                        <span class="truncate text-[11px] text-ink-muted"
                                            >{artists}</span
                                        >
                                        <span
                                            class="flex items-center justify-between gap-x-2 font-mono text-[10px] text-ink-muted"
                                        >
                                            <span class="truncate" title={sectionsTitle(snip)}
                                                >{describeRanges(snip, 1)}</span
                                            >
                                            {#if ago}
                                                <span
                                                    class="shrink-0"
                                                    title={savedOn(track.snipped_at)}>{ago}</span
                                                >
                                            {/if}
                                        </span>
                                    </div>
                                {/each}
                            </div>
                            {#snippet failed()}
                                {@render failedNote()}
                            {/snippet}
                        </svelte:boundary>
                    </div>
                    {#if selectedTracks.size > 0}
                        {@render selectionBar(false)}
                    {/if}
                </div>
            {/if}

            <div class="flex shrink-0 flex-wrap items-center gap-x-1 text-[11px] text-ink-muted">
                Play starts the track with its snip applied; Edit opens it in the Snip tab of the
                Chorus controls. Removing a snip takes effect right away.
            </div>
        </div>
    </Dialog.Content>
</Dialog.Root>
