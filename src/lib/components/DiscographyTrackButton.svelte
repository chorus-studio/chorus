<script lang="ts">
    import { toast } from 'svelte-sonner'
    import Disc3 from '@lucide/svelte/icons/disc-3'
    import Check from '@lucide/svelte/icons/check'
    import LoaderCircle from '@lucide/svelte/icons/loader-circle'
    import { discographyPrefs, discographyStore } from '$lib/stores/discography'
    import { trackDiscography, trackOneAlbum } from '$lib/utils/discography-track'
    import { albumSummary, artistSummary, scopeOf } from '$lib/utils/discography'
    import type { PageTarget } from '$lib/utils/discography-pages'
    import { cn } from '$lib/utils.js'

    // The Track pill grafted beside Follow / Save on Spotify's artist and
    // album pages. It wears Spotify's own Encore variables (text-base,
    // essential-subdued, bright-accent), so it matches the Follow pill on the
    // vanilla player and follows the palette on a themed one.
    let { target }: { target: PageTarget } = $props()
    let busy = $state(false)

    const artist = $derived($discographyStore[target.artist.id])
    const album = $derived(
        target.kind === 'album' ? artist?.albums[target.album.id] : undefined
    )
    const scope = $derived(artist ? scopeOf(artist) : null)

    // What the pill says and does for this page:
    //  - artist page: track / stop tracking the whole discography;
    //  - album page: track / stop tracking this one release, or, when the
    //    whole discography is tracked, say so and go nowhere.
    const pill = $derived.by(() => {
        if (target.kind === 'artist') {
            if (artist?.tracked) {
                const s = artistSummary(artist, $discographyPrefs.filters)
                const word = $discographyPrefs.filters.singles || $discographyPrefs.filters.compilations
                    ? 'releases'
                    : 'albums'
                return {
                    on: true,
                    label: `Tracking · ${s.albumsDone} of ${s.albums} ${word}`,
                    title: 'Stop tracking this discography',
                    action: 'untrack-artist' as const
                }
            }
            return {
                on: false,
                label: 'Track discography',
                title: `Track every release by ${target.artist.name || 'this artist'}`,
                action: 'track-artist' as const
            }
        }
        if (album?.tracked) {
            const s = albumSummary(album)
            return {
                on: true,
                label: `Tracking · ${s.heard} of ${s.total || '?'}`,
                title: 'Stop tracking this album',
                action: 'untrack-album' as const
            }
        }
        if (scope === 'discography' && album) {
            const s = albumSummary(album)
            return {
                on: true,
                label: `In discography · ${s.heard} of ${s.total || '?'}`,
                title: `Counted in ${target.artist.name || 'the artist'}'s tracked discography`,
                action: 'none' as const
            }
        }
        return {
            on: false,
            label: 'Track album',
            title: 'Track your way through this album',
            action: 'track-album' as const
        }
    })

    async function onClick() {
        if (busy || pill.action === 'none') return
        busy = true
        try {
            if (pill.action === 'track-artist') {
                const ok = await trackDiscography(target.artist)
                if (!ok) toast.error('Spotify did not list that discography')
            } else if (pill.action === 'untrack-artist') {
                await discographyStore.untrackArtist(target.artist.id)
            } else if (pill.action === 'track-album' && target.kind === 'album') {
                await trackOneAlbum(target.artist, target.album)
            } else if (pill.action === 'untrack-album' && target.kind === 'album') {
                await discographyStore.untrackAlbum(target.artist.id, target.album.id)
            }
        } catch (error) {
            console.error('Could not change tracking:', error)
            toast.error('Could not change tracking')
        } finally {
            busy = false
        }
    }
</script>

<button
    type="button"
    id="chorus-track-button"
    title={pill.title}
    aria-pressed={pill.on}
    aria-busy={busy}
    disabled={pill.action === 'none'}
    onclick={onClick}
    class={cn(
        'mx-2 inline-flex h-8 shrink-0 select-none items-center gap-x-1.5 whitespace-nowrap rounded-full border px-[15px] text-[14px] font-bold leading-none transition-[transform,border-color,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--text-bright-accent,#1ed760)] disabled:cursor-default',
        pill.on
            ? 'border-[color:var(--essential-bright-accent,#1ed760)] bg-[color:color-mix(in_srgb,var(--essential-bright-accent,#1ed760)_12%,transparent)] text-[color:var(--text-bright-accent,#1ed760)] enabled:hover:scale-[1.04]'
            : 'border-[color:var(--essential-subdued,#727272)] bg-transparent text-[color:var(--text-base,#fff)] hover:scale-[1.04] hover:border-[color:var(--text-base,#fff)]'
    )}
>
    {#if busy}
        <LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
    {:else if pill.on}
        <Check class="size-[15px]" strokeWidth={3} aria-hidden="true" />
    {:else}
        <Disc3 class="size-4" aria-hidden="true" />
    {/if}
    {busy && pill.action === 'track-artist' ? 'Listing…' : pill.label}
</button>
