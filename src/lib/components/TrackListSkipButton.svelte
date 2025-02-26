<script lang="ts">
    import { Ban } from 'lucide-svelte'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import { buttonVariants } from '$lib/components/ui/button'

    import { dataStore } from '$lib/stores/data'
    import { trackObserver } from '$lib/observers/track'
    import { nowPlaying } from '$lib/stores/now-playing'
    import type { SimpleTrack } from '$lib/stores/data/cache'

    let { track }: { track: SimpleTrack } = $props()
    let isSkipped = $state(track?.blocked ?? false)

    async function handleSkip() {
        isSkipped = !isSkipped
        if (track) {
            await dataStore.updateTrack({ track_id: track.track_id, value: { blocked: isSkipped } })
            if (track?.song_id === $nowPlaying.id) trackObserver?.skipTrack()
        }
    }

    onMount(() => {
        if ($nowPlaying.id === track?.song_id && track?.blocked) {
            trackObserver?.skipTrack()
        }
    })
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
