<script lang="ts">
    import { Ban } from 'lucide-svelte'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import { buttonVariants } from '$lib/components/ui/button'

    import { dataStore } from '$lib/stores/data'
    import { trackObserver } from '$lib/observers/track'
    import { nowPlaying } from '$lib/stores/now-playing'
    import type { SimpleTrack } from '$lib/stores/data/cache'

    let { track }: { track: SimpleTrack } = $props()
    let isBlocked = $state(track?.blocked ?? false)

    // Listen for unblock events from BlockedTracksDialog (event-driven, no polling)
    $effect(() => {
        if (!isBlocked) return

        const handleUnblock = (event: Event) => {
            const customEvent = event as CustomEvent<{ track_id: string }>
            if (customEvent.detail.track_id === track.track_id) {
                isBlocked = false
            }
        }

        document.addEventListener('chorus:track-unblocked', handleUnblock)
        return () => document.removeEventListener('chorus:track-unblocked', handleUnblock)
    })

    function getCoverArt() {
        const image = document.querySelector(
            'button[aria-label="View album artwork"] img'
        ) as HTMLImageElement
        if (!image?.src) return null
        return image.src
    }

    async function handleBlock() {
        isBlocked = !isBlocked

        if (track) {
            const cover = track?.cover || getCoverArt()
            await dataStore.updateTrack({
                track_id: track.track_id,
                value: { blocked: isBlocked, cover }
            })

            // Emit event for reactive updates
            if (isBlocked) {
                document.dispatchEvent(
                    new CustomEvent('chorus:track-blocked', {
                        detail: { track_id: track.track_id }
                    })
                )

                // If the blocked track is currently playing, skip it immediately
                if (track?.song_id === $nowPlaying.id) {
                    trackObserver?.skipTrack()
                }
            } else {
                document.dispatchEvent(
                    new CustomEvent('chorus:track-unblocked', {
                        detail: { track_id: track.track_id }
                    })
                )
            }
        }
    }
</script>

<Tooltip.Provider>
    <Tooltip.Root>
        <Tooltip.Trigger
            role="block"
            aria-label={isBlocked ? 'Unblock Track' : 'Block Track'}
            onclick={handleBlock}
            class={buttonVariants({
                variant: 'ghost',
                size: 'icon',
                class: 'size-7 border-none bg-transparent stroke-current hover:bg-transparent [&_svg]:size-[1.125rem]'
            })}
        >
            <Ban role="block" size={24} color={isBlocked ? '#1ed760' : 'currentColor'} />
        </Tooltip.Trigger>
        <Tooltip.Content class="bg-background p-2 text-sm text-white">
            <p>{isBlocked ? 'Unblock Track' : 'Block Track'}</p>
        </Tooltip.Content>
    </Tooltip.Root>
</Tooltip.Provider>
