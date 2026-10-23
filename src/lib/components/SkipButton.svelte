<script lang="ts">
    import { dataStore } from '$lib/stores/data'
    import { trackObserver } from '$lib/observers/track'
    import { nowPlaying } from '$lib/stores/now-playing'

    import Ban from '@lucide/svelte/icons/ban'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import { buttonVariants } from '$lib/components/ui/button'

    async function handleBlock(): Promise<void> {
        if ($nowPlaying.track_id) {
            const { cover, track_id } = $nowPlaying

            await dataStore.updateTrack({
                track_id,
                value: { blocked: true, cover }
            })

            document.dispatchEvent(
                new CustomEvent('chorus:track-blocked', {
                    detail: { track_id: track_id, cover }
                })
            )
        }

        trackObserver?.skipTrack()
    }
</script>

<Tooltip.Provider delayDuration={300}>
    <Tooltip.Root>
        <Tooltip.Trigger
            role="block"
            id="chorus-block"
            aria-label="Block track and skip"
            onclick={handleBlock}
            class={buttonVariants({
                variant: 'bar',
                size: 'icon-sm',
                class: '[&_svg]:size-[18px]'
            })}
        >
            <Ban />
        </Tooltip.Trigger>
        <Tooltip.Content>Block track and skip</Tooltip.Content>
    </Tooltip.Root>
</Tooltip.Provider>
