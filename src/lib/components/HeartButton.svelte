<script lang="ts">
    import { onMount } from 'svelte'
    import { Heart } from 'lucide-svelte'
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
        const button = document.querySelector(
            'div[data-testid="now-playing-widget"] > button[data-encore-id="buttonTertiary"]'
        )
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
