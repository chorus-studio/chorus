<script lang="ts">
    import { onMount } from 'svelte'
    import { Heart } from 'lucide-svelte'
    import * as Tooltip from '$lib/components/ui/tooltip'

    import { dataStore } from '$lib/stores/data'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { getTrackService } from '$lib/api/services/track'
    import { buttonVariants } from '$lib/components/ui/button'

    let trackService = getTrackService()
    let currentId = $state<string | null>(null)

    async function isTrackLiked(track_id: string) {
        const likedState = dataStore.checkInUserCollection(track_id)
        if (likedState !== null) return likedState

        const response = await trackService.checkIfTracksInCollection(track_id)
        if (!response) return false

        const isLiked = (response as Array<boolean>)?.at(0) ?? false
        // If Spotify does not highlight the liked button, assume it's not liked
        dataStore.updateUserCollection({ track_id, liked: isLiked })

        return isLiked
    }

    async function getTrackIdFromAlbumId(albumId: string) {
        const response = await trackService.getAlbum(albumId)
        if (!response) return null

        const foundTrack = (response as any).tracks.items.find((track: any) => {
            const artists = track.artists.map((artist: any) => artist.name).join(',')
            const songTitle = `${track.name} by ${artists}`
            return songTitle == $nowPlaying.id
        })

        if (!foundTrack) return null

        return foundTrack.id
    }

    function higlightInTrackList(trackId: string) {
        setTimeout(() => {
            const anchors = document.querySelectorAll(
                `a[data-testid="internal-track-link"][href="/track/${trackId}"]`
            )
            if (!anchors?.length) return

            anchors.forEach((anchor) => {
                const trackRow = anchor?.parentElement?.parentElement?.parentElement
                if (!trackRow) return

                const heartIcon = trackRow.querySelector(
                    'button[role="heart"]'
                ) as HTMLButtonElement
                if (!heartIcon) return

                const svg = heartIcon.querySelector('svg')
                if (!svg) return

                const highlight = $nowPlaying.liked
                heartIcon.setAttribute(
                    'aria-label',
                    `${highlight ? 'Remove from' : 'Save to'} Liked`
                )
                svg.style.fill = highlight ? '#1ed760' : 'none'
                svg.style.stroke = highlight ? '#1ed760' : 'currentColor'
            })
        }, 500)
    }

    async function getTrackId() {
        if ($nowPlaying.track_id) return $nowPlaying.track_id
        if ($nowPlaying.album_id) {
            const trackId = await getTrackIdFromAlbumId($nowPlaying.album_id)
            nowPlaying.set({ ...$nowPlaying, track_id: trackId })
            return trackId
        }
    }

    async function handleClick() {
        let { track_id, liked } = $nowPlaying
        if (!track_id) {
            track_id = await getTrackId()
        }

        if (track_id) {
            nowPlaying.set({ ...$nowPlaying, track_id })

            const response = await trackService?.updateLikedTracks({
                ids: track_id,
                method: liked ? 'DELETE' : 'PUT'
            })

            if (response !== 'empty response') return

            dataStore.updateUserCollection({ track_id, liked: !liked })
            await nowPlaying.setLiked(!liked)
            await dataStore.updateTrack({
                track_id: track_id,
                value: { liked: !liked }
            })

            higlightInTrackList(track_id)
        }
    }

    async function highlightHeart() {
        const trackId = await getTrackId()
        let shouldHighlight = false

        shouldHighlight = await isTrackLiked(trackId)
        dataStore.updateUserCollection({
            track_id: trackId,
            liked: shouldHighlight
        })
        await nowPlaying.setLiked(shouldHighlight)
        await dataStore.updateTrack({
            track_id: trackId,
            value: { liked: shouldHighlight }
        })
        higlightInTrackList(trackId)
    }

    async function init() {
        await highlightHeart()
    }

    onMount(() => {
        init()
        const unsubscribe = nowPlaying.subscribe(async (nowPlaying) => {
            if (nowPlaying.id !== currentId) {
                currentId = nowPlaying.id
                await highlightHeart()
            }
        })

        return () => unsubscribe()
    })
</script>

<Tooltip.Provider>
    <Tooltip.Root>
        <Tooltip.Trigger
            role="heart"
            id="chorus-heart"
            onclick={handleClick}
            aria-label={$nowPlaying.liked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
            class={buttonVariants({
                variant: 'ghost',
                size: 'icon',
                class: 'size-7 border-none bg-transparent stroke-current px-0 hover:bg-transparent [&_svg]:size-[1.125rem]'
            })}
        >
            <Heart
                size={24}
                fill={$nowPlaying.liked ? '#1ed760' : 'none'}
                color={$nowPlaying.liked ? '#1ed760' : 'currentColor'}
            />
        </Tooltip.Trigger>
        <Tooltip.Content class="bg-background p-2 text-sm text-white">
            <p>{$nowPlaying.liked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}</p>
        </Tooltip.Content>
    </Tooltip.Root>
</Tooltip.Provider>
