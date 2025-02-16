<script lang="ts">
    import { onMount } from 'svelte'
    import { Heart } from 'lucide-svelte'
    import { Button } from '$lib/components/ui/button'
    import { buttonVariants } from '$lib/components/ui/button'
    import * as Tooltip from '$lib/components/ui/tooltip'

    let isLiked = $state(false)
    let isOnLikedPage = $state(false)

    function handleClick() {
        isLiked = !isLiked
    }

    function onLikedPage() {
        return window.location.pathname.includes('/collection/tracks')
    }

    function isSpotifyHighlighted() {
        const button = document.querySelector('div[data-testid="now-playing-widget"] > button[data-encore-id="buttonTertiary"]')
        if (!button) return false

        const ariaChecked = button.getAttribute('aria-checked')
        return ariaChecked ? JSON.parse(ariaChecked) : false
    }

    onMount(() => {
        isOnLikedPage = onLikedPage()
        isLiked = isSpotifyHighlighted()
    })
</script>

<Tooltip.Provider>
    <Tooltip.Root>
        <Tooltip.Trigger
            id="chorus-heart"
            onclick={handleClick}
            aria-label={isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
            class={buttonVariants({ variant: 'ghost', size: 'icon', class: 'size-7 bg-transparent hover:bg-transparent px-0 border-none stroke-current [&_svg]:size-[1.125rem]' })}
        >
            <Heart size={24} fill={isLiked ? '#1ed760' : 'none'} color={isLiked ? '#1ed760' : 'currentColor'} />
        </Tooltip.Trigger>
        <Tooltip.Content class="text-sm bg-background text-white h-6 p-2">
            <p>{isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}</p>
        </Tooltip.Content>
    </Tooltip.Root>
</Tooltip.Provider>