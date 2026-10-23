<script lang="ts">
    import { seekStore } from '$lib/stores/seek'
    import Plus from '@lucide/svelte/icons/plus'
    import Minus from '@lucide/svelte/icons/minus'
    import RotateCcw from '@lucide/svelte/icons/rotate-ccw'
    import BadgeList from '$lib/components/BadgeList.svelte'

    let { type }: { type: 'rewind' | 'forward' } = $props()

    const MIN = 1
    const MAX = 60

    const value = $derived(
        $seekStore.is_long_form ? $seekStore.long_form[type] : $seekStore.default[type]
    )

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
</script>

<div class="flex flex-col gap-y-2 rounded-lg border border-hairline bg-panel px-3 py-2.5">
    <div class="flex items-center gap-x-1.5">
        <RotateCcw class="size-3 text-ink-muted {type === 'forward' ? '-scale-x-100' : ''}" />
        <span class="rack-label">{type === 'rewind' ? 'Rewind' : 'Forward'}</span>
    </div>

    <div class="flex items-center gap-x-1.5">
        <button
            type="button"
            aria-label={`Decrease ${type} seconds`}
            onclick={() => handleSeekUpdate(value - 1)}
            class="chorus-focus inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-ink-fg transition-colors hover:bg-surface-2/80"
        >
            <Minus class="size-4" />
        </button>
        <div class="readout relative h-9 flex-1 justify-center">
            <input
                aria-label={`${type} seconds`}
                inputmode="numeric"
                {value}
                onchange={handleInput}
                class="w-full bg-transparent text-center font-mono text-base text-ink-fg focus-visible:outline-none"
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
            class="chorus-focus inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-ink-fg transition-colors hover:bg-surface-2/80"
        >
            <Plus class="size-4" />
        </button>
    </div>

    <BadgeList list={[5, 10, 15, 30]} current={value} handleSelect={handleSeekUpdate} />
</div>
