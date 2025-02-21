<script lang="ts">
    import { onMount } from 'svelte'
    import { Heart } from 'lucide-svelte'
    import { nowPlaying } from '$lib/stores/now-playing'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import { getTrackService } from '$lib/api/services/track'
    import { buttonVariants } from '$lib/components/ui/button'

    let trackService = getTrackService()
    let currentId = $state($nowPlaying.id)

    function onLikedPage() {
        return window.location.pathname.includes('/collection/tracks')
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

            const heartIcon = trackRow.querySelector('button[role="heart"]')
            if (!heartIcon) return

            const svg = heartIcon.querySelector('svg')
            if (!svg) return

            heartIcon.style.visibility = highlight ? 'visible' : 'hidden'

            const highlight = $nowPlaying.liked
            heartIcon.setAttribute('aria-label', `${highlight ? 'Remove from' : 'Save to'} Liked`)
            svg.style.fill = highlight ? '#1ed760' : 'transparent'
            svg.style.stroke = highlight ? '#1ed760' : 'currentColor'
        })
    }

    async function getTrackId() {
        const { type, id, url, track_id = null } = $nowPlaying
        if (track_id) return track_id
        if (type == 'album') {
            const albumId = new URL(url).pathname.split('/').pop()
            return await getTrackIdFromAlbumId(albumId)
        }
    }

    async function handleClick() {
        let { type, id, url, track_id = '', liked } = $nowPlaying
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
            await nowPlaying.setLiked(!liked)
            higlightInTrackList(track_id)
        }
    }

    async function isTrackLiked(id: string) {
        const trackId = await getTrackId()
        if (!trackId) return false

        nowPlaying.set({ ...$nowPlaying, track_id: trackId })
        const response = await trackService.checkIfTracksInCollection(trackId)
        if (!response) return false

        await nowPlaying.setLiked(response.at(0))
    }

    onMount(async () => {
        const unsubscribe = nowPlaying.subscribe(async (nowPlaying) => {
            if (nowPlaying.id !== currentId && !nowPlaying.track_id) {
                currentId = nowPlaying.id
                console.log({ nowPlaying, currentId })
                await isTrackLiked(nowPlaying.id)
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
