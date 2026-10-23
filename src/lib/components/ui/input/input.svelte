<script lang="ts">
    import type { HTMLInputAttributes } from 'svelte/elements'
    import type { WithElementRef } from 'bits-ui'
    import { cn } from '$lib/utils.js'

    let {
        ref = $bindable(null),
        value = $bindable(),
        class: className,
        ...restProps
    }: WithElementRef<HTMLInputAttributes> = $props()
</script>

<input
    bind:this={ref}
    class={cn(
        'flex h-8 w-full rounded-md border border-hairline bg-inset px-2.5 py-1 text-[13px] text-ink-fg transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-dim hover:border-hairline-strong focus-visible:border-signal/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/30 disabled:cursor-not-allowed disabled:opacity-40',
        className
    )}
    bind:value
    {...restProps}
/>
