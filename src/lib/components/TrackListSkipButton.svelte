<script lang="ts">
    import Ban from '@lucide/svelte/icons/ban'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import { buttonVariants } from '$lib/components/ui/button'

    import { dataStore } from '$lib/stores/data'
    import { trackObserver } from '$lib/observers/track'
    import { nowPlaying } from '$lib/stores/now-playing'
    import type { SimpleTrack } from '$lib/stores/data/cache'

    let { track }: { track: SimpleTrack } = $props()
    let isBlocked = $state(track?.blocked || false)

    $effect(() => {
        const handleBlockUnBlock = (event: Event) => {
            const customEvent = event as CustomEvent<{ track_id: string }>
            if (customEvent.detail.track_id === track.track_id) {
                const found = dataStore.blocked.find(
                    (blockedTrack) => blockedTrack.track_id == track.track_id
                )
                isBlocked = !!found
            }
        }

        document.addEventListener('chorus:track-blocked', handleBlockUnBlock)
        document.addEventListener('chorus:track-unblocked', handleBlockUnBlock)
        return () => {
            document.removeEventListener('chorus:track-blocked', handleBlockUnBlock)
            document.removeEventListener('chorus:track-unblocked', handleBlockUnBlock)
        }
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

        if (track?.track_id) {
            const cover = track?.cover || getCoverArt()
            await dataStore.updateTrack({
                track_id: track.track_id,
                value: {
                    blocked: isBlocked || null,
                    blocked_at: isBlocked ? Date.now() : null,
                    cover
                }
            })

            if (isBlocked) {
                document.dispatchEvent(
                    new CustomEvent('chorus:track-blocked', {
                        detail: { track_id: track.track_id, cover }
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

    const label = $derived(isBlocked ? 'Unblock track' : 'Block track')
</script>

<Tooltip.Provider delayDuration={300}>
    <Tooltip.Root>
        <Tooltip.Trigger
            role="block"
            aria-label={label}
            aria-pressed={isBlocked}
            onclick={handleBlock}
            class={buttonVariants({
                variant: 'bar',
                size: 'icon-sm',
                class: `[&_svg]:size-[18px] ${isBlocked ? 'text-signal-bar opacity-100' : ''}`
            })}
        >
            <Ban role="block" />
        </Tooltip.Trigger>
        <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip.Root>
</Tooltip.Provider>
