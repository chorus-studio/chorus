<script lang="ts">
    import { toast } from 'svelte-sonner'
    import Disc3 from '@lucide/svelte/icons/disc-3'
    import Play from '@lucide/svelte/icons/play'
    import Check from '@lucide/svelte/icons/check'
    import Trash2 from '@lucide/svelte/icons/trash-2'
    import ChevronDown from '@lucide/svelte/icons/chevron-down'
    import Music from '@lucide/svelte/icons/music'
    import * as Dialog from '$lib/components/ui/dialog'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import { Button, buttonVariants } from '$lib/components/ui/button'
    import { discographyStore } from '$lib/stores/discography'
    import { getPlayerService } from '$lib/api/services/player'
    import { timeAgo } from '$lib/utils/time-ago'
    import {
        albumSummary,
        artistSummary,
        nextUnheard,
        resumeTarget,
        sortedAlbums,
        sortedArtists,
        type AlbumProgress,
        type ArtistProgress
    } from '$lib/utils/discography'
    import { cn } from '$lib/utils.js'

    // Every artist heard, most recent first: how far through their albums the
    // person is, where they left off, and a Resume that picks up there. The
    // shell is the blocked-tracks dialog's.
    let { open = false }: { open?: boolean } = $props()
    let expanded = $state<Set<string>>(new Set())
    let starting = $state<string | null>(null)

    const artists = $derived(sortedArtists($discographyStore))
    const count = $derived(artists.length)
    const triggerLabel = $derived(count ? `Discographies (${count})` : 'Discographies')

    function toggleExpanded(id: string) {
        const next = new Set(expanded)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        expanded = next
    }

    async function playAlbum(album_id: string, track_id: string | null, key: string) {
        starting = key
        try {
            await getPlayerService().playRelease(
                `spotify:album:${album_id}`,
                track_id ? `spotify:track:${track_id}` : undefined
            )
        } catch (error) {
            console.error('Could not start the album:', error)
            toast.error('Could not start that album')
        } finally {
            starting = null
        }
    }

    function resume(artist: ArtistProgress) {
        const target = resumeTarget(artist)
        if (!target) return
        void playAlbum(target.album_id, target.track_id, artist.id)
    }

    function playFrom(album: AlbumProgress, artist: ArtistProgress) {
        void playAlbum(album.id, nextUnheard(album)?.id ?? null, `${artist.id}:${album.id}`)
    }

    const lastAlbumName = (artist: ArtistProgress) =>
        artist.last ? (artist.albums[artist.last.album_id]?.name ?? '') : ''
</script>

