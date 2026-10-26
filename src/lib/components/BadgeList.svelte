<script lang="ts">
    import Star from '@lucide/svelte/icons/star'
    import { type Frequent } from '$lib/stores/playback'
    import { cn } from '$lib/utils.js'

    // Quick-value chips. Frequent items carry a pin toggle on the chip's leading
    // edge so favourites stick around as the list evolves. The row never scrolls:
    // the store caps frequents (FREQUENTS_MAX) so they fit beside the readout.
    let {
        list,
        current,
        format = (v: number) => String(v),
        handleSelect,
        handlePin
    }: {
        list: number[] | Frequent[]
        current?: number
        format?: (value: number) => string
        handleSelect: (value: number) => void
        handlePin?: (value: Frequent) => void
    } = $props()

    const isFrequentList = $derived(list.length > 0 && typeof list[0] !== 'number')
    const pinnable = $derived(isFrequentList && !!handlePin)
    const items = $derived(
        (list as Array<number | Frequent>).map((item) =>
            typeof item === 'number' ? { value: item, pinned: false } : item
        )
    )

    const focusRing =
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-signal'
</script>

<div class="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
    {#each items as item (item.value)}
        {@const active = current !== undefined && Math.abs(item.value - current) < 1e-9}
        <div
            data-active={active}
            class={cn(
                'inline-flex h-5 shrink-0 items-stretch overflow-hidden rounded-md border border-hairline bg-surface text-ink-fg-2 transition-colors hover:border-hairline-strong',
                active && 'border-signal/50 bg-signal/15 text-signal-bright'
            )}
        >
            {#if pinnable}
                <button
                    type="button"
                    aria-pressed={item.pinned}
                    aria-label={`${item.pinned ? 'Unpin' : 'Pin'} ${format(item.value)}`}
                    title={item.pinned ? 'Unpin' : 'Pin'}
                    onclick={() => handlePin?.(item)}
                    class={cn(
                        'inline-flex w-4 items-center justify-center border-r border-hairline text-ink-dim transition-colors hover:text-amber',
                        focusRing,
                        item.pinned && 'text-amber'
                    )}
                >
                    <Star class={cn('size-[9px]', item.pinned && 'fill-current')} />
                </button>
            {/if}
            <button
                type="button"
                onclick={() => handleSelect(item.value)}
                class={cn(
                    'inline-flex items-center px-1.5 font-mono text-[11px] transition-colors hover:text-ink-fg',
                    focusRing
                )}
            >
                {format(item.value)}
            </button>
        </div>
    {/each}
</div>
