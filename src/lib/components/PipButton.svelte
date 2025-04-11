<script lang="ts">
    import { pipStore } from '$lib/stores/pip'
    import { settingsStore } from '$lib/stores/settings'
    import { supporterStore } from '$lib/stores/supporter'
    import { togglePictureInPicture } from '$lib/utils/pip'

    import { Button } from '$lib/components/ui/button'
    import PictureInPicture from '@lucide/svelte/icons/picture-in-picture'

    let pipWindow: DocumentPictureInPictureWindow | undefined = $state()

    async function togglePip() {
        if (pipWindow) {
            pipWindow.close()
            pipWindow = undefined
        } else {
            await pipStore.setActive(!$pipStore.active)
            pipWindow = await togglePictureInPicture()
        }
    }

    const show = $derived($settingsStore.ui.pip)

    onMount(() => {
        pipStore.reset()
        return () => pipStore.reset()
    })
</script>

{#if $supporterStore.isSupporter && show}
    <Button
        size="icon"
        id="chorus-pip"
        variant="secondary"
        onclick={togglePip}
        class="size-7 border-none {$pipStore.active
            ? 'text-[#1ed367]'
            : 'text-muted-foreground'}  bg-transparent stroke-current hover:bg-transparent [&_svg]:size-[1.125rem]"
    >
        <PictureInPicture />
    </Button>
{/if}
