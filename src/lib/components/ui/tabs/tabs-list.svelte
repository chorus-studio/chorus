<script lang="ts">
    import { Tabs as TabsPrimitive } from 'bits-ui'
    import { cn } from '$lib/utils.js'

    let {
        ref = $bindable(null),
        class: className,
        ...restProps
    }: TabsPrimitive.ListProps = $props()
</script>

<TabsPrimitive.List
    bind:ref
    class={cn(
        'inline-flex h-8 items-center gap-0.5 rounded-lg border border-hairline bg-inset p-0.5 text-ink-muted',
        className
    )}
    {...restProps}
/>
