<script lang="ts">
    import { Tooltip as TooltipPrimitive } from 'bits-ui'
    import { cn } from '$lib/utils.js'

    let {
        ref = $bindable(null),
        class: className,
        sideOffset = 6,
        ...restProps
    }: TooltipPrimitive.ContentProps = $props()
</script>

<TooltipPrimitive.Content
    bind:ref
    {sideOffset}
    class={cn(
        'z-[99999] overflow-hidden rounded-md border border-hairline-strong bg-surface-2 px-2 py-1 text-xs font-medium leading-tight text-ink-fg shadow-float animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1',
        className
    )}
    {...restProps}
/>
