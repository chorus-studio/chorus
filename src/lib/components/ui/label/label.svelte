<script lang="ts">
    import { Label as LabelPrimitive } from 'bits-ui'
    import { cn } from '$lib/utils.js'

    let {
        ref = $bindable(null),
        class: className,
        ...restProps
    }: LabelPrimitive.RootProps = $props()
</script>

<LabelPrimitive.Root
    bind:ref
    class={cn(
        'text-[13px] font-medium leading-none text-ink-fg-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
        className
    )}
    {...restProps}
/>
