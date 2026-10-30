<script lang="ts">
    import { toast } from 'svelte-sonner'
    import { dataStore } from '$lib/stores/data'
    import { configStore } from '$lib/stores/config'
    import { trackObserver } from '$lib/observers/track'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { artistsOf, matchesBlockedArtist } from '$lib/utils/auto-skip'

    import Ban from '@lucide/svelte/icons/ban'
    import UserX from '@lucide/svelte/icons/user-x'
    import * as HoverCard from '$lib/components/ui/hover-card'
    import { buttonVariants } from '$lib/components/ui/button'

    async function handleBlock(): Promise<void> {
        if ($nowPlaying.track_id) {
            const { cover, track_id } = $nowPlaying

            await dataStore.updateTrack({
                track_id,
                value: { blocked: true, blocked_at: Date.now(), cover }
            })

            document.dispatchEvent(
                new CustomEvent('chorus:track-blocked', {
                    detail: { track_id: track_id, cover }
                })
            )
        }

        trackObserver?.nextTrack()
    }

    // The hover card offers the stronger block: every track by one of the
    // playing track's artists. The Auto-skip tab lists and removes them.
    const artists = $derived(artistsOf($nowPlaying.artist).slice(0, 4))
    const isBlockedArtist = (name: string) =>
        matchesBlockedArtist($configStore.auto_skip.artists, name)

    async function blockArtist(name: string) {
        await configStore.blockArtist(name)
        toast.success(`Blocked ${name} · their tracks are skipped`)
        trackObserver?.nextTrack()
    }
</script>

<HoverCard.Root openDelay={600} closeDelay={250}>
    <HoverCard.Trigger
        role="block"
        id="chorus-block"
        aria-label="Block track and skip"
        onclick={handleBlock}
        class={buttonVariants({
            variant: 'bar',
            size: 'icon-sm',
            class: '[&_svg]:size-[18px]'
        })}
    >
        <Ban />
    </HoverCard.Trigger>
    <HoverCard.Content class="flex w-56 flex-col gap-y-2" side="top" align="end">
        <div class="flex flex-col gap-y-0.5">
            <span class="text-[13px] font-medium text-ink-fg">Block track and skip</span>
            <span class="text-[11px] leading-snug text-ink-muted">
                Click the button. It never plays again in playlists, albums, radio or the queue.
            </span>
        </div>
        {#if artists.length}
            <div class="flex flex-col gap-y-1 border-t border-hairline pt-2">
                <span class="rack-label">Or block the artist</span>
                {#each artists as name (name)}
                    {@const blocked = isBlockedArtist(name)}
                    <button
                        type="button"
                        disabled={blocked}
                        onclick={() => blockArtist(name)}
                        class="flex h-7 items-center gap-x-2 rounded-md px-2 text-left text-xs text-ink-fg hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal disabled:cursor-default disabled:text-ink-muted disabled:hover:bg-transparent"
                    >
                        <UserX class="size-3.5 shrink-0" />
                        <span class="truncate">{name}</span>
                        {#if blocked}
                            <span
                                class="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted"
                                >blocked</span
                            >
                        {/if}
                    </button>
                {/each}
            </div>
        {/if}
    </HoverCard.Content>
</HoverCard.Root>
