<script lang="ts">
    import { onMount } from 'svelte'
    import { storage } from '@wxt-dev/storage'
    import { toast } from 'svelte-sonner'
    import Sparkles from '@lucide/svelte/icons/sparkles'
    import Search from '@lucide/svelte/icons/search'
    import List from '@lucide/svelte/icons/list'
    import LayoutGrid from '@lucide/svelte/icons/layout-grid'
    import Music from '@lucide/svelte/icons/music'
    import Podcast from '@lucide/svelte/icons/podcast'
    import Play from '@lucide/svelte/icons/play'
    import Pause from '@lucide/svelte/icons/pause'
    import Bookmark from '@lucide/svelte/icons/bookmark'
    import BookmarkCheck from '@lucide/svelte/icons/bookmark-check'
    import EyeOff from '@lucide/svelte/icons/eye-off'
    import RefreshCw from '@lucide/svelte/icons/refresh-cw'
    import Undo2 from '@lucide/svelte/icons/undo-2'
    import * as Dialog from '$lib/components/ui/dialog'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import { Button, buttonVariants } from '$lib/components/ui/button'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'
    import { newReleasesStore, releasesUI } from '$lib/stores/new-releases'
    import { mediaStore } from '$lib/stores/media'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { getPlayerService } from '$lib/api/services/player'
    import { unseenReleases } from '$lib/utils/releases-badge'
    import { timeAgo } from '$lib/utils/time-ago'
    import { cn } from '$lib/utils.js'
    import {
        RANGE_WORD,
        dismissedOnHand,
        groupReleases,
        lastSynced,
        releaseAge,
        releaseMeta,
        spotifyPath,
        typeLabel,
        visibleReleases,
        type Filter,
        type GroupBy,
        type Range,
        type Release,
        type ReleaseType,
        type Scope
    } from '$lib/utils/releases'

    // The latest releases from the artists and shows the person follows, as
    // Spotify lists them: play one, save it to Your Library, open its page,
    // or dismiss it. The shell, and the list / grid pair, are the
    // blocked-tracks dialog's; the filters sit in a second toolbar row.
    type View = 'list' | 'grid'
    const VIEW_KEY = 'local:chorus_releases_view'

    let { open = false }: { open?: boolean } = $props()
    let searchQuery = $state('')
    let view = $state<View>('list')
    // "Today" and the ranges are taken from when the dialog last opened.
    let now = $state(Date.now())
    let starting = $state<string | null>(null)
    let saving = $state<string | null>(null)
    /** The release last started from here, for the Pause state before the bar's links settle. */
    let started = $state<string | null>(null)

    const scope = $derived($newReleasesStore.scope)
    const range = $derived($newReleasesStore.range)
    const visible = $derived(visibleReleases($newReleasesStore, { query: searchQuery, now }))
    const groups = $derived(groupReleases(visible, $newReleasesStore.group_by, now))
    const total = $derived(visibleReleases($newReleasesStore, { now }).length)
    const hiddenCount = $derived(dismissedOnHand($newReleasesStore, now))
    const savedUris = $derived(new Set($newReleasesStore.library.map((entry) => entry.uri)))
    const unseen = $derived(unseenReleases($newReleasesStore))
    const synced = $derived(lastSynced($newReleasesStore))
    const loading = $derived($releasesUI.loading)
    const error = $derived($releasesUI.error)
    const triggerLabel = $derived(unseen ? `New releases (${unseen} new)` : 'New releases')

    onMount(() => {
        storage.getItem<View>(VIEW_KEY).then((saved) => {
            if (saved === 'grid' || saved === 'list') view = saved
        })
        // Spotify just loaded: bring stale lists up to date, so the toolbar badge is right.
        void newReleasesStore.refresh()
    })

    $effect(() => {
        if (!open) return
        now = Date.now()
        void newReleasesStore.refresh()
    })

    // While open, whatever is in view has been seen, new arrivals included:
    // the toolbar badge and the trigger's count clear.
    $effect(() => {
        void ($newReleasesStore.music_count + $newReleasesStore.shows_count)
        if (open) void newReleasesStore.markSeen()
    })

    async function setView(next: string) {
        view = next as View
        await storage.setItem(VIEW_KEY, view)
    }

    /** Ids of the album, episode and show the now-playing bar links to. */
    function contextIds(): Set<string> {
        const ids = new Set<string>()
        document
            .querySelectorAll<HTMLAnchorElement>('[data-testid="now-playing-widget-v2"] a[href]')
            .forEach((anchor) => {
                const match = /\/(album|episode|show)\/([A-Za-z0-9]+)/.exec(
                    anchor.getAttribute('href') ?? ''
                )
                if (match) ids.add(match[2])
            })
        return ids
    }
    // Re-read the bar's links as the track changes.
    const playingIds = $derived.by(() => {
        void $nowPlaying.track_id
        void $nowPlaying.id
        return contextIds()
    })
    const isCurrent = (release: Release) =>
        playingIds.size > 0 ? playingIds.has(release.id) : started === release.uri
    const isPlaying = (release: Release) => isCurrent(release) && $mediaStore.playing
    const isSaved = (release: Release) => savedUris.has(release.uri)

    function clickPlayPause() {
        document
            .querySelector<HTMLButtonElement>('button[data-testid="control-button-playpause"]')
            ?.click()
    }

    /** Start the release through Spotify Connect, on this device. */
    async function start(release: Release) {
        starting = release.uri
        try {
            await getPlayerService().playRelease(release.uri)
            started = release.uri
        } catch (caught) {
            console.error('Error playing release:', caught)
            toast.error('Could not start that release')
        } finally {
            starting = null
        }
    }

    const play = (release: Release) => (isCurrent(release) ? clickPlayPause() : start(release))

    async function save(release: Release) {
        saving = release.uri
        try {
            const saved = await newReleasesStore.toggleLibrary(release.uri)
            toast.success(
                saved
                    ? `Saved “${release.title}” to Your Library`
                    : `Removed “${release.title}” from Your Library`
            )
        } catch (caught) {
            console.error('Error updating Your Library:', caught)
            toast.error('Could not update Your Library')
        } finally {
            saving = null
        }
    }

    async function dismiss(release: Release) {
        await newReleasesStore.dismiss(release.uri)
        toast(`Dismissed “${release.title}”`, {
            action: { label: 'Undo', onClick: () => void newReleasesStore.undismiss(release.uri) }
        })
    }

    /** Close, and take Spotify to the release's, artist's or show's page. */
    function openIn(uri: string) {
        open = false
        window.postMessage({ type: 'FROM_NEW_RELEASES', data: spotifyPath(uri) }, '*')
    }

    async function resync() {
        await newReleasesStore.refresh(true)
        now = Date.now()
        if ($releasesUI.error) toast.error('Could not reach Spotify for new releases')
    }

    const releasedOn = (release: Release) =>
        new Date(release.time).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    const syncedOn = (at: number | null) => (at ? new Date(at).toLocaleString() : undefined)
    const followedWord = $derived(
        scope === 'music' ? 'artists' : scope === 'podcasts' ? 'shows' : 'artists and shows'
    )

    const SCOPE_OPTIONS = [
        {
            label: 'Music',
            value: 'music',
            icon: Music,
            title: 'Albums, singles, EPs and compilations from the artists you follow'
        },
        {
            label: 'Podcasts',
            value: 'podcasts',
            icon: Podcast,
            title: 'Episodes of the shows you follow'
        },
        { label: 'All', value: 'all', title: 'Both, together' }
    ]
    const RANGE_OPTIONS = [
        { label: 'Today', value: 'today', title: 'Released today' },
        { label: 'Yesterday', value: 'yesterday', title: 'Released since yesterday' },
        { label: 'Week', value: 'week', title: 'The last seven days' },
        { label: 'Month', value: 'month', title: 'The last thirty days' }
    ]
    const groupOptions = $derived([
        { label: 'Date', value: 'date', title: 'Group by the day they came out' },
        {
            label: scope === 'podcasts' ? 'Show' : 'Artist',
            value: 'artist',
            title: 'Group by who they are from'
        },
        { label: 'Type', value: 'type', title: 'Albums, singles & EPs, compilations, episodes' }
    ])
    const INCLUDE: Array<{ key: keyof Filter; label: string; title: string }> = [
        { key: 'albums', label: 'Albums', title: 'Show albums' },
        { key: 'singles', label: 'Singles & EPs', title: 'Show singles and EPs' },
        { key: 'compilations', label: 'Compilations', title: 'Show compilations' }
    ]
    const VIEW_OPTIONS = [
        { label: 'List', value: 'list', icon: List },
        { label: 'Grid', value: 'grid', icon: LayoutGrid }
    ]

    const onCoverButton =
        'pointer-events-auto inline-flex h-6 items-center justify-center rounded-full shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal'
