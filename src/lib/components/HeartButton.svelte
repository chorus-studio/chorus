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

    function inUserCollection() {
        if (!$nowPlaying?.track_id) return false
        return dataStore.checkInUserCollection($nowPlaying.track_id)
    }

    function isAlreadyLiked() {
        const likedState = inUserCollection()
        if (likedState !== null) return likedState

        // If Spotify does not highlight the liked button, assume it's not liked
        if (!isSpotifyHighlighted()) {
            if ($nowPlaying.track_id) {
                dataStore.updateUserCollection({
                    track_id: $nowPlaying.track_id,
                    liked: false
                })
            }
            return false
        }
        return $nowPlaying.liked
    }

    function isSpotifyHighlighted() {
        const button = document.querySelector(
            'div[data-testid="now-playing-widget"] > div > button[data-encore-id="buttonTertiary"]'
        )
        if (!button) return false

        const ariaChecked = button.getAttribute('aria-checked')
        return ariaChecked ? JSON.parse(ariaChecked) : false
    }

    async function getTrackIdFromAlbumId(albumId: string) {
        const response = await trackService.getAlbum(albumId)
        if (!response) return null

        const foundTrack = response.tracks.items.find((track) => {
            const artists = track.artists.map((artist) => artist.name).join(',')
            const songTitle = `${track.name} by ${artists}`
            return songTitle == $nowPlaying.id
        })

        if (!foundTrack) return null

        return foundTrack.id
    }

    function higlightInTrackList(trackId: string) {
        const anchors = document.querySelectorAll(
            `a[data-testid="internal-track-link"][href="/track/${trackId}"]`
        )
        if (!anchors?.length) return

        anchors.forEach((anchor) => {
            const trackRow = anchor?.parentElement?.parentElement?.parentElement
            if (!trackRow) return

            const heartIcon = trackRow.querySelector('button[role="heart"]') as HTMLButtonElement
            if (!heartIcon) return

            const svg = heartIcon.querySelector('svg')
            if (!svg) return

            const highlight = $nowPlaying.liked
            heartIcon.setAttribute('aria-label', `${highlight ? 'Remove from' : 'Save to'} Liked`)
            svg.style.fill = highlight ? '#1ed760' : 'none'
            svg.style.stroke = highlight ? '#1ed760' : 'currentColor'
        })
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

        shouldHighlight = isAlreadyLiked() ?? false
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
                setTimeout(async () => await highlightHeart(), 1500)
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
