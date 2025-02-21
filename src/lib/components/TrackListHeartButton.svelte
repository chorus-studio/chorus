<script lang="ts">
    import { onMount } from 'svelte'
    import { Heart } from 'lucide-svelte'
    import { nowPlaying } from '$lib/stores/now-playing'
    import type { TrackSongInfo } from '$lib/utils/song'
    import { getTrackService } from '$lib/api/services/track'

    import * as Tooltip from '$lib/components/ui/tooltip'
    import { buttonVariants } from '$lib/components/ui/button'

    let { trackInfo }: { trackInfo: TrackSongInfo } = $props()
    let isLiked = $state(false)
    let trackService = getTrackService()

    async function handleClick() {
        if (!trackInfo.track_id) {
            console.error('No track_id provided')
            return
        }

        const method = isLiked ? 'DELETE' : 'PUT'

        const result = await trackService?.updateLikedTracks({
            ids: trackInfo.track_id,
            method
        })
        isLiked = method === 'PUT'
        await updateCurrentTrack(isLiked)
    }

    function onLikedPage() {
        return window.location.pathname.includes('/collection/tracks')
    }

    async function updateCurrentTrack(liked: boolean) {
        if ($nowPlaying.id !== trackInfo.id) return

        await nowPlaying.setLiked(liked)
    }

    onMount(async () => {
        isLiked = onLikedPage()
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
                size={24}
                fill={isLiked ? '#1ed760' : 'none'}
                color={isLiked ? '#1ed760' : 'currentColor'}
            />
        </Tooltip.Trigger>
        <Tooltip.Content class="bg-background p-2 text-sm text-white">
            <p>{isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}</p>
        </Tooltip.Content>
    </Tooltip.Root>
</Tooltip.Provider>
