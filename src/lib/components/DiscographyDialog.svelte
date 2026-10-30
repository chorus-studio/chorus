<script lang="ts">
    import { onMount } from 'svelte'
    import { toast } from 'svelte-sonner'
    import { storage } from '@wxt-dev/storage'
    import Disc3 from '@lucide/svelte/icons/disc-3'
    import Play from '@lucide/svelte/icons/play'
    import Check from '@lucide/svelte/icons/check'
    import Plus from '@lucide/svelte/icons/plus'
    import Trash2 from '@lucide/svelte/icons/trash-2'
    import ChevronDown from '@lucide/svelte/icons/chevron-down'
    import ChevronLeft from '@lucide/svelte/icons/chevron-left'
    import LayoutGrid from '@lucide/svelte/icons/layout-grid'
    import List from '@lucide/svelte/icons/list'
    import Music from '@lucide/svelte/icons/music'
    import LoaderCircle from '@lucide/svelte/icons/loader-circle'
    import * as Dialog from '$lib/components/ui/dialog'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import { Button, buttonVariants } from '$lib/components/ui/button'
    import { Switch } from '$lib/components/ui/switch'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'
    import { discographyPrefs, discographyStore } from '$lib/stores/discography'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { getPlayerService } from '$lib/api/services/player'
    import { albumIdFromBar, artistFromBar } from '$lib/utils/discography-watch'
    import { trackDiscography, trackOneAlbum } from '$lib/utils/discography-track'
    import { timeAgo } from '$lib/utils/time-ago'
    import {
        albumSummary,
        artistSummary,
        counts,
        countedAlbums,
        lastHeard,
        nextUnheard,
        releaseLabel,
        resumeTarget,
        scopeOf,
        sortedAlbums,
        sortedArtists,
        type AlbumProgress,
        type ArtistProgress
    } from '$lib/utils/discography'
    import { cn } from '$lib/utils.js'

    // Every tracked artist and album, most recent first: how far through them
    // the person is, where they left off, and a Resume that picks up there.
    // The counting chips decide which release kinds make up the denominators;
    // the Now playing strip tracks whatever is on; the list / grid pair and the
    // shell are the blocked-tracks dialog's, with the grid drilling into an
    // artist's releases.
    type View = 'list' | 'grid'
    const VIEW_KEY = 'local:chorus_discography_view'

    // `drillInto` opens the grid on one artist's releases (the preview gallery uses it).
    let { open = false, drillInto = null }: { open?: boolean; drillInto?: string | null } =
        $props()
    let view = $state<View>('list')
    let expanded = $state<Set<string>>(new Set())
    let openArtistId = $state<string | null>(drillInto)
    let starting = $state<string | null>(null)
    let busy = $state<string | null>(null)

    const filters = $derived($discographyPrefs.filters)
    const artists = $derived(sortedArtists($discographyStore))
    const count = $derived(artists.length)
    const triggerLabel = $derived(count ? `Discographies (${count})` : 'Discographies')
    const releaseWord = $derived(filters.singles || filters.compilations ? 'releases' : 'albums')
    const openArtist = $derived(openArtistId ? ($discographyStore[openArtistId] ?? null) : null)

    // What is playing, as an artist and album that could be tracked. The bar's
    // links carry the artist id; re-read whenever the dialog opens.
    const now = $derived.by(() => {
        const s = $nowPlaying
        if (!open || !s.track_id) return null
        const artist = artistFromBar()
        const album_id = s.album_id ?? albumIdFromBar()
        if (!artist || !album_id) return null
        return { artist, album_id, title: s.title ?? '', cover: s.cover }
    })
    const nowArtist = $derived(now ? $discographyStore[now.artist.id] : undefined)
    const nowAlbumTracked = $derived(Boolean(now && nowArtist?.albums[now.album_id]?.tracked))

    onMount(() => {
        void storage.getItem<string>(VIEW_KEY).then((saved) => {
            if (saved === 'grid' || saved === 'list') view = saved
        })
    })

    async function setView(next: string) {
        if (next !== 'grid' && next !== 'list') return
        view = next
        openArtistId = null
        await storage.setItem(VIEW_KEY, view)
    }

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
        const target = resumeTarget(artist, filters)
        if (!target) return
        void playAlbum(target.album_id, target.track_id, artist.id)
    }

    function playFrom(album: AlbumProgress, artist: ArtistProgress) {
        void playAlbum(album.id, nextUnheard(album)?.id ?? null, `${artist.id}:${album.id}`)
    }

    async function run(key: string, work: () => Promise<unknown>, failure: string) {
        busy = key
        try {
            await work()
        } catch (error) {
            console.error(failure, error)
            toast.error(failure)
        } finally {
            busy = null
        }
    }

    const trackArtistNow = (artist: { id: string; name: string }, key = artist.id) =>
        run(
            key,
            async () => {
                if (!(await trackDiscography(artist)))
                    toast.error('Spotify did not list that discography')
            },
            'Could not track that discography'
        )

    const trackAlbumNow = () =>
        now &&
        run(
            'now-album',
            () => trackOneAlbum(now.artist, { id: now.album_id, cover: now.cover }),
            'Could not track that album'
        )

    function stopTracking(artist: ArtistProgress) {
        void discographyStore.untrackArtist(artist.id)
        if (openArtistId === artist.id) openArtistId = null
    }

    // Badge, cover(s) and the summary line for an artist row or card.
    function badgeOf(artist: ArtistProgress): string {
        const scope = scopeOf(artist)
        if (scope === 'discography') return 'Discography'
        if (scope === 'heard') return 'Heard'
        const n = Object.values(artist.albums).filter((a) => a.tracked).length
        return n === 1 ? '1 album' : `${n} albums`
    }

    function coversOf(artist: ArtistProgress): string[] {
        const counted = countedAlbums(artist, filters)
        const pool = counted.length ? counted : sortedAlbums(artist)
        const covers = pool.map((a) => a.cover).filter((c): c is string => Boolean(c))
        return covers.slice(0, 4)
    }

    const plural = (n: number, word: string) => (n === 1 ? word : `${word}s`)

    /** "2 of 5 albums", or the album's name when one is tracked on its own. */
    function headOf(artist: ArtistProgress): string {
        const s = artistSummary(artist, filters)
        const counted = countedAlbums(artist, filters)
        if (scopeOf(artist) === 'albums' && counted.length === 1) return counted[0].name
        const word = scopeOf(artist) === 'albums' ? 'album' : releaseWord.slice(0, -1)
        return `${s.albumsDone} of ${s.albums} ${plural(s.albums, word)}`
    }

    function metaOf(artist: ArtistProgress): string {
        const s = artistSummary(artist, filters)
        return `${headOf(artist)} · ${s.tracksHeard} of ${s.tracksTotal || '?'} ${plural(s.tracksTotal, 'track')}`
    }

    const VIEW_OPTIONS = [
        { label: 'List', value: 'list', icon: List },
        { label: 'Grid', value: 'grid', icon: LayoutGrid }
    ]

    const FILTER_CHIPS = [
        { key: 'albums', label: 'Albums', title: 'Count albums' },
        { key: 'singles', label: 'Singles & EPs', title: 'Count singles and EPs' },
        { key: 'compilations', label: 'Compilations', title: 'Count compilations' }
    ] as const
