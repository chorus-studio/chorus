<script lang="ts">
    import { Tabs as TabsPrimitive } from 'bits-ui'
    import { cn } from '$lib/utils.js'

    let {
        ref = $bindable(null),
        class: className,
        value,
        ...restProps
    }: TabsPrimitive.TriggerProps = $props()
</script>

<TabsPrimitive.Trigger
    bind:ref
    class={cn(
        'inline-flex h-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-medium leading-none text-ink-muted transition-colors duration-150 hover:text-ink-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal disabled:pointer-events-none disabled:opacity-40 data-[state=active]:bg-surface-2 data-[state=active]:text-ink-fg',
        className
    )}
    {value}
    {...restProps}
/>
