<script lang="ts">
    import type { Component } from 'svelte'
    import { cn } from '$lib/utils.js'

    // `hint` is a small mono annotation after the label, e.g. a count.
    type Option = { label: string; value: string; icon?: Component; title?: string; hint?: string }

    let {
        options,
        value,
        onValueChange,
        size = 'sm',
        ariaLabel = 'options',
        grow = false,
        class: className = ''
    }: {
        options: Option[]
        value: string
        onValueChange: (value: string) => void
        size?: 'xs' | 'sm' | 'md'
        ariaLabel?: string
        grow?: boolean
        class?: string
    } = $props()

    function select(next: string) {
        if (next === value) return
        onValueChange(next)
    }

    function onKeydown(e: KeyboardEvent) {
        const i = options.findIndex((o) => o.value === value)
        if (i < 0) return
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault()
            select(options[(i + 1) % options.length].value)
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault()
            select(options[(i - 1 + options.length) % options.length].value)
        }
    }
</script>

<div
    role="radiogroup"
    tabindex={-1}
    aria-label={ariaLabel}
    onkeydown={onKeydown}
    class={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-md border border-hairline bg-inset p-0.5',
        size === 'xs' ? 'h-6' : size === 'sm' ? 'h-7' : 'h-8',
        grow && 'flex w-full',
        className
    )}
>
    {#each options as option (option.value)}
        {@const active = option.value === value}
        <button
            type="button"
            role="radio"
            aria-checked={active}
            tabindex={active ? 0 : -1}
            title={option.title}
            onclick={() => select(option.value)}
            class={cn(
                'inline-flex h-full items-center justify-center gap-1 whitespace-nowrap rounded-[4px] font-medium leading-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60',
                size === 'xs'
                    ? 'px-1.5 text-[11px]'
                    : size === 'sm'
                      ? 'px-2 text-xs'
                      : 'px-3 text-[13px]',
                grow && 'flex-1',
                active ? 'bg-surface-2 text-ink-fg' : 'text-ink-muted hover:text-ink-fg'
            )}
        >
            {#if option.icon}
                {@const Icon = option.icon}
                <Icon class="size-3.5" />
            {/if}
            {option.label}
            {#if option.hint}
                <span
                    class={cn(
                        'font-mono text-[10px] font-normal tabular-nums',
                        active ? 'text-signal-bright' : 'text-ink-muted'
                    )}>{option.hint}</span
                >
            {/if}
        </button>
    {/each}
</div>