</script>

{#snippet cover(urls: string[], size: string, radius = 'rounded')}
    {#if urls.length >= 2}
        <span
            class={cn(
                'grid shrink-0 grid-cols-2 gap-px overflow-hidden bg-surface-2',
                size,
                radius
            )}
        >
            {#each urls.slice(0, 4) as url (url)}
                <img src={url} alt="" class="size-full object-cover" />
            {/each}
            {#if urls.length === 3}<span class="bg-surface-2"></span>{/if}
        </span>
    {:else}
        <span
            class={cn(
                'inline-flex shrink-0 items-center justify-center overflow-hidden bg-surface-2 text-ink-dim',
                size,
                radius
            )}
        >
            {#if urls[0]}
                <img src={urls[0]} alt="" class="size-full object-cover" />
            {:else}
                <Music class="size-4" />
            {/if}
        </span>
    {/if}
{/snippet}

{#snippet badge(text: string)}
    <span
        class="shrink-0 rounded border border-hairline-strong px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted"
        >{text}</span
    >
{/snippet}

{#snippet progress(artist: ArtistProgress, height: string)}
    {@const s = artistSummary(artist, filters)}
    <div
        class={cn('w-full overflow-hidden rounded-full bg-surface-2', height)}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(s.fraction * 100)}
        aria-label={`${artist.name}: ${s.tracksHeard} of ${s.tracksTotal} tracks heard`}
    >
        <div class="h-full rounded-full bg-signal" style="width: {Math.round(s.fraction * 100)}%"></div>
    </div>
{/snippet}

{#snippet allHeard(small = false)}
    <span
        class={cn(
            'inline-flex items-center gap-x-1.5 rounded-md border border-signal/40 font-semibold text-signal',
            small ? 'h-5 rounded-full bg-ink px-2 text-[10px] shadow-float' : 'h-7 bg-signal/10 px-2.5 text-xs'
        )}
    >
        <Check class={small ? 'size-2.5' : 'size-3.5'} strokeWidth={3} />
        All heard
    </span>
{/snippet}

{#snippet actions(artist: ArtistProgress)}
    {@const target = resumeTarget(artist, filters)}
    {@const s = artistSummary(artist, filters)}
    {@const scope = scopeOf(artist)}
    <div class="flex shrink-0 items-center gap-x-1">
        {#if scope === 'heard'}
            <Button
                variant="outline"
                size="sm"
                title="Track this artist's whole discography"
                disabled={busy === artist.id}
                onclick={() => trackArtistNow({ id: artist.id, name: artist.name })}
            >
                {#if busy === artist.id}
                    <LoaderCircle class="size-3.5 animate-spin" />
                {:else}
                    <Plus class="size-3.5" strokeWidth={2.5} />
                {/if}
                Track
            </Button>
        {/if}
        {#if target}
            <Button
                size="sm"
                aria-label={`Resume ${artist.name}`}
                disabled={starting === artist.id}
                onclick={() => resume(artist)}
            >
                <Play class="size-3.5" />
                Resume
            </Button>
        {:else if s.tracksTotal > 0}
            {@render allHeard()}
        {/if}
        <Button
            variant="ghost"
            size="icon-xs"
            aria-label={scope === 'heard'
                ? `Forget ${artist.name}`
                : `Stop tracking ${artist.name}`}
            title={scope === 'heard' ? 'Forget this artist' : 'Stop tracking'}
            class="text-ink-muted hover:text-alarm"
            onclick={() => stopTracking(artist)}
        >
            <Trash2 class="size-3.5" />
        </Button>
    </div>
{/snippet}

{#snippet albumChip(album: AlbumProgress, artist: ArtistProgress)}
    {@const a = albumSummary(album)}
    {@const counted = counts(album, artist, filters)}
    {@const kind = (album.kind ?? 'album') === 'album' ? null : releaseLabel(album)}
    <button
        type="button"
        title={`${album.name}${album.year ? ` (${album.year})` : ''} · ${a.heard} of ${a.total || '?'} heard${counted ? '' : ' · not counted under the filters'} · click to play${a.done || !album.tracks.length ? '' : ' from the next unheard track'}`}
        disabled={starting === `${artist.id}:${album.id}`}
        onclick={() => playFrom(album, artist)}
        class={cn(
            'chorus-focus inline-flex h-7 max-w-[240px] items-center gap-x-1.5 rounded-md border px-2 text-xs transition-colors hover:bg-surface-2',
            a.done ? 'border-signal/40 text-ink-fg-2' : 'border-hairline-strong text-ink-fg',
            !counted && 'border-dashed opacity-60'
        )}
    >
        {#if a.done}
            <Check class="size-3 shrink-0 text-signal" strokeWidth={3} />
        {/if}
        <span class="truncate">{album.name}</span>
        {#if kind}
            <span class="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-dim"
                >{kind}</span
            >
        {/if}
        <span class="shrink-0 font-mono text-[10px] text-ink-muted">{a.heard}/{a.total || '?'}</span>
    </button>
{/snippet}

{#snippet artistRow(artist: ArtistProgress)}
    {@const isOpen = expanded.has(artist.id)}
    {@const last = lastHeard(artist, filters)}
    <div class="rounded-lg border border-hairline bg-surface">
        <div class="flex items-center gap-x-3 px-3 py-2.5">
            {@render cover(coversOf(artist), 'size-10')}
            <div class="flex min-w-0 flex-1 flex-col gap-y-1">
                <div class="flex items-baseline justify-between gap-x-3">
                    <span class="flex min-w-0 items-center gap-x-2">
                        <span class="truncate text-[13px] font-medium text-ink-fg">{artist.name}</span>
                        {@render badge(badgeOf(artist))}
                    </span>
                    <span class="shrink-0 font-mono text-[10px] text-ink-muted"
                        >{timeAgo(artist.updated_at)}</span
                    >
                </div>
                {@render progress(artist, 'h-1')}
                <span class="truncate text-[11px] text-ink-muted">
                    {metaOf(artist)}
                    {#if last}
                        · left off at <span class="text-ink-fg-2">{last.track_name}</span>
                        {#if scopeOf(artist) !== 'albums' || countedAlbums(artist, filters).length > 1}
                            on {last.album_name}
                        {/if}
                    {/if}
                </span>
            </div>
            {@render actions(artist)}
            <Button
                variant="ghost"
                size="icon-xs"
                aria-expanded={isOpen}
                aria-label={isOpen ? 'Hide releases' : 'Show releases'}
                class="shrink-0"
                onclick={() => toggleExpanded(artist.id)}
            >
                <ChevronDown class={cn('size-3.5 transition-transform', isOpen && 'rotate-180')} />
            </Button>
        </div>
        {#if isOpen}
            <div class="flex flex-wrap gap-1.5 border-t border-hairline px-3 py-2.5">
                {#each sortedAlbums(artist) as album (album.id)}
                    {@render albumChip(album, artist)}
                {/each}
                {#if Object.keys(artist.albums).length === 0}
                    <span class="text-[11px] text-ink-muted">No releases listed yet.</span>
                {/if}
            </div>
        {/if}
    </div>
{/snippet}

{#snippet artistCard(artist: ArtistProgress)}
    {@const target = resumeTarget(artist, filters)}
    {@const s = artistSummary(artist, filters)}
    {@const urls = coversOf(artist)}
    <div
        class="group flex min-w-0 flex-col gap-y-1.5 rounded-lg border border-hairline bg-surface p-2 transition-colors hover:border-hairline-strong hover:bg-surface-2/60"
    >
        <div class="relative aspect-square w-full overflow-hidden rounded-md bg-surface-2">
            {#if urls.length >= 2}
                <span class="grid size-full grid-cols-2 gap-px">
                    {#each urls.slice(0, 4) as url (url)}
                        <img src={url} alt="" class="size-full object-cover" />
                    {/each}
                    {#if urls.length === 3}<span class="bg-surface-2"></span>{/if}
                </span>
            {:else if urls[0]}
                <img src={urls[0]} alt="" class="size-full object-cover" />
            {:else}
                <span class="flex size-full items-center justify-center text-ink-dim">
                    <Music class="size-6" />
                </span>
            {/if}
            <button
                type="button"
                aria-label={`Show ${artist.name}'s releases`}
                onclick={() => (openArtistId = artist.id)}
                class="absolute inset-0 bg-ink/0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-signal group-hover:bg-ink/45"
            ></button>
            <span
                class="pointer-events-none absolute left-1.5 top-1.5 rounded bg-ink/70 px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.12em] text-ink-fg"
                >{badgeOf(artist)}</span
            >
            {#if !target && s.tracksTotal > 0}
                <span class="pointer-events-none absolute bottom-1.5 right-1.5">
                    {@render allHeard(true)}
                </span>
            {/if}
            <button
                type="button"
                aria-label={scopeOf(artist) === 'heard'
                    ? `Forget ${artist.name}`
                    : `Stop tracking ${artist.name}`}
                onclick={() => stopTracking(artist)}
                class="absolute right-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-full bg-ink/85 text-ink-fg opacity-0 transition-opacity hover:text-alarm focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal group-hover:opacity-100"
            >
                <Trash2 class="size-3" />
            </button>
            {#if target}
                <div
                    class="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
                >
                    <button
                        type="button"
                        aria-label={`Resume ${artist.name}`}
                        disabled={starting === artist.id}
                        onclick={() => resume(artist)}
                        class="pointer-events-auto inline-flex h-6 items-center gap-x-1 rounded-full bg-ink-fg px-2.5 text-[11px] font-semibold text-ink shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                    >
                        <Play class="size-3" />
                        Resume
                    </button>
                </div>
            {/if}
        </div>
        <span class="truncate text-[13px] font-medium text-ink-fg">{artist.name}</span>
        <span class="flex items-center justify-between gap-x-1.5 text-[11px] text-ink-muted">
            <span class="truncate">{headOf(artist)}</span>
            <span class="shrink-0 font-mono text-[10px]">{s.tracksHeard}/{s.tracksTotal || '?'}</span>
        </span>
        {@render progress(artist, 'h-[3px]')}
    </div>
{/snippet}

{#snippet albumCard(album: AlbumProgress, artist: ArtistProgress)}
    {@const a = albumSummary(album)}
    {@const counted = counts(album, artist, filters)}
    {@const next = nextUnheard(album)}
    {@const nextIndex = next ? album.tracks.findIndex((t) => t.id === next.id) + 1 : 0}
    {@const kind = releaseLabel(album)}
    <div
        class={cn(
            'group flex min-w-0 flex-col gap-y-1.5 rounded-lg border bg-surface p-2 transition-colors hover:border-hairline-strong hover:bg-surface-2/60',
            counted ? 'border-hairline' : 'border-dashed border-hairline-strong opacity-60'
        )}
    >
        <div class="relative aspect-square w-full overflow-hidden rounded-md bg-surface-2">
            {#if album.cover}
                <img src={album.cover} alt="" class="size-full object-cover" />
            {:else}
                <span class="flex size-full items-center justify-center text-ink-dim">
                    <Music class="size-6" />
                </span>
            {/if}
            <button
                type="button"
                aria-label={`Play ${album.name}${a.done || !nextIndex ? '' : ` from track ${nextIndex}`}`}
                disabled={starting === `${artist.id}:${album.id}`}
                onclick={() => playFrom(album, artist)}
                class="absolute inset-0 flex items-end justify-center bg-ink/0 pb-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-signal group-hover:bg-ink/45"
            >
                <span
                    class="inline-flex h-6 items-center gap-x-1 rounded-full bg-ink-fg px-2.5 text-[11px] font-semibold text-ink opacity-0 shadow-float transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
                >
                    <Play class="size-3" />
                    {a.done || !nextIndex ? 'Play' : `From track ${nextIndex}`}
                </span>
            </button>
            {#if !counted}
                <span
                    class="pointer-events-none absolute left-1.5 top-1.5 rounded bg-ink/70 px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.12em] text-ink-fg"
                    >Not counted</span
                >
            {:else if a.done}
                <span
                    class="pointer-events-none absolute bottom-1.5 right-1.5 inline-flex size-5 items-center justify-center rounded-full bg-signal text-signal-fg"
                >
                    <Check class="size-3" strokeWidth={3.5} />
                </span>
            {/if}
        </div>
        <span class="truncate text-[13px] font-medium text-ink-fg">{album.name}</span>
        <span class="flex items-center justify-between gap-x-1.5 text-[11px] text-ink-muted">
            <span class="truncate">{album.year ? `${album.year} · ` : ''}{kind}</span>
            <span class="shrink-0 font-mono text-[10px]">{a.heard}/{a.total || '?'}</span>
        </span>
        <div
            class="h-[3px] w-full overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={a.total ? Math.round((a.heard / a.total) * 100) : 0}
            aria-label={`${album.name}: ${a.heard} of ${a.total} tracks heard`}
        >
            <div
                class={cn('h-full rounded-full', counted ? 'bg-signal' : 'bg-ink-dim')}
                style="width: {a.total ? Math.round((a.heard / a.total) * 100) : 0}%"
            ></div>
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
        <div class="flex items-start justify-between px-6 pb-3 pt-5">
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
                        Artists and albums you chose to track, how far through them you are, and
                        where you left off
                    </Dialog.Description>
                </div>
            </div>
        </div>

        <div class="flex min-h-0 flex-1 flex-col gap-y-2.5 px-6 pb-4">
            <div class="flex items-center justify-between gap-x-3">
                <div class="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span class="rack-label mr-1">Count</span>
                    {#each FILTER_CHIPS as chip (chip.key)}
                        {@const on = filters[chip.key]}
                        <button
                            type="button"
                            aria-pressed={on}
                            title={chip.title}
                            onclick={() => discographyPrefs.setFilters({ [chip.key]: !on })}
                            class={cn(
                                'inline-flex h-6 items-center gap-x-1 rounded-full border px-2.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal',
                                on
                                    ? 'border-signal/40 bg-signal/10 text-signal'
                                    : 'border-hairline-strong text-ink-muted hover:bg-surface-2 hover:text-ink-fg'
                            )}
                        >
                            {#if on}<Check class="size-3" strokeWidth={3} />{/if}
                            {chip.label}
                        </button>
                    {/each}
                    <span aria-hidden="true" class="mx-1 h-4 w-px bg-hairline-strong"></span>
                    <button
                        type="button"
                        aria-pressed={filters.hide_variants}
                        title="Hide remixes, live, deluxe and other editions, going by their names"
                        onclick={() =>
                            discographyPrefs.setFilters({ hide_variants: !filters.hide_variants })}
                        class={cn(
                            'inline-flex h-6 items-center gap-x-1 rounded-full border px-2.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal',
                            filters.hide_variants
                                ? 'border-signal/40 bg-signal/10 text-signal'
                                : 'border-hairline-strong text-ink-muted hover:bg-surface-2 hover:text-ink-fg'
                        )}
                    >
                        {#if filters.hide_variants}<Check class="size-3" strokeWidth={3} />{/if}
                        Hide remixes &amp; deluxe
                    </button>
                </div>
                <SegmentedControl
                    size="md"
                    ariaLabel="View"
                    value={view}
                    onValueChange={setView}
                    options={VIEW_OPTIONS}
                />
            </div>

            {#if view === 'grid' && openArtist}
                <div
                    class="flex shrink-0 items-center gap-x-3 rounded-lg border border-hairline bg-surface py-2 pl-1.5 pr-2.5"
                >
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Back to all artists"
                        onclick={() => (openArtistId = null)}
                    >
                        <ChevronLeft class="size-4" />
                    </Button>
                    {@render cover(coversOf(openArtist), 'size-10')}
                    <div class="flex min-w-0 flex-1 flex-col gap-y-1">
                        <div class="flex items-baseline justify-between gap-x-3">
                            <span class="flex min-w-0 items-center gap-x-2">
                                <span class="truncate text-sm font-semibold text-ink-fg"
                                    >{openArtist.name}</span
                                >
                                {@render badge(badgeOf(openArtist))}
                            </span>
                            <span class="shrink-0 font-mono text-[10px] text-ink-muted"
                                >{timeAgo(openArtist.updated_at)}</span
                            >
                        </div>
                        {@render progress(openArtist, 'h-1')}
                        <span class="truncate text-[11px] text-ink-muted">
                            {metaOf(openArtist)}
                            {#if lastHeard(openArtist, filters)}
                                · left off at <span class="text-ink-fg-2"
                                    >{lastHeard(openArtist, filters)?.track_name}</span
                                >
                                on {lastHeard(openArtist, filters)?.album_name}
                            {/if}
                        </span>
                    </div>
                    {@render actions(openArtist)}
                </div>
            {:else if now}
                <div
                    class="flex shrink-0 items-center gap-x-2.5 rounded-lg border border-dashed border-hairline-strong px-2.5 py-1.5"
                >
                    {@render cover(now.cover ? [now.cover] : [], 'size-7')}
                    <p class="min-w-0 flex-1 truncate text-xs text-ink-fg-2">
                        <span class="text-ink-muted">Now playing</span>
                        · {now.artist.name}{now.title ? ` · ${now.title}` : ''}
                    </p>
                    {#if nowArtist?.tracked}
                        <span
                            class="inline-flex h-6 items-center gap-x-1 rounded-md border border-signal/40 bg-signal/10 px-2 text-[11px] font-medium text-signal"
                        >
                            <Check class="size-3" strokeWidth={3} />
                            Tracking discography
                        </span>
                    {:else}
                        {#if nowAlbumTracked}
                            <span
                                class="inline-flex h-6 items-center gap-x-1 rounded-md border border-signal/40 bg-signal/10 px-2 text-[11px] font-medium text-signal"
                            >
                                <Check class="size-3" strokeWidth={3} />
                                Album tracked
                            </span>
                        {:else}
                            <Button
                                variant="outline"
                                size="xs"
                                disabled={busy === 'now-album'}
                                onclick={trackAlbumNow}
                            >
                                {#if busy === 'now-album'}
                                    <LoaderCircle class="size-3 animate-spin" />
                                {:else}
                                    <Plus class="size-3" strokeWidth={2.5} />
                                {/if}
                                Track album
                            </Button>
                        {/if}
                        <Button
                            variant="outline"
                            size="xs"
                            disabled={busy === 'now-artist'}
                            onclick={() => trackArtistNow(now!.artist, 'now-artist')}
                        >
                            {#if busy === 'now-artist'}
                                <LoaderCircle class="size-3 animate-spin" />
                            {:else}
                                <Plus class="size-3" strokeWidth={2.5} />
                            {/if}
                            Track discography
                        </Button>
                    {/if}
                </div>
            {/if}

            {#if artists.length === 0}
                <div
                    class="flex min-h-0 flex-1 flex-col items-center justify-center gap-y-2 rounded-lg border border-hairline bg-panel p-10 text-center"
                >
                    <Disc3 class="size-8 text-ink-dim" />
                    <p class="text-[13px] text-ink-fg-2">Nothing tracked yet</p>
                    <p class="max-w-[380px] text-xs text-ink-muted">
                        Open an artist or album on Spotify and press Track beside Follow, or track
                        what is playing from the strip above. Turn on auto-track below to note
                        every artist you play.
                    </p>
                </div>
            {:else if view === 'list'}
                <div
                    class="chorus-scroll flex min-h-0 flex-col gap-y-2.5 overflow-y-auto rounded-lg border border-hairline bg-panel p-2.5"
                >
                    {#each artists as artist (artist.id)}
                        {@render artistRow(artist)}
                    {/each}
                </div>
            {:else if openArtist}
                <div class="chorus-scroll min-h-0 overflow-y-auto">
                    {#if Object.keys(openArtist.albums).length === 0}
                        <p class="p-6 text-center text-xs text-ink-muted">No releases listed yet.</p>
                    {:else}
                        <div class="grid grid-cols-5 gap-3 p-0.5">
                            {#each sortedAlbums(openArtist) as album (album.id)}
                                {@render albumCard(album, openArtist)}
                            {/each}
                        </div>
                    {/if}
                </div>
            {:else}
                <div class="chorus-scroll min-h-0 overflow-y-auto">
                    <div class="grid grid-cols-5 gap-3 p-0.5">
                        {#each artists as artist (artist.id)}
                            {@render artistCard(artist)}
                        {/each}
                    </div>
                </div>
            {/if}

            <div
                class="flex shrink-0 items-center justify-between gap-x-4 text-[11px] text-ink-muted"
            >
                <p>
                    {#if view === 'grid' && openArtist}
                        Hover a cover to play it from the next unheard track. Faded releases
                        are left out by the filters.
                    {:else if view === 'grid'}
                        Click a card for its releases. A track counts as heard once it starts.
                    {:else}
                        A track counts as heard once it starts. Resume picks up where you left
                        off.
                    {/if}
                </p>
                <label class="flex shrink-0 cursor-pointer items-center gap-x-2">
                    <span>Auto-track what I play</span>
                    <Switch
                        id="discography-auto-track"
                        checked={$discographyPrefs.auto_track}
                        onCheckedChange={(on) => void discographyPrefs.setAutoTrack(on)}
                        aria-label="Auto-track what I play"
                    />
                </label>
            </div>
        </div>
    </Dialog.Content>
</Dialog.Root>