<Dialog.Root bind:open>
    <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
            <Tooltip.Trigger>
                {#snippet child({ props: tooltipProps })}
                    <Dialog.Trigger
                        {...tooltipProps}
                        id="discography-dialog-trigger"
                        aria-label={triggerLabel}
                        class={buttonVariants({
                            variant: 'bar',
                            size: 'icon-sm',
                            class: 'relative [&_svg]:size-[18px]'
                        })}
                    >
                        <Disc3 />
                    </Dialog.Trigger>
                {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom">{triggerLabel}</Tooltip.Content>
        </Tooltip.Root>
    </Tooltip.Provider>

    <Dialog.Content
        id="discography-dialog-content"
        class="flex h-[600px] max-h-[90vh] w-[760px] max-w-[92vw] flex-col gap-0 overflow-hidden p-0"
    >
        <div class="flex items-start justify-between px-6 pb-3.5 pt-5">
            <div class="flex items-center gap-x-3">
                <span
                    class="inline-flex size-8 items-center justify-center rounded-lg bg-surface text-ink-fg"
                >
                    <Disc3 class="size-4" />
                </span>
                <div class="flex flex-col gap-y-0.5">
                    <Dialog.Title class="text-base font-semibold tracking-tight text-ink-fg"
                        >Discographies</Dialog.Title
                    >
                    <Dialog.Description class="text-xs text-ink-muted">
                        How far you are through each artist's albums, and where you left off
                    </Dialog.Description>
                </div>
            </div>
        </div>

        <div class="flex min-h-0 flex-1 flex-col gap-y-3 px-6 pb-5">
            {#if artists.length === 0}
                <div
                    class="flex min-h-0 flex-1 flex-col items-center justify-center gap-y-2 rounded-lg border border-hairline bg-panel p-10 text-center"
                >
                    <Disc3 class="size-8 text-ink-dim" />
                    <p class="text-[13px] text-ink-fg-2">Nothing heard yet</p>
                    <p class="text-xs text-ink-muted">
                        Play any album and its artist appears here, with every track you have heard
                        ticked off.
                    </p>
                </div>
            {:else}
                <div
                    class="chorus-scroll flex min-h-0 flex-col gap-y-2.5 overflow-y-auto rounded-lg border border-hairline bg-panel p-2.5"
                >
                    {#each artists as artist (artist.id)}
                        {@const s = artistSummary(artist)}
                        {@const isOpen = expanded.has(artist.id)}
                        {@const target = resumeTarget(artist)}
                        {@const cover = artist.last
                            ? artist.albums[artist.last.album_id]?.cover
                            : null}
                        <div class="rounded-lg border border-hairline bg-surface">
                            <div class="flex items-center gap-x-3 px-3 py-2.5">
                                <span
                                    class="inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded bg-surface-2 text-ink-dim"
                                >
                                    {#if cover}
                                        <img src={cover} alt="" class="size-full object-cover" />
                                    {:else}
                                        <Music class="size-4" />
                                    {/if}
                                </span>
                                <div class="flex min-w-0 flex-1 flex-col gap-y-1">
                                    <div class="flex items-baseline justify-between gap-x-3">
                                        <span class="truncate text-[13px] font-medium text-ink-fg"
                                            >{artist.name}</span
                                        >
                                        <span class="shrink-0 font-mono text-[10px] text-ink-muted"
                                            >{timeAgo(artist.updated_at)}</span
                                        >
                                    </div>
                                    <div
                                        class="h-1 w-full overflow-hidden rounded-full bg-surface-2"
                                        role="progressbar"
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={Math.round(s.fraction * 100)}
                                        aria-label={`${artist.name}: ${s.tracksHeard} of ${s.tracksTotal} tracks heard`}
                                    >
                                        <div
                                            class="h-full rounded-full bg-signal"
                                            style="width: {Math.round(s.fraction * 100)}%"
                                        ></div>
                                    </div>
                                    <span class="truncate text-[11px] text-ink-muted">
                                        {s.albumsDone} of {s.albums} album{s.albums === 1
                                            ? ''
                                            : 's'}
                                        · {s.tracksHeard} of {s.tracksTotal} tracks
                                        {#if artist.last}
                                            · left off at <span class="text-ink-fg-2"
                                                >{artist.last.track_name}</span
                                            >
                                            on {lastAlbumName(artist)}
                                        {/if}
                                    </span>
                                </div>
                                <div class="flex shrink-0 items-center gap-x-1">
                                    <Button
                                        size="sm"
                                        aria-label={`Resume ${artist.name}`}
                                        disabled={!target || starting === artist.id}
                                        onclick={() => resume(artist)}
                                    >
                                        <Play class="size-3.5" />
                                        {target ? 'Resume' : 'All heard'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label={`Forget ${artist.name}`}
                                        title="Forget this artist's progress"
                                        class="text-ink-muted hover:text-alarm"
                                        onclick={() => discographyStore.forget(artist.id)}
                                    >
                                        <Trash2 class="size-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-expanded={isOpen}
                                        aria-label={isOpen ? 'Hide albums' : 'Show albums'}
                                        onclick={() => toggleExpanded(artist.id)}
                                    >
                                        <ChevronDown
                                            class={cn(
                                                'size-3.5 transition-transform',
                                                isOpen && 'rotate-180'
                                            )}
                                        />
                                    </Button>
                                </div>
                            </div>
                            {#if isOpen}
                                <div
                                    class="flex flex-wrap gap-1.5 border-t border-hairline px-3 py-2.5"
                                >
                                    {#each sortedAlbums(artist) as album (album.id)}
                                        {@const a = albumSummary(album)}
                                        <button
                                            type="button"
                                            title={`${album.name}${album.year ? ` (${album.year})` : ''} · ${a.heard} of ${a.total} heard · click to play${a.done ? '' : ' from the next unheard track'}`}
                                            disabled={starting === `${artist.id}:${album.id}`}
                                            onclick={() => playFrom(album, artist)}
                                            class={cn(
                                                'chorus-focus inline-flex h-7 max-w-[220px] items-center gap-x-1.5 rounded-md border px-2 text-xs transition-colors hover:bg-surface-2',
                                                a.done
                                                    ? 'border-signal/40 text-ink-fg-2'
                                                    : 'border-hairline text-ink-fg'
                                            )}
                                        >
                                            {#if a.done}
                                                <Check
                                                    class="size-3 shrink-0 text-signal"
                                                    strokeWidth={3}
                                                />
                                            {/if}
                                            <span class="truncate">{album.name}</span>
                                            <span
                                                class="shrink-0 font-mono text-[10px] text-ink-muted"
                                                >{a.heard}/{a.total || '?'}</span
                                            >
                                        </button>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            {/if}

            <div class="flex shrink-0 flex-wrap items-center gap-x-1 text-[11px] text-ink-muted">
                A track counts as heard once it starts. Resume plays the album you left off on from
                that track; an album chip plays it from its next unheard track.
            </div>
        </div>
    </Dialog.Content>
</Dialog.Root>
