<script lang="ts">
    import { Ban, X, Check } from 'lucide-svelte'
    import Tippy from '$lib/components/Tippy.svelte'
    import * as Dialog from '$lib/components/ui/dialog'
    import { Input } from '$lib/components/ui/input'
    import { Button } from '$lib/components/ui/button'
    import { Separator } from '$lib/components/ui/separator'
    import { dataStore } from '$lib/stores/data'
    import type { SimpleTrack } from '$lib/stores/data/cache'

    let searchQuery = $state('')
    let selectedTracks = $state<Set<string>>(new Set())
    let blockedTracks = $state<SimpleTrack[]>([])
    let refreshInterval: NodeJS.Timeout | null = null

    // Refresh blocked tracks list from dataStore
    function refreshBlockedTracks() {
        blockedTracks = dataStore.blocked
    }

    // Poll for changes every 500ms when dialog is open
    $effect(() => {
        refreshBlockedTracks()
        refreshInterval = setInterval(refreshBlockedTracks, 500)

        return () => {
            if (refreshInterval) {
                clearInterval(refreshInterval)
            }
        }
    })

    // Filter tracks based on search query
    let filteredTracks = $derived(
        blockedTracks.filter((track) => {
            if (!searchQuery) return true
            const query = searchQuery.toLowerCase()
            const songId = track.song_id.toLowerCase()
            return songId.includes(query)
        })
    )

    let blockedCount = $derived(blockedTracks.length)
    let selectAll = $derived(selectedTracks.size === filteredTracks.length && filteredTracks.length > 0)

    function toggleSelectAll() {
        if (selectAll) {
            selectedTracks = new Set()
        } else {
            selectedTracks = new Set(filteredTracks.map((t) => t.track_id))
        }
    }

    function toggleTrackSelection(trackId: string) {
        if (selectedTracks.has(trackId)) {
            selectedTracks.delete(trackId)
        } else {
            selectedTracks.add(trackId)
        }
        // Trigger reactivity
        selectedTracks = selectedTracks
    }

    async function unblockTrack(trackId: string) {
        await dataStore.updateTrack({
            track_id: trackId,
            value: { blocked: null }
        })
        selectedTracks.delete(trackId)
        selectedTracks = selectedTracks
        refreshBlockedTracks()

        // Emit event for reactive updates
        document.dispatchEvent(
            new CustomEvent('chorus:track-unblocked', { detail: { track_id: trackId } })
        )
    }

    async function unblockSelected() {
        const trackIds = Array.from(selectedTracks)
        await Promise.all(
            trackIds.map((trackId) =>
                dataStore.updateTrack({
                    track_id: trackId,
                    value: { blocked: null }
                })
            )
        )
        selectedTracks = new Set()
        refreshBlockedTracks()

        // Emit events for each unblocked track
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
</script>

<Dialog.Root>
    <Dialog.Trigger id="blocked-tracks-dialog-trigger" class="flex items-center justify-center">
        <Tippy text="blocked tracks" side="bottom" class="relative size-7 [&_svg]:size-[18px]">
            <Ban class="size-[18px] mt-0.5" />
            {#if blockedCount > 0}
                <span
                    class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1ed760] px-1 text-[10px] font-bold text-black"
                >
                    {blockedCount}
                </span>
            {/if}
        </Tippy>
    </Dialog.Trigger>
    <Dialog.Content
        id="blocked-tracks-dialog-content"
        class="max-h-[90vh] w-3/4 max-w-3xl overflow-hidden rounded-md bg-primary-foreground p-8"
    >
        <Dialog.Title>Blocked Tracks</Dialog.Title>
        <Separator class="h-0.5 w-full" />

        <div class="mt-4 flex flex-col gap-4">
            <!-- Search and Bulk Actions -->
            <div class="flex items-center justify-between gap-4">
                <Input
                    type="text"
                    placeholder="Search by track name or artists..."
                    bind:value={searchQuery}
                    class="flex-1"
                />
                {#if filteredTracks.length > 0}
                    <Button
                        size="sm"
                        variant="outline"
                        onclick={toggleSelectAll}
                        aria-label={selectAll ? 'Deselect All' : 'Select All'}
                    >
                        {selectAll ? 'Deselect All' : 'Select All'}
                    </Button>
                {/if}
            </div>

            {#if selectedTracks.size > 0}
                <div class="flex items-center justify-between rounded-md bg-muted p-3">
                    <span class="text-sm font-medium"
                        >{selectedTracks.size} track{selectedTracks.size === 1 ? '' : 's'} selected</span
                    >
                    <Button size="sm" onclick={unblockSelected}>Unblock Selected</Button>
                </div>
            {/if}

            <!-- Blocked Tracks List -->
            <div class="min-h-[50vh] max-h-[50vh] overflow-y-auto rounded-md border border-border">
                {#if filteredTracks.length === 0}
                    <div class="flex h-full flex-col items-center justify-center gap-2 p-12 text-center">
                        {#if searchQuery}
                            <Ban class="size-12 opacity-20" />
                            <p class="text-sm text-muted-foreground">
                                No blocked tracks match your search
                            </p>
                        {:else}
                            <Ban class="size-12 opacity-20" />
                            <p class="text-sm text-muted-foreground">No blocked tracks</p>
                            <p class="text-xs text-muted-foreground">
                                Blocked tracks will appear here
                            </p>
                        {/if}
                    </div>
                {:else}
                    {#each filteredTracks as track (track.track_id)}
                        {@const { title, artists } = parseSongId(track.song_id)}
                        {@const isSelected = selectedTracks.has(track.track_id)}
                        <div
                            class="flex items-center gap-4 border-b border-border p-4 last:border-b-0 hover:bg-muted/50"
                        >
                            <!-- Selection Indicator -->
                            <button
                                type="button"
                                onclick={() => toggleTrackSelection(track.track_id)}
                                class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors {isSelected
                                    ? 'border-[#1ed760] bg-[#1ed760]'
                                    : 'border-muted-foreground'}"
                                aria-label={`Select ${title}`}
                            >
                                {#if isSelected}
                                    <Check class="size-3 text-black" />
                                {/if}
                            </button>

                            <!-- Cover Art -->
                            <div class="h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                                {#if track.cover}
                                    <img
                                        src={track.cover}
                                        alt={title}
                                        class="h-full w-full object-cover"
                                    />
                                {:else}
                                    <div
                                        class="flex h-full w-full items-center justify-center text-muted-foreground"
                                    >
                                        <Ban class="size-6" />
                                    </div>
                                {/if}
                            </div>

                            <!-- Track Info -->
                            <div class="flex-1 overflow-hidden">
                                <p class="truncate font-medium">{title}</p>
                                <p class="truncate text-sm text-muted-foreground">{artists}</p>
                            </div>

                            <!-- Unblock Button -->
                            <Button
                                size="sm"
                                variant="ghost"
                                onclick={() => unblockTrack(track.track_id)}
                                class="flex-shrink-0"
                            >
                                <X class="mr-1 size-4" />
                                Unblock
                            </Button>
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
    </Dialog.Content>
</Dialog.Root>
