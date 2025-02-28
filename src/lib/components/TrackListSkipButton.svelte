<script lang="ts">
    import { Ban } from 'lucide-svelte'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import { buttonVariants } from '$lib/components/ui/button'

    import { queue } from '$lib/observers/queue'
    import { dataStore } from '$lib/stores/data'
    import { trackObserver } from '$lib/observers/track'
    import { nowPlaying } from '$lib/stores/now-playing'
    import type { SimpleTrack } from '$lib/stores/data/cache'

    let { track }: { track: SimpleTrack } = $props()
    let isBlocked = $state(track?.blocked ?? false)

    async function handleBlock() {
        isBlocked = !isBlocked
        if (track) {
            await dataStore.updateTrack({ track_id: track.track_id, value: { blocked: isBlocked } })
            if (isBlocked) await queue.refreshQueue()
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
            role="block"
            aria-label={isBlocked ? 'Unblock Track' : 'Block Track'}
            onclick={handleBlock}
            class={buttonVariants({
                variant: 'ghost',
                size: 'icon',
                class: 'size-7 border-none bg-transparent stroke-current hover:bg-transparent [&_svg]:size-[1.125rem]'
            })}
        >
            <Ban role="block" size={24} color={isBlocked ? '#1ed760' : 'currentColor'} />
        </Tooltip.Trigger>
        <Tooltip.Content class="bg-background p-2 text-sm text-white">
            <p>{isBlocked ? 'Unblock Track' : 'Block Track'}</p>
        </Tooltip.Content>
    </Tooltip.Root>
</Tooltip.Provider>
