<script lang="ts">
    import { dataStore } from '$lib/stores/data'
    import { trackObserver } from '$lib/observers/track'
    import { nowPlaying } from '$lib/stores/now-playing'

    import { Ban } from 'lucide-svelte'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import { buttonVariants } from '$lib/components/ui/button'

    async function handleBlock(): Promise<void> {
        if ($nowPlaying.track_id) {
            const { cover, track_id } = $nowPlaying
            console.log({ cover, track_id })

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

<Tooltip.Provider>
    <Tooltip.Root>
        <Tooltip.Trigger
            role="block"
            id="chorus-block"
            aria-label="Block Track"
            onclick={handleBlock}
            class={buttonVariants({
                variant: 'ghost',
                size: 'icon',
                class: 'size-7 border-none bg-transparent stroke-current hover:bg-transparent [&_svg]:size-[1.125rem]'
            })}
        >
            <Ban size={24} />
        </Tooltip.Trigger>
        <Tooltip.Content class="bg-background p-2 text-sm text-white">
            <p>Block Track</p>
        </Tooltip.Content>
    </Tooltip.Root>
</Tooltip.Provider>
