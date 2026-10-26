<script lang="ts">
    import { LinkPreview as HoverCardPrimitive } from 'bits-ui'
    import { cn } from '$lib/utils.js'

    let {
        ref = $bindable(null),
        class: className,
        align = 'center',
        sideOffset = 6,
        portalProps,
        ...restProps
    }: HoverCardPrimitive.ContentProps & {
        portalProps?: HoverCardPrimitive.PortalProps
    } = $props()
</script>

<HoverCardPrimitive.Portal {...portalProps}>
    <HoverCardPrimitive.Content
        bind:ref
        {sideOffset}
        {align}
        class={cn(
            'chorus-float z-[99999] w-56 rounded-lg border border-hairline-strong bg-surface p-3 text-[13px] text-ink-fg shadow-float outline-none',
            className
        )}
        {...restProps}
    />
</HoverCardPrimitive.Portal>
