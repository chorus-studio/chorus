<script lang="ts">
    import { onMount } from 'svelte'
    import { storage } from '@wxt-dev/storage'
    import { toast } from 'svelte-sonner'
    import ListMusic from '@lucide/svelte/icons/list-music'
    import Check from '@lucide/svelte/icons/check'
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
    import { dataStore } from '$lib/stores/data'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { mediaStore } from '$lib/stores/media'
    import { getPlayerService } from '$lib/api/services/player'
    import type { Collection, SimpleTrack } from '$lib/stores/data/cache'
    import { cn } from '$lib/utils.js'
    import { timeAgo } from '$lib/utils/time-ago'
    import { formatRulerTime } from '$lib/utils/snip-time'
    import { describeRanges, parseSongId, rangesLength, sortSnipped } from '$lib/utils/snip-library'

    // Every track with saved sections, newest first: play it, open it in the
    // editor, or drop the snip. The shell is the blocked-tracks dialog's.
    let { open = false }: { open?: boolean } = $props()
    let searchQuery = $state('')
    let selectedTracks = $state<Set<string>>(new Set())
    let tracks = $state<SimpleTrack[]>([])
    let starting = $state<string | null>(null)

    const withSnips = (collection: SimpleTrack[]) => sortSnipped(collection.filter((t) => t.snip))

    function refresh() {
        tracks = withSnips(dataStore.collection)
    }

    $effect(() => {
        if (open) refresh()
    })

    onMount(() =>
        // Saves and removals from any Chorus surface (the editor, PiP, a restore)
        // land in storage; read the written value, since this page's cache may lag.
        storage.watch<Collection>('local:chorus_collection', (collection) => {
            if (collection) tracks = withSnips(Object.values(collection))
        })
    )

    const filteredTracks = $derived(
        tracks.filter((track) => {
            if (!searchQuery) return true
            return track.song_id.toLowerCase().includes(searchQuery.toLowerCase())
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

    const triggerLabel = $derived(count ? `Snips (${count})` : 'Snips')

    const checkboxBox =
        'inline-flex shrink-0 items-center justify-center rounded-[3px] transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-signal peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-panel'
</script>

{#snippet selectionBar()}
    <div
        class="flex shrink-0 items-center justify-between gap-x-3 border-t border-signal/30 bg-signal/10 px-3.5 py-2 text-xs"
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
            <label class="relative">
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
            {:else}
                <div
                    class="flex min-h-0 shrink flex-col overflow-hidden rounded-lg border border-hairline bg-panel"
                >
                    <div
                        class="flex h-9 shrink-0 items-center justify-between gap-x-3 border-b border-hairline px-3.5"
                    >
                        <label
                            class="flex cursor-pointer items-center gap-x-3 text-[11px] text-ink-muted"
                        >
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
                            <span class="text-[11px] text-ink-dim">Click a row to select it</span>
                        {/if}
                    </div>
                    <div class="chorus-scroll min-h-0 overflow-y-auto">
                        {#each filteredTracks as track (track.track_id ?? track.song_id)}
                            {@const { title, artists } = parseSongId(track.song_id)}
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
                                            )}>{title}</span
                                        >
                                        <span class="truncate text-[11px] text-ink-muted"
                                            >{artists}</span
                                        >
                                    </span>
                                    <span
                                        class="flex w-[236px] shrink-0 items-center gap-x-2"
                                        title={`${snip.ranges.length} section${snip.ranges.length === 1 ? '' : 's'}, ${formatRulerTime(rangesLength(snip))} in all`}
                                    >
                                        <span
                                            class={cn(
                                                'inline-flex h-[18px] shrink-0 items-center gap-x-1 rounded-full px-1.5 font-mono text-[10px] uppercase tracking-[0.12em]',
                                                snip.mode === 'play'
                                                    ? 'bg-signal/15 text-signal'
                                                    : 'bg-surface-2 text-ink-fg-2'
                                            )}
                                        >
                                            {#if snip.mode === 'play'}
                                                <Play class="size-2.5" strokeWidth={2.5} />
                                            {:else}
                                                <Scissors class="size-2.5" strokeWidth={2.5} />
                                            {/if}
                                            {snip.mode === 'play' ? 'Play' : 'Skip'}
                                        </span>
                                        <span class="truncate font-mono text-[11px] text-ink-muted"
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
                    </div>
                    {#if selectedTracks.size > 0}
                        {@render selectionBar()}
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
