<script lang="ts">
    import { onMount, untrack } from 'svelte'
    import { snipStore } from '$lib/stores/snip'
    import { loopStore } from '$lib/stores/loop'
    import { nowPlaying } from '$lib/stores/now-playing'

    import TrackInfo from '$lib/components/TrackInfo.svelte'
    import SnipInputs from '$lib/components/SnipInputs.svelte'
    import SnipTimeline from '$lib/components/SnipTimeline.svelte'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'

    let { pip = false }: { pip?: boolean } = $props()
    void pip

    function setSnip() {
        snipStore.set({
            is_shared: false,
            last_updated: 'start',
            start_time: $nowPlaying?.snip?.start_time ?? 0,
            end_time: $nowPlaying?.snip?.end_time ?? $nowPlaying?.duration ?? 0
        })
    }

    onMount(setSnip)

    // Re-seed when the track changes (or its duration first becomes known) so
    // the editor never shows a stale or zero-length region.
    $effect(() => {
        void $nowPlaying.id
        void $nowPlaying.duration
        untrack(setSnip)
    })

    // Loop control lives with the snip: off · ∞ · ×N (N counts down as it loops).
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

<div class="flex h-full flex-col gap-y-2">
    <div class="flex items-center justify-between gap-x-3">
        <TrackInfo compact />
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

    <SnipTimeline />
    <SnipInputs />
</div>
