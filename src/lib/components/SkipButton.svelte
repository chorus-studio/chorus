<script lang="ts">
    import { dataStore } from '$lib/stores/data'
    import { nowPlaying } from '$lib/stores/now-playing'

    import { Ban } from 'lucide-svelte'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import { buttonVariants } from '$lib/components/ui/button'
    import { trackObserver } from '$lib/observers/track'

    function highlightInTrackList() {
        const rowsQuery = document.querySelectorAll('[data-testid="tracklist-row"]')
        if (!rowsQuery?.length) return

        const trackRows = Array.from(rowsQuery)

        const context = trackRows.find(
            (row) =>
                row.querySelector('a[data-testid="internal-track-link"] div')?.textContent ===
                $nowPlaying.title
        )

        if (!context) return

        const skipIcon = context.querySelector('button[role="skip"]')
        if (!skipIcon) return

        const svg = skipIcon.querySelector('svg')
        if (!svg) return

        skipIcon.setAttribute('aria-label', 'Block Track')
        svg.style.stroke = '#1ed760'
    }

    async function handleSkip() {
        if ($nowPlaying.track_id) {
            nowPlaying.set({ ...$nowPlaying, blocked: true })
            await dataStore.updateTrack({
                track_id: $nowPlaying.track_id,
                value: { blocked: true }
            })
            highlightInTrackList()
        }

        trackObserver?.skipTrack()
    }
</script>

<Tooltip.Provider>
    <Tooltip.Root>
        <Tooltip.Trigger
            role="skip"
            aria-label="Block Track"
            onclick={handleSkip}
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