</script>

{#snippet typePill(type: ReleaseType, onCover: boolean)}
    <span
        class={cn(
            'inline-flex h-[18px] shrink-0 items-center rounded-full px-1.5 font-mono text-[10px] uppercase tracking-[0.12em]',
            type === 'ALBUM'
                ? onCover
                    ? 'bg-signal text-ink shadow-float'
                    : 'bg-signal/15 text-signal'
                : onCover
                  ? 'bg-ink/80 text-ink-fg shadow-float'
                  : 'bg-surface-2 text-ink-fg-2'
        )}
    >
        {typeLabel(type)}
    </span>
{/snippet}

{#snippet cover(release: Release, sizeClass: string, iconClass: string)}
    <span
        class={cn(
            'inline-flex shrink-0 items-center justify-center overflow-hidden rounded bg-surface-2 text-ink-dim',
            sizeClass
        )}
    >
        {#if release.cover}
            <img src={release.cover} alt="" class="size-full object-cover" />
        {:else if release.type === 'EPISODE'}
            <Podcast class={iconClass} />
        {:else}
            <Music class={iconClass} />
        {/if}
    </span>
{/snippet}

{#snippet listHeader()}
    <div class="flex h-9 shrink-0 items-center justify-between gap-x-3 px-3.5">
        <span class="text-[11px] text-ink-muted">
            {total} release{total === 1 ? '' : 's'}
            {RANGE_WORD[range]}{searchQuery ? ` · ${visible.length} match` : ''}
        </span>
        <span class="flex items-center gap-x-2">
            {#if hiddenCount > 0}
                <Button
                    variant="ghost"
                    size="xs"
                    class="gap-x-1 text-ink-muted hover:text-ink-fg [&_svg]:size-3.5"
                    onclick={() => newReleasesStore.restoreDismissed()}
                >
                    <Undo2 />
                    Restore {hiddenCount} dismissed
                </Button>
            {/if}
            {#if error}
                <span class="font-mono text-[10px] text-alarm">sync failed</span>
            {:else}
                <span class="font-mono text-[10px] text-ink-muted" title={syncedOn(synced)}>
                    {synced ? `synced ${timeAgo(synced, now)}` : 'not synced yet'}
                </span>
            {/if}
            <Button
                variant="ghost"
                size="xs"
                class="gap-x-1 text-ink-muted hover:text-ink-fg [&_svg]:size-3.5"
                aria-label="Resync new releases from Spotify"
                disabled={loading}
                onclick={resync}
            >
                <RefreshCw class={cn(loading && 'animate-spin')} />
                Resync
            </Button>
        </span>
    </div>
{/snippet}

{#snippet skeleton()}
    <div
        class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-hairline bg-panel"
        aria-busy="true"
        aria-label="Syncing new releases"
    >
        <div class="flex h-9 shrink-0 items-center justify-between border-b border-hairline px-3.5">
            <span class="h-2.5 w-36 animate-pulse rounded bg-surface-2"></span>
            <span class="h-2.5 w-24 animate-pulse rounded bg-surface-2"></span>
        </div>
        {#each [4, 3] as rows, g (g)}
            <div class="flex h-8 items-center px-3.5">
                <span class="h-2.5 w-16 animate-pulse rounded bg-surface-2"></span>
            </div>
            {#each Array(rows) as _, i (i)}
                <div class="flex items-center gap-x-3 border-t border-hairline px-3.5 py-2">
                    <span class="size-9 shrink-0 animate-pulse rounded bg-surface-2"></span>
                    <span class="flex flex-1 flex-col gap-y-1.5">
                        <span class="h-3 w-1/3 animate-pulse rounded bg-surface-2"></span>
                        <span class="h-2.5 w-1/5 animate-pulse rounded bg-surface-2"></span>
                    </span>
                    <span class="h-[18px] w-14 animate-pulse rounded-full bg-surface-2"></span>
                </div>
            {/each}
        {/each}
    </div>
{/snippet}

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

        <div class="flex min-h-0 flex-1 flex-col gap-y-3 px-6 pb-5">
            <div class="flex items-center gap-x-2.5">
                <label class="relative flex-1">
                    <Search
                        class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-dim"
                    />
                    <input
                        type="search"
                        placeholder="Search title, artist or show"
                        aria-label="Search new releases"
                        bind:value={searchQuery}
                        class="flex h-8 w-full rounded-md border border-hairline bg-inset pl-8 pr-3 text-[13px] text-ink-fg placeholder:text-dim hover:border-hairline-strong focus-visible:border-signal/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/30"
                    />
                </label>
                <SegmentedControl
                    size="md"
                    ariaLabel="What to list"
                    value={scope}
                    onValueChange={(value) => newReleasesStore.setScope(value as Scope)}
                    options={SCOPE_OPTIONS}
                />
                <SegmentedControl
                    size="md"
                    ariaLabel="View"
                    value={view}
                    onValueChange={setView}
                    options={VIEW_OPTIONS}
                />
            </div>

            <div class="flex items-center gap-x-2.5">
                <SegmentedControl
                    ariaLabel="How far back"
                    value={range}
                    onValueChange={(value) => newReleasesStore.setRange(value as Range)}
                    options={RANGE_OPTIONS}
                />
                <SegmentedControl
                    ariaLabel="Group by"
                    value={$newReleasesStore.group_by}
                    onValueChange={(value) => newReleasesStore.setGroupBy(value as GroupBy)}
                    options={groupOptions}
                />
                {#if scope !== 'podcasts'}
                    <div
                        class="ml-auto flex items-center gap-x-1"
                        role="group"
                        aria-label="Kinds shown"
                    >
                        {#each INCLUDE as kind (kind.key)}
                            {@const on = $newReleasesStore.filters[kind.key]}
                            <button
                                type="button"
                                aria-pressed={on}
                                title={kind.title}
                                onclick={() => newReleasesStore.setFilter(kind.key, !on)}
                                class={cn(
                                    'chorus-focus inline-flex h-7 items-center gap-x-1.5 rounded-md border px-2 text-xs transition-colors',
                                    on
                                        ? 'border-hairline bg-surface text-ink-fg-2 hover:text-ink-fg'
                                        : 'border-transparent text-ink-muted line-through hover:bg-surface-2'
                                )}
                            >
                                <span class="led {on ? '' : 'led-off'}"></span>
                                {kind.label}
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>

            {#if loading && total === 0 && !searchQuery}
                {@render skeleton()}
            {:else if visible.length === 0}
                <div
                    class="flex min-h-0 flex-1 flex-col items-center justify-center gap-y-2 rounded-lg border border-hairline bg-panel p-10 text-center"
                >
                    <Sparkles class="size-8 text-ink-dim" />
                    {#if searchQuery}
                        <p class="text-[13px] text-ink-fg-2">No releases match “{searchQuery}”</p>
                    {:else if error && total === 0}
                        <p class="text-[13px] text-ink-fg-2">Could not reach Spotify</p>
                        <p class="text-xs text-ink-muted">
                            New releases come through the web player's own session; make sure you
                            are signed in, then try again.
                        </p>
                        <Button variant="outline" size="sm" class="mt-2" onclick={resync}>
                            <RefreshCw class="size-3.5" />
                            Resync
                        </Button>
                    {:else}
                        <p class="text-[13px] text-ink-fg-2">Nothing new {RANGE_WORD[range]}</p>
                        <p class="text-xs text-ink-muted">
                            Releases from the {followedWord} you follow on Spotify appear here. Try a
                            longer range{hiddenCount > 0 ? ', restore the dismissed' : ''}, or
                            resync.
                        </p>
                        <div class="mt-2 flex items-center gap-x-1.5">
                            {#if hiddenCount > 0}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onclick={() => newReleasesStore.restoreDismissed()}
                                >
                                    <Undo2 class="size-3.5" />
                                    Restore {hiddenCount} dismissed
                                </Button>
                            {/if}
                            <Button variant="outline" size="sm" disabled={loading} onclick={resync}>
                                <RefreshCw class={cn('size-3.5', loading && 'animate-spin')} />
                                Resync
                            </Button>
                        </div>
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
                        {#each groups as group (group.key)}
                            <div
                                class="flex h-8 items-center gap-x-2 border-t border-hairline bg-surface/40 px-3.5 first:border-t-0"
                            >
                                <span class="text-[11px] font-medium text-ink-fg-2"
                                    >{group.label}</span
                                >
                                <span class="font-mono text-[10px] text-ink-muted"
                                    >{group.items.length}</span
                                >
                            </div>
                            {#each group.items as release (release.uri)}
                                {@const current = isCurrent(release)}
                                {@const playing = isPlaying(release)}
                                {@const saved = isSaved(release)}
                                {@const meta = releaseMeta(release)}
                                <div
                                    class="flex items-center gap-x-2 border-t border-hairline pr-2 transition-colors hover:bg-surface/60"
                                >
                                    <div
                                        class="flex min-w-0 flex-1 items-center gap-x-3 py-2 pl-3.5"
                                    >
                                        {@render cover(release, 'size-9', 'size-4')}
                                        <span class="flex min-w-0 flex-1 flex-col">
                                            <button
                                                type="button"
                                                title={`Open “${release.title}” in Spotify`}
                                                onclick={() => openIn(release.uri)}
                                                class={cn(
                                                    'max-w-full truncate text-left text-[13px] font-medium hover:underline',
                                                    current ? 'text-signal' : 'text-ink-fg'
                                                )}>{release.title}</button
                                            >
                                            <button
                                                type="button"
                                                title={`Open ${release.artist.name} in Spotify`}
                                                onclick={() => openIn(release.artist.uri)}
                                                class="max-w-full truncate text-left text-[11px] text-ink-muted hover:text-ink-fg hover:underline"
                                                >{release.artist.name}</button
                                            >
                                        </span>
                                        <span class="flex w-[164px] shrink-0 items-center gap-x-2">
                                            {@render typePill(release.type, false)}
                                            {#if meta}
                                                <span
                                                    class="truncate font-mono text-[11px] text-ink-muted"
                                                    >{meta}</span
                                                >
                                            {/if}
                                        </span>
                                    </div>
                                    <span
                                        class="w-12 shrink-0 whitespace-nowrap text-right font-mono text-[10px] text-ink-muted"
                                        title={releasedOn(release)}>{releaseAge(release, now)}</span
                                    >
                                    <Button
                                        variant="ghost"
                                        size="xs"
                                        class={cn(
                                            'gap-x-1 hover:text-ink-fg [&_svg]:size-3.5',
                                            current ? 'text-signal' : 'text-ink-muted'
                                        )}
                                        aria-label={`${playing ? 'Pause' : 'Play'} ${release.title}`}
                                        disabled={starting === release.uri}
                                        onclick={() => play(release)}
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
                                        class={cn(
                                            'gap-x-1 hover:text-ink-fg [&_svg]:size-3.5',
                                            saved ? 'text-signal' : 'text-ink-muted'
                                        )}
                                        aria-pressed={saved}
                                        aria-label={`${saved ? 'Remove' : 'Save'} ${release.title} ${saved ? 'from' : 'to'} Your Library`}
                                        disabled={saving === release.uri}
                                        onclick={() => save(release)}
                                    >
                                        {#if saved}
                                            <BookmarkCheck />
                                            Saved
                                        {:else}
                                            <Bookmark />
                                            Save
                                        {/if}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="xs"
                                        class="gap-x-1 text-ink-muted hover:text-ink-fg [&_svg]:size-3.5"
                                        aria-label={`Dismiss ${release.title}`}
                                        onclick={() => dismiss(release)}
                                    >
                                        <EyeOff />
                                        Dismiss
                                    </Button>
                                </div>
                            {/each}
                        {/each}
                    </div>
                </div>
            {:else}
                <!-- Grid: the cover carries the type, the saved mark and, on hover, the actions. -->
                <div class="flex min-h-0 shrink flex-col gap-y-2">
                    {@render listHeader()}
                    <div class="chorus-scroll min-h-0 overflow-y-auto">
                        {#each groups as group, g (group.key)}
                            <div
                                class={cn(
                                    'flex items-baseline gap-x-2 px-0.5 pb-2',
                                    g > 0 && 'pt-4'
                                )}
                            >
                                <span class="rack-label">{group.label}</span>
                                <span class="font-mono text-[10px] text-ink-muted"
                                    >{group.items.length}</span
                                >
                            </div>
                            <div class="grid grid-cols-5 gap-x-3.5 gap-y-4 p-0.5">
                                {#each group.items as release (release.uri)}
                                    {@const current = isCurrent(release)}
                                    {@const playing = isPlaying(release)}
                                    {@const saved = isSaved(release)}
                                    {@const meta = releaseMeta(release)}
                                    <div class="group flex min-w-0 flex-col gap-y-1">
                                        <div
                                            class={cn(
                                                'relative aspect-square w-full overflow-hidden rounded-md bg-surface-2 text-ink-dim',
                                                current && 'ring-2 ring-signal'
                                            )}
                                        >
                                            {@render cover(
                                                release,
                                                'size-full rounded-none',
                                                'size-6'
                                            )}
                                            <span
                                                class="pointer-events-none absolute right-2 top-2"
                                            >
                                                {@render typePill(release.type, true)}
                                            </span>
                                            {#if saved}
                                                <span
                                                    class="pointer-events-none absolute left-2 top-2 inline-flex size-[18px] items-center justify-center rounded-full bg-signal text-ink shadow-float"
                                                    title="In Your Library"
                                                >
                                                    <BookmarkCheck
                                                        class="size-3"
                                                        strokeWidth={2.5}
                                                    />
                                                </span>
                                            {/if}
                                            <div
                                                class="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-x-1.5 p-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
                                            >
                                                <button
                                                    type="button"
                                                    aria-label={`${playing ? 'Pause' : 'Play'} ${release.title}`}
                                                    disabled={starting === release.uri}
                                                    onclick={() => play(release)}
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
                                                    aria-pressed={saved}
                                                    aria-label={`${saved ? 'Remove' : 'Save'} ${release.title} ${saved ? 'from' : 'to'} Your Library`}
                                                    disabled={saving === release.uri}
                                                    onclick={() => save(release)}
                                                    class={cn(
                                                        onCoverButton,
                                                        'w-6 bg-ink/80 hover:bg-ink',
                                                        saved ? 'text-signal' : 'text-ink-fg'
                                                    )}
                                                >
                                                    {#if saved}
                                                        <BookmarkCheck
                                                            class="size-3"
                                                            strokeWidth={2.5}
                                                        />
                                                    {:else}
                                                        <Bookmark
                                                            class="size-3"
                                                            strokeWidth={2.5}
                                                        />
                                                    {/if}
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label={`Dismiss ${release.title}`}
                                                    onclick={() => dismiss(release)}
                                                    class={cn(
                                                        onCoverButton,
                                                        'w-6 bg-ink/80 text-ink-fg hover:bg-ink'
                                                    )}
                                                >
                                                    <EyeOff class="size-3" strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            title={`Open “${release.title}” in Spotify`}
                                            onclick={() => openIn(release.uri)}
                                            class={cn(
                                                'max-w-full truncate text-left text-xs font-medium hover:underline',
                                                current ? 'text-signal' : 'text-ink-fg'
                                            )}>{release.title}</button
                                        >
                                        <button
                                            type="button"
                                            title={`Open ${release.artist.name} in Spotify`}
                                            onclick={() => openIn(release.artist.uri)}
                                            class="max-w-full truncate text-left text-[11px] text-ink-muted hover:text-ink-fg hover:underline"
                                            >{release.artist.name}</button
                                        >
                                        <span
                                            class="flex items-center justify-between gap-x-2 font-mono text-[10px] text-ink-muted"
                                        >
                                            <span class="truncate">{meta}</span>
                                            <span class="shrink-0" title={releasedOn(release)}
                                                >{releaseAge(release, now)}</span
                                            >
                                        </span>
                                    </div>
                                {/each}
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            <div class="flex shrink-0 flex-wrap items-center gap-x-1 text-[11px] text-ink-muted">
                Play starts the release on this device; Save adds it to Your Library. Dismissed
                releases stay hidden for a month, and Chorus checks for new ones when Spotify loads.
            </div>
        </div>
    </Dialog.Content>
</Dialog.Root>
