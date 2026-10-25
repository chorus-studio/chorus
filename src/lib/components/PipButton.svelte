<script lang="ts">
    import { onMount } from 'svelte'
    import { pipStore } from '$lib/stores/pip'
    import { settingsStore } from '$lib/stores/settings'
    import { togglePictureInPicture } from '$lib/utils/pip'

    import * as Tooltip from '$lib/components/ui/tooltip'
    import { buttonVariants } from '$lib/components/ui/button'
    import PictureInPicture2 from '@lucide/svelte/icons/picture-in-picture-2'

    let pipWindow: DocumentPictureInPictureWindow | undefined = $state()

    async function togglePip() {
        if (pipWindow) {
            pipWindow.close()
            pipWindow = undefined
        } else {
            await pipStore.updatePip({ active: !$pipStore.active })
            pipWindow = await togglePictureInPicture()
        }
    }

    const show = $derived($settingsStore.ui.pip)
    const label = $derived($pipStore.active ? 'Close floating player' : 'Open floating player')

    onMount(() => {
        pipStore.reset()
        return () => pipStore.reset()
    })
</script>

{#if show}
    <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
            <Tooltip.Trigger
                id="chorus-pip"
                onclick={togglePip}
                aria-label={label}
                aria-pressed={$pipStore.active}
                class={buttonVariants({
                    variant: 'bar',
                    size: 'icon-sm',
                    class: `[&_svg]:size-[18px] ${$pipStore.active ? 'text-signal-bar opacity-100' : ''}`
                })}
            >
                <PictureInPicture2 />
            </Tooltip.Trigger>
            <Tooltip.Content>{label}</Tooltip.Content>
        </Tooltip.Root>
    </Tooltip.Provider>
{/if}
