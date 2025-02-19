<script lang="ts">
    import { Progress as ProgressPrimitive, type WithoutChildrenOrChild } from 'bits-ui'
    import { cn } from '$lib/utils.js'

    let {
        ref = $bindable(null),
        class: className,
        innerClass: innerClassName,
        max = 100,
        value,
        ...restProps
    }: WithoutChildrenOrChild<ProgressPrimitive.RootProps> = $props()
</script>

<ProgressPrimitive.Root
    bind:ref
    {value}
    class={cn('relative h-2 w-full overflow-hidden rounded-full bg-primary/20', className)}
    {...restProps}
>
    <div
        class={cn('h-full w-full flex-1 bg-primary transition-all', innerClassName)}
        style={`transform: translateX(-${100 - (100 * (value ?? 0)) / (max ?? 1)}%)`}
    ></div>
</ProgressPrimitive.Root>
