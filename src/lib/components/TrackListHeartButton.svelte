<script lang="ts">
    import { onMount } from 'svelte'
    import { Heart } from 'lucide-svelte'

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

        const method = isLiked ? 'DELETE' : 'PUT'
        await trackService?.updateLikedTracks({ ids: track.track_id, method })
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
</script>

<Tooltip.Provider>
    <Tooltip.Root>
        <Tooltip.Trigger
            role="heart"
            onclick={handleClick}
            aria-label={isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
            class={buttonVariants({
                variant: 'ghost',
                size: 'icon',
                class: 'size-7 border-none bg-transparent stroke-current px-0 hover:bg-transparent [&_svg]:size-[1.125rem]'
            })}
        >
            <Heart
                role="heart"
                size={24}
                class={`${isLiked ? 'fill-[#1ed760]' : 'fill-transparent'} ${
                    isLiked ? 'stroke-[#1ed760]' : 'stroke-current'
                }`}
            />
        </Tooltip.Trigger>
        <Tooltip.Content class="bg-background p-2 text-sm text-white">
            <p>{isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}</p>
        </Tooltip.Content>
    </Tooltip.Root>
</Tooltip.Provider>
