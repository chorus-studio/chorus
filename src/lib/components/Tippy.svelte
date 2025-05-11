<script lang="ts">
    import type { Snippet } from 'svelte'
    import * as Tooltip from '$lib/components/ui/tooltip'
    import { buttonVariants } from '$lib/components/ui/button'

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

<Tooltip.Provider>
    <Tooltip.Root>
        <Tooltip.Trigger
            {id}
            {disabled}
            onclick={onTrigger}
            class={buttonVariants({
                variant: 'ghost',
                size: 'icon',
                className: `relative size-7 bg-transparent hover:bg-transparent [&_svg]:size-5 ${className}`
            })}
        >
            {@render children()}
        </Tooltip.Trigger>
        <Tooltip.Content
            {side}
            style="position: absolute !important"
            class="relative z-[99999] bg-muted p-2 text-sm text-white"
        >
            {text}
        </Tooltip.Content>
    </Tooltip.Root>
</Tooltip.Provider>
