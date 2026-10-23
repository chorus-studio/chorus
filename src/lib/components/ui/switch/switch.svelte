<script lang="ts">
    import { Switch as SwitchPrimitive, type WithoutChildrenOrChild } from 'bits-ui'
    import { cn } from '$lib/utils.js'

    let {
        ref = $bindable(null),
        checked = $bindable(false),
        class: className,
        ...restProps
    }: WithoutChildrenOrChild<SwitchPrimitive.RootProps> = $props()
</script>

<SwitchPrimitive.Root
    bind:ref
    bind:checked
    class={cn(
        'peer inline-flex h-[18px] w-[30px] shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:ring-offset-1 focus-visible:ring-offset-ink disabled:cursor-not-allowed disabled:opacity-40 data-[state=checked]:bg-signal data-[state=unchecked]:bg-surface-2 data-[state=unchecked]:hover:bg-surface-2/80',
        className
    )}
    {...restProps}
>
    <SwitchPrimitive.Thumb
        class={cn(
            'pointer-events-none block size-3.5 rounded-full shadow-sm transition-transform duration-150 data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0.5 data-[state=checked]:bg-ink data-[state=unchecked]:bg-ink-fg-2'
        )}
    />
</SwitchPrimitive.Root>
