<script lang="ts">
    // One jump (rewind or forward) for the content type the Seek tab is on: a
    // readout with −/+, a slider over the whole 1–60 s range, and the usual
    // chips. The card stretches to the frame and spreads the four out.
    import { seekStore } from '$lib/stores/seek'
    import Plus from '@lucide/svelte/icons/plus'
    import Minus from '@lucide/svelte/icons/minus'
    import RotateCcw from '@lucide/svelte/icons/rotate-ccw'
    import BadgeList from '$lib/components/BadgeList.svelte'
    import { CustomSlider } from '$lib/components/ui/custom-slider'

    let { type }: { type: 'rewind' | 'forward' } = $props()

    const MIN = 1
    const MAX = 60

    const value = $derived(
        $seekStore.is_long_form ? $seekStore.long_form[type] : $seekStore.default[type]
    )
    // The readout follows a slider drag; the store is written on release.
    let live = $state<number | null>(null)
    const shown = $derived(live ?? value)

    async function handleSeekUpdate(next: number) {
        const clamped = Math.min(Math.max(Math.round(next), MIN), MAX)
        const updateType = $seekStore.is_long_form ? 'long_form' : 'default'
        await seekStore.updateSeek({
            [updateType]: {
                ...$seekStore[updateType],
                [type]: clamped
            }
        })
    }

    function handleInput(event: Event) {
        const input = event.target as HTMLInputElement
        const parsed = parseInt(input.value, 10)
        if (Number.isNaN(parsed)) {
            input.value = String(value)
            return
        }
        handleSeekUpdate(parsed)
    }

    const stepButton =
        'chorus-focus inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-2 text-ink-fg transition-colors hover:bg-surface-2/80'
</script>

<div
    class="flex h-full flex-col justify-between gap-y-3 rounded-lg border border-hairline bg-panel px-3 py-3"
>
    <div class="flex items-center gap-x-1.5">
        <RotateCcw class="size-3 text-ink-muted {type === 'forward' ? '-scale-x-100' : ''}" />
        <span class="rack-label">{type === 'rewind' ? 'Rewind' : 'Forward'}</span>
    </div>

    <div class="flex items-center gap-x-2">
        <button
            type="button"
            aria-label={`Decrease ${type} seconds`}
            onclick={() => handleSeekUpdate(value - 1)}
            class={stepButton}
        >
            <Minus class="size-4" />
        </button>
        <div class="readout relative flex h-10 flex-1 items-center justify-center">
            <input
                aria-label={`${type} seconds`}
                inputmode="numeric"
                value={shown}
                onchange={handleInput}
                class="w-full bg-transparent text-center font-mono text-xl text-ink-fg focus-visible:outline-none"
            />
            <span
                class="pointer-events-none absolute bottom-1 right-2 font-mono text-[10px] text-ink-muted"
                >s</span
            >
        </div>
        <button
            type="button"
            aria-label={`Increase ${type} seconds`}
            onclick={() => handleSeekUpdate(value + 1)}
            class={stepButton}
        >
            <Plus class="size-4" />
        </button>
    </div>

    <CustomSlider
        type="single"
        min={MIN}
        max={MAX}
        step={1}
        value={shown}
        label={`${type} seconds`}
        onValueChange={(v) => (live = v as number)}
        onValueCommit={(v) => {
            live = null
            handleSeekUpdate(v as number)
        }}
    />

    <!-- In a row of its own: the chip list grows to fill a flex column otherwise. -->
    <div class="flex">
        <BadgeList list={[5, 10, 15, 30]} current={value} handleSelect={handleSeekUpdate} />
    </div>
</div>
