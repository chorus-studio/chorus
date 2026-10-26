<script lang="ts">
    // The bottom row: hear the snip as it will play, hear the selected
    // section's jump, and the track's loop setting — off · ∞ · ×N (N counts
    // down as it loops).
    import { snipStore } from '$lib/stores/snip'
    import { loopStore } from '$lib/stores/loop'
    import { mediaStore } from '$lib/stores/media'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { round1 } from '$lib/utils/snip-time'
    import {
        EDIT_GRACE_SECONDS,
        firstSegmentStart,
        jumpEdge,
        toSegments
    } from '$lib/utils/snip-ranges'

    import Play from '@lucide/svelte/icons/play'
    import Redo2 from '@lucide/svelte/icons/redo-2'
    import { Button } from '$lib/components/ui/button'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'

    const duration = $derived(Math.max($nowPlaying.duration ?? 0, 0))
    const range = $derived($snipStore?.ranges[$snipStore.selected] ?? { start: 0, end: duration })

    function ensurePlaying() {
        if ($mediaStore.playing) return
        const playPause = document.querySelector(
            '[data-testid="control-button-playpause"]'
        ) as HTMLButtonElement | null
        playPause?.click()
    }

    // Hear the snip as it will play: from the first section in play mode, from
    // the top of the track in skip mode.
    function playSnip() {
        if (!$snipStore) return
        snipStore.clearGrace()
        nowPlaying.setCurrentTime(firstSegmentStart(toSegments($snipStore, duration)))
        ensurePlaying()
    }

    // Hear the jump at this section's edge: a few seconds before it, then the
    // join. Clearing the grace makes the engine enforce the jump right away.
    function hearJump() {
        if (!$snipStore) return
        snipStore.clearGrace()
        const edge = jumpEdge($snipStore.mode, range)
        const floor = $snipStore.mode === 'play' ? range.start : 0
        nowPlaying.setCurrentTime(Math.max(floor, round1(edge - EDIT_GRACE_SECONDS)))
        ensurePlaying()
    }

    const loopValue = $derived(
        !$loopStore.looping ? 'off' : $loopStore.type === 'infinite' ? 'infinite' : 'amount'
    )

    async function setLoop(value: string) {
        if (value === 'off') {
            if ($loopStore.looping) await loopStore.toggleLoop()
            return
        }
        await loopStore.toggleType(value as 'infinite' | 'amount')
    }

    async function setCount(event: Event) {
        const input = event.target as HTMLInputElement
        const count = Math.max(1, Math.min(99, Math.round(Number(input.value) || 1)))
        input.value = String(count)
        await loopStore.setIteration(count)
    }
</script>

<div class="flex items-center justify-between gap-x-3">
    <div class="flex items-center gap-x-1">
        {#if $snipStore}
            <Button
                variant="secondary"
                size="sm"
                onclick={playSnip}
                class="h-[26px]"
                title="Play the snip from its start"
            >
                <Play class="size-3 fill-current" />
                Play snip
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onclick={hearJump}
                class="h-[26px]"
                title={`Play ${EDIT_GRACE_SECONDS} s before this section's jump and across it`}
            >
                <Redo2 class="size-3" />
                Hear jump
            </Button>
        {/if}
    </div>

    <div class="flex shrink-0 items-center gap-x-1.5">
        <span class="rack-label">Loop</span>
        <SegmentedControl
            size="xs"
            ariaLabel="Loop"
            value={loopValue}
            onValueChange={setLoop}
            options={[
                { label: 'off', value: 'off', title: 'Play through' },
                { label: '∞', value: 'infinite', title: 'Loop forever' },
                {
                    label: `×${$loopStore.type === 'amount' ? $loopStore.iteration : $loopStore.amount}`,
                    value: 'amount',
                    title: 'Loop a set number of times'
                }
            ]}
        />
        {#if loopValue === 'amount'}
            <input
                type="number"
                min="1"
                max="99"
                aria-label="Loop count"
                value={$loopStore.iteration}
                onchange={setCount}
                class="readout h-6 w-11 px-1 text-center text-[11px] focus-visible:border-signal/60 focus-visible:outline-none"
            />
        {/if}
    </div>
</div>
