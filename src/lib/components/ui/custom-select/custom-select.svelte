<script lang="ts" generics="T extends string = string">
    import { onMount } from 'svelte'
    import { pipStore } from '$lib/stores/pip'
    import { clickOutside } from '$lib/utils/click-outside'
    import { cn } from '$lib/utils.js'

    import Check from '@lucide/svelte/icons/check'
    import ChevronDown from '@lucide/svelte/icons/chevron-down'

    type Option = { label: string; value: T }

    let {
        pip = false,
        key = '',
        size = 'default',
        selected,
        onValueChange,
        options = [],
        placeholder = 'none',
        tone = 'studio',
        class: className = ''
    }: {
        pip?: boolean
        key?: string
        size?: 'sm' | 'md' | 'default'
        selected?: T
        onValueChange?: (value: T) => void
        options?: Option[]
        placeholder?: string
        /** 'inherit' styles the trigger with the surrounding --text/--bg palette (popup). */
        tone?: 'studio' | 'inherit'
        class?: string
    } = $props()

    let isOpen = $state(false)
    let activeIndex = $state(-1)
    let listRef = $state<HTMLUListElement | null>(null)
    const fallbackId = Math.random().toString(36).slice(2, 8)
    const listId = $derived(`chorus-select-${key || fallbackId}`)

    const selectedLabel = $derived(
        options.find((o) => o.value === selected)?.label ?? (selected || placeholder)
    )

    async function open() {
        isOpen = true
        activeIndex = Math.max(
            0,
            options.findIndex((o) => o.value === selected)
        )
        if (pip) await pipStore.updatePip({ key })
        queueMicrotask(() => scrollActiveIntoView())
    }

    async function close() {
        if (!isOpen) return
        isOpen = false
        if (pip) await pipStore.updatePip({ key: null })
    }

    async function toggle() {
        if (isOpen) await close()
        else await open()
    }

    async function choose(value: T) {
        onValueChange?.(value)
        await close()
    }

    function scrollActiveIntoView() {
        const el = listRef?.children[activeIndex] as HTMLElement | undefined
        el?.scrollIntoView({ block: 'nearest' })
    }

    function onKeydown(e: KeyboardEvent) {
        if (!isOpen) {
            if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
                e.preventDefault()
                open()
            }
            return
        }
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                activeIndex = (activeIndex + 1) % options.length
                scrollActiveIntoView()
                break
            case 'ArrowUp':
                e.preventDefault()
                activeIndex = (activeIndex - 1 + options.length) % options.length
                scrollActiveIntoView()
                break
            case 'Home':
                e.preventDefault()
                activeIndex = 0
                scrollActiveIntoView()
                break
            case 'End':
                e.preventDefault()
                activeIndex = options.length - 1
                scrollActiveIntoView()
                break
            case 'Enter':
            case ' ':
                e.preventDefault()
                if (options[activeIndex]) choose(options[activeIndex].value)
                break
            case 'Escape':
            case 'Tab':
                close()
                break
        }
    }

    const compact = $derived(size !== 'default')

    onMount(() => {
        // In PiP only one dropdown may be open at a time; the pip store holds its key.
        const unsubscribe = pipStore.subscribe((state) => {
            if (pip && (!state.key || state.key !== key)) isOpen = false
        })
        return () => unsubscribe()
    })
</script>

<div use:clickOutside={close} class={cn('relative', compact ? 'min-w-28' : 'min-w-40', className)}>
    <button
        onkeydown={onKeydown}
        id={key || undefined}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        onclick={toggle}
        class={cn(
            'flex w-full items-center justify-between gap-2 rounded-md border text-left transition-colors focus-visible:outline-none focus-visible:ring-2',
            tone === 'studio'
                ? 'border-hairline bg-inset text-ink-fg hover:border-hairline-strong focus-visible:border-signal/60 focus-visible:ring-signal/30'
                : 'border-transparent bg-[color:color-mix(in_srgb,var(--text)_12%,transparent)] text-[color:var(--text)] hover:bg-[color:color-mix(in_srgb,var(--text)_20%,transparent)] focus-visible:ring-[color:var(--text)]',
            size === 'sm'
                ? 'h-6 px-2 text-xs'
                : size === 'md'
                  ? 'h-7 px-2.5 text-xs'
                  : 'h-8 px-3 text-[13px]',
            isOpen && tone === 'studio' && 'border-signal/60'
        )}
    >
        <span class="truncate">{selectedLabel}</span>
        <ChevronDown
            class={cn(
                'size-3.5 shrink-0 transition-transform duration-150',
                tone === 'studio' ? 'text-ink-muted' : 'opacity-70',
                isOpen && 'rotate-180'
            )}
        />
    </button>

    {#if isOpen}
        <ul
            bind:this={listRef}
            id={listId}
            role="listbox"
            tabindex={-1}
            onkeydown={onKeydown}
            aria-activedescendant={options[activeIndex] ? `${listId}-${activeIndex}` : undefined}
            class="chorus-scroll absolute left-0 top-full z-[1000] mt-1 max-h-44 w-full min-w-full overflow-y-auto rounded-md border border-hairline-strong bg-surface p-1 shadow-float animate-in fade-in-0 zoom-in-95"
        >
            {#each options as option, i (option.value)}
                {@const isSelected = option.value === selected}
                <!-- keyboard selection is handled on the listbox itself -->
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <li
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={isSelected}
                    onmouseenter={() => (activeIndex = i)}
                    onclick={() => choose(option.value)}
                    class={cn(
                        'flex h-7 cursor-pointer items-center justify-between gap-2 rounded-[4px] px-2 text-xs',
                        i === activeIndex ? 'bg-surface-2 text-ink-fg' : 'text-ink-fg-2',
                        isSelected && 'text-signal-bright'
                    )}
                >
                    <span class="truncate">{option.label}</span>
                    {#if isSelected}
                        <Check class="size-3.5 shrink-0" />
                    {/if}
                </li>
            {/each}
        </ul>
    {/if}
</div>
