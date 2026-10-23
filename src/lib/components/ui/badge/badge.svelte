<script lang="ts" module>
    import { type VariantProps, tv } from 'tailwind-variants'
    export const badgeVariants = tv({
        base: 'inline-flex select-none items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium leading-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal/60',
        variants: {
            variant: {
                default: 'border-transparent bg-signal text-ink',
                secondary: 'border-transparent bg-surface-2 text-ink-fg',
                destructive: 'border-transparent bg-alarm/15 text-alarm',
                outline: 'border-hairline-strong text-ink-fg-2',
                /* selectable chip: quiet by default, signal when active */
                chip: 'cursor-pointer border-hairline bg-surface text-ink-fg-2 hover:border-hairline-strong hover:text-ink-fg data-[active=true]:border-signal/50 data-[active=true]:bg-signal/15 data-[active=true]:text-signal-bright'
            }
        },
        defaultVariants: {
            variant: 'default'
        }
    })

    export type BadgeVariant = VariantProps<typeof badgeVariants>['variant']
</script>

<script lang="ts">
    import type { WithElementRef } from 'bits-ui'
    import type { HTMLAnchorAttributes } from 'svelte/elements'
    import { cn } from '$lib/utils.js'

    let {
        ref = $bindable(null),
        href,
        class: className,
        variant = 'default',
        children,
        ...restProps
    }: WithElementRef<HTMLAnchorAttributes> & {
        variant?: BadgeVariant
    } = $props()
</script>

<svelte:element
    this={href ? 'a' : 'span'}
    bind:this={ref}
    {href}
    class={cn(badgeVariants({ variant }), className)}
    {...restProps}
>
    {@render children?.()}
</svelte:element>
