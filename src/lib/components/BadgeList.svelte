<script lang="ts" generics="T extends number | string">
    import Star from '@lucide/svelte/icons/star'
    import { cn } from '$lib/utils.js'

    type Item = { value: T; pinned: boolean }

    // Quick-value chips. Frequent items carry a pin toggle on the chip's leading
    // edge so favourites stick around as the list evolves. By default the row
    // never scrolls (the stores cap their lists so chips fit beside a readout);
    // `wrap` lets a longer list run onto further lines instead.
    let {
        list,
        current,
        format = (v: T) => String(v),
        handleSelect,
        handlePin,
        wrap = false
    }: {
        list: T[] | Item[]
        current?: T
        format?: (value: T) => string
        handleSelect: (value: T) => void
        handlePin?: (value: Item) => void
        wrap?: boolean
    } = $props()

    const isFrequentList = $derived(list.length > 0 && typeof list[0] === 'object')
    const pinnable = $derived(isFrequentList && !!handlePin)
    const items = $derived(
        (list as Array<T | Item>).map((item) =>
            typeof item === 'object' ? item : { value: item, pinned: false }
        )
    )
    const same = (a: T, b: T) =>
        typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-9 : a === b

    const focusRing =
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-signal'
</script>

<div class={cn('flex min-w-0 flex-1 items-center gap-1', wrap ? 'flex-wrap' : 'overflow-hidden')}>
    {#each items as item (item.value)}
        {@const active = current !== undefined && same(item.value, current)}
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
                    'inline-flex min-w-0 items-center px-1.5 font-mono text-[11px] transition-colors hover:text-ink-fg',
                    focusRing
                )}
            >
                <span class="max-w-24 truncate">{format(item.value)}</span>
            </button>
        </div>
    {/each}
</div>
