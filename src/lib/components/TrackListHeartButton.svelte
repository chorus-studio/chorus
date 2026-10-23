<script lang="ts">
    import { onMount } from 'svelte'
    import Heart from '@lucide/svelte/icons/heart'

    import { dataStore } from '$lib/stores/data'
    import type { SimpleTrack } from '$lib/stores/data/cache'

    import { nowPlaying } from '$lib/stores/now-playing'
    import { getTrackService } from '$lib/api/services/track'

    import * as Tooltip from '$lib/components/ui/tooltip'
    import { buttonVariants } from '$lib/components/ui/button'

    let { track }: { track: SimpleTrack } = $props()
    let isLiked = $state(track?.liked ?? false)
    let trackService = getTrackService()

    async function handleClick() {
        if (!track?.track_id) return

        await trackService?.updateLikedTracks({
            ids: track.track_id,
            action: isLiked ? 'remove' : 'add'
        })

        isLiked = !isLiked

        dataStore.updateUserCollection({ track_id: track.track_id!, liked: isLiked })
        await dataStore.updateTrack({ track_id: track.track_id!, value: { liked: isLiked } })
        await updateCurrentTrack(isLiked)
    }

    function onLikedPage() {
        return window.location.pathname.includes('/collection/tracks')
    }

    async function updateCurrentTrack(liked: boolean) {
        if ($nowPlaying.id !== track?.song_id) return

        await nowPlaying.setLiked(liked)
    }

    onMount(() => {
        isLiked = onLikedPage()
        if (track) {
            isLiked = track?.liked ?? false
        }
    })

    const label = $derived(isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs')
</script>

<Tooltip.Provider delayDuration={300}>
    <Tooltip.Root>
        <Tooltip.Trigger
            role="heart"
            onclick={handleClick}
            aria-label={label}
            aria-pressed={isLiked}
            class={buttonVariants({
                variant: 'bar',
                size: 'icon-sm',
                class: `[&_svg]:size-[18px] ${isLiked ? 'text-signal opacity-100' : ''}`
            })}
        >
            <Heart role="heart" class={isLiked ? 'fill-current' : ''} />
        </Tooltip.Trigger>
        <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip.Root>
</Tooltip.Provider>
