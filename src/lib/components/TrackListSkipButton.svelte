<script lang="ts">
    import { Ban } from 'lucide-svelte'
    import { nowPlaying } from '$lib/stores/now-playing'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import { buttonVariants } from '$lib/components/ui/button'

    let { trackInfo }: { trackInfo: TrackSongInfo } = $props()
    let isSkipped = $state(false)

    function handleSkip() {
        const { id: trackSongId } = trackInfo

        isSkipped = !isSkipped
        if (trackInfo.id === $nowPlaying.id) {
            skipTrack()
        }
    }

    function skipTrack() {
        const nextButton = document.querySelector(
            '[data-testid="control-button-skip-forward"]'
        ) as HTMLButtonElement
        nextButton?.click()
    }
</script>

<Tooltip.Provider>
    <Tooltip.Root>
        <Tooltip.Trigger
            role="skip"
            aria-label={isSkipped ? 'Unblock Track' : 'Block Track'}
            onclick={handleSkip}
            class={buttonVariants({
                variant: 'ghost',
                size: 'icon',
                class: 'size-7 border-none bg-transparent stroke-current hover:bg-transparent [&_svg]:size-[1.125rem]'
            })}
        >
            <Ban role="skip" size={24} color={isSkipped ? '#1ed760' : 'currentColor'} />
        </Tooltip.Trigger>
        <Tooltip.Content class="bg-background p-2 text-sm text-white">
            <p>{isSkipped ? 'Unblock Track' : 'Block Track'}</p>
        </Tooltip.Content>
    </Tooltip.Root>
</Tooltip.Provider>
