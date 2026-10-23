<script lang="ts">
    import Star from '@lucide/svelte/icons/star'
    import { type Frequent } from '$lib/stores/playback'
    import { cn } from '$lib/utils.js'

    // Quick-value chips. With Frequent items a pin toggle appears on hover (always
    // when pinned) so favourites stick around as the list evolves.
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
    const items = $derived(
        (list as Array<number | Frequent>).map((item) =>
            typeof item === 'number' ? { value: item, pinned: false } : item
        )
    )
</script>

<div class="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
    {#each items as item (item.value)}
        {@const active = current !== undefined && Math.abs(item.value - current) < 1e-9}
        <div class="group relative shrink-0">
            <button
                type="button"
                data-active={active}
                onclick={() => handleSelect(item.value)}
                class={cn(
                    'inline-flex h-5 items-center gap-1 rounded-md border border-hairline bg-surface px-1.5 font-mono text-[11px] text-ink-fg-2 transition-colors hover:border-hairline-strong hover:text-ink-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60',
                    active && 'border-signal/50 bg-signal/15 text-signal-bright'
                )}
            >
                {#if item.pinned}
                    <Star class="size-[9px] fill-amber stroke-amber" />
                {/if}
                {format(item.value)}
            </button>
            {#if isFrequentList && handlePin}
                <button
                    type="button"
                    aria-label={item.pinned ? 'Unpin value' : 'Pin value'}
                    title={item.pinned ? 'Unpin' : 'Pin'}
                    onclick={() => handlePin?.(item)}
                    class={cn(
                        'absolute -right-1 -top-1.5 inline-flex size-3.5 items-center justify-center rounded-full border border-hairline-strong bg-surface-2 text-ink-muted opacity-0 transition-opacity hover:text-amber focus-visible:opacity-100 group-hover:opacity-100',
                        item.pinned && 'opacity-100'
                    )}
                >
                    <Star class={cn('size-2', item.pinned && 'fill-amber stroke-amber')} />
                </button>
            {/if}
        </div>
    {/each}
</div>
