<script lang="ts">
    import { Dialog as DialogPrimitive, type WithoutChildrenOrChild } from 'bits-ui'
    import X from '@lucide/svelte/icons/x'
    import type { Snippet } from 'svelte'
    import * as Dialog from './index.js'
    import { cn } from '$lib/utils.js'

    let {
        ref = $bindable(null),
        class: className,
        portalProps,
        children,
        ...restProps
    }: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
        portalProps?: DialogPrimitive.PortalProps
        children: Snippet
    } = $props()
</script>

<Dialog.Portal {...portalProps}>
    <Dialog.Overlay />
    <DialogPrimitive.Content
        bind:ref
        class={cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border border-hairline-strong bg-ink p-6 text-ink-fg shadow-float duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            className
        )}
        {...restProps}
    >
        {@render children?.()}
        <DialogPrimitive.Close
            class="absolute right-4 top-4 inline-flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 disabled:pointer-events-none"
        >
            <X class="size-4" />
            <span class="sr-only">Close</span>
        </DialogPrimitive.Close>
    </DialogPrimitive.Content>
</Dialog.Portal>
