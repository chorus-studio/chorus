<script lang="ts" module>
    import type { WithElementRef } from 'bits-ui'
    import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements'
    import { type VariantProps, tv } from 'tailwind-variants'

    export const buttonVariants = tv({
        base: 'inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[13px] font-medium leading-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-1 focus-visible:ring-offset-ink disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
        variants: {
            variant: {
                default: 'bg-signal text-ink hover:bg-signal-bright active:bg-signal-dark',
                destructive: 'bg-alarm/15 text-alarm hover:bg-alarm/25',
                outline:
                    'border border-hairline-strong bg-transparent text-ink-fg hover:border-hairline-strong hover:bg-surface-2',
                secondary: 'bg-surface-2 text-ink-fg hover:bg-surface-2/80',
                ghost: 'text-ink-fg-2 hover:bg-surface-2 hover:text-ink-fg',
                link: 'text-signal underline-offset-4 hover:underline',
                /* in-page player bar: inherits Spotify's icon color, brightens on hover */
                bar: 'text-current opacity-80 hover:opacity-100 hover:bg-transparent'
            },
            size: {
                default: 'h-8 px-3',
                xs: 'h-6 rounded-sm px-2 text-xs',
                sm: 'h-7 px-2.5 text-xs',
                lg: 'h-9 px-4',
                icon: 'size-8',
                'icon-sm': 'size-7',
                'icon-xs': 'size-6 rounded-sm'
            }
        },
        defaultVariants: {
            variant: 'default',
            size: 'default'
        }
    })

    export type ButtonVariant = VariantProps<typeof buttonVariants>['variant']
    export type ButtonSize = VariantProps<typeof buttonVariants>['size']

    export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
        WithElementRef<HTMLAnchorAttributes> & {
            variant?: ButtonVariant
            size?: ButtonSize
        }
</script>

<script lang="ts">
    import { cn } from '$lib/utils.js'

    let {
        class: className,
        variant = 'default',
        size = 'default',
        ref = $bindable(null),
        href = undefined,
        type = 'button',
        children,
        ...restProps
    }: ButtonProps = $props()
</script>

{#if href}
    <a
        bind:this={ref}
        class={cn(buttonVariants({ variant, size }), className)}
        {href}
        {...restProps}
    >
        {@render children?.()}
    </a>
{:else}
    <button
        bind:this={ref}
        class={cn(buttonVariants({ variant, size }), className)}
        {type}
        {...restProps}
    >
        {@render children?.()}
    </button>
{/if}
