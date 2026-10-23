<script lang="ts">
    import type { Snippet } from 'svelte'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import { buttonVariants } from '$lib/components/ui/button'
    import { cn } from '$lib/utils.js'

    type Side = 'top' | 'right' | 'bottom' | 'left'
    let {
        text,
        id = '',
        children,
        onTrigger,
        side = 'top',
        class: className = '',
        disabled = false
    }: {
        side?: Side
        id?: string
        text: string
        class?: string
        disabled?: boolean
        children: Snippet
        onTrigger?: () => void
    } = $props()
</script>

<Tooltip.Provider delayDuration={300}>
    <Tooltip.Root>
        <Tooltip.Trigger
            {id}
            {disabled}
            onclick={onTrigger}
            aria-label={text}
            class={cn(
                buttonVariants({ variant: 'bar', size: 'icon-sm' }),
                'relative [&_svg]:size-[18px]',
                className
            )}
        >
            {@render children()}
        </Tooltip.Trigger>
        <Tooltip.Content {side}>
            {text}
        </Tooltip.Content>
    </Tooltip.Root>
</Tooltip.Provider>
