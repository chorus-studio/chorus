<script lang="ts">
    import { loopStore } from '$lib/stores/loop'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'

    // Popover body for the player-bar loop button: off · ∞ · ×N with a count.
    const value = $derived(
        !$loopStore.looping ? 'off' : $loopStore.type === 'infinite' ? 'infinite' : 'amount'
    )

    async function handleChange(next: string) {
        if (next === 'off') {
            if ($loopStore.looping) await loopStore.toggleLoop()
            return
        }
        await loopStore.toggleType(next as 'infinite' | 'amount')
    }

    async function setCount(event: Event) {
        const input = event.target as HTMLInputElement
        const count = Math.max(1, Math.min(99, Math.round(Number(input.value) || 1)))
        input.value = String(count)
        await loopStore.setIteration(count)
    }
</script>

<div class="flex flex-col gap-y-2">
    <div class="flex items-center justify-between">
        <span class="rack-label">Loop</span>
        {#if $loopStore.looping && $loopStore.type === 'amount'}
            <span class="font-mono text-[10px] text-ink-muted">
                {$loopStore.iteration} left
            </span>
        {/if}
    </div>
    <div class="flex items-center gap-x-1.5">
        <SegmentedControl
            size="sm"
            grow
            ariaLabel="Loop mode"
            {value}
            onValueChange={handleChange}
            options={[
                { label: 'off', value: 'off', title: 'Play through' },
                { label: '∞', value: 'infinite', title: 'Loop forever' },
                { label: '×N', value: 'amount', title: 'Loop a set number of times' }
            ]}
        />
        {#if value === 'amount'}
            <input
                type="number"
                min="1"
                max="99"
                aria-label="Loop count"
                value={$loopStore.iteration}
                onchange={setCount}
                class="readout h-7 w-12 px-1 text-center text-xs focus-visible:border-signal/60 focus-visible:outline-none"
            />
        {/if}
    </div>
    <p class="text-[11px] leading-snug text-ink-muted">
        Loops the snip when one is saved, otherwise the whole track.
    </p>
</div>
