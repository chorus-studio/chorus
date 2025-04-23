<script lang="ts">
    import { onMount } from 'svelte'
    import { pipStore } from '$lib/stores/pip'
    import { clickOutside } from '$lib/utils/click-outside'

    import ChevronDown from '@lucide/svelte/icons/chevron-down'
    import { buttonVariants } from '$lib/components/ui/button'

    let {
        pip = false,
        size = 'default',
        selected = 'none',
        onValueChange,
        options = [],
        class: className = ''
    } = $props()

    let isOpen = $state(false)
    let triggerRef: HTMLButtonElement | null = null

    function handleChange(event: Event) {
        const select = event.target as HTMLSelectElement
        onValueChange?.(select.value)
        isOpen = false
    }

    function handleMouseEnter(e: Event) {
        const target = e.target as HTMLOptionElement
        if (target) {
            const classesToRemove = small
                ? ['!bg-[var(--bg)]', '!text-[var(--text)]']
                : ['!bg-[#171717]']
            target.classList.remove(...classesToRemove)
            const classesToAdd = small
                ? ['!bg-[var(--text)]', '!text-[var(--bg)]']
                : ['!bg-[#3e3d3d]']
            target.classList.add(...classesToAdd)
        }
    }

    function handleMouseLeave(e: Event) {
        const target = e.target as HTMLOptionElement
        if (target) {
            const classesToRemove = small
                ? ['!bg-[var(--text)]', '!text-[var(--bg)]']
                : ['!bg-[#3e3d3d]']
            target.classList.remove(...classesToRemove)
            const classesToAdd = small
                ? ['!bg-[var(--bg)]', '!text-[var(--text)]']
                : ['!bg-[#171717]']
            target.classList.add(...classesToAdd)
        }
    }

    async function togglePipOpen() {
        const newState = !$pipStore.open
        isOpen = newState
        await pipStore.setOpen(newState)
    }

    const small = size === 'sm'
    const medium = size === 'md'

    onMount(() => {
        const unsubscribe = pipStore.subscribe((state) => {
            if (pip && !state.open) {
                isOpen = false
            }
        })

        return () => unsubscribe()
    })
</script>

<div
    use:clickOutside={() => (isOpen = false)}
    aria-label="select"
    class="relative flex justify-between {className}"
>
    <div class="relative {small ? 'min-w-28' : medium ? 'min-w-32' : 'min-w-40'} w-full">
        <button
            bind:this={triggerRef}
            class={buttonVariants({
                variant: 'outline',
                class: `trigger flex w-full ${small ? 'hover:bg-[var(--bg)]/20 h-5 bg-[var(--bg)] p-0 text-[var(--text)]' : 'h-7 w-full bg-transparent px-2 py-1 hover:bg-gray-700'} cursor-pointer appearance-none items-center justify-end justify-items-end rounded-sm border border-muted-foreground pr-0`
            })}
            onclick={togglePipOpen}
        >
            <span
                class="text-end {small
                    ? '!hover:text-[var(--bg)] text-xs !text-[var(--text)]'
                    : 'text-muted-foreground'}">{selected}</span
            >
            <ChevronDown
                class="mr-2 size-3 {small
                    ? '!hover:text-[var(--bg)] !text-[var(--text)]'
                    : 'text-muted-foreground'}"
            />
        </button>

        {#if isOpen}
            <select
                size={5}
                class="absolute left-0 top-full z-[1000] mt-1 flex w-full cursor-pointer appearance-none items-center justify-end overflow-y-scroll rounded-sm border border-muted-foreground {small
                    ? '!bg-[var(--bg)] !text-[var(--text)]'
                    : 'bg-[#171717] text-muted-foreground'} px-2 py-1 pr-2"
                value={selected}
                onchange={handleChange}
            >
                {#each options as option}
                    <option
                        class=" -mx-2 cursor-pointer py-1 pr-4 text-end {small
                            ? '!bg-[var(--bg)] text-xs !text-[var(--text)]'
                            : '!bg-[#171717] text-sm text-white'}"
                        value={option.value}
                        onfocus={handleMouseEnter}
                        onblur={handleMouseLeave}
                        onmouseenter={handleMouseEnter}
                        onmouseover={handleMouseEnter}
                        onmouseout={handleMouseLeave}
                        onmouseleave={handleMouseLeave}
                    >
                        {option.label}
                    </option>
                {/each}
            </select>
        {/if}
    </div>
</div>

<style lang="postcss">
    select {
        @apply text-sm text-muted-foreground;
        max-height: 100px;
    }

    select option {
        @apply bg-gray-600 text-muted-foreground;
    }

    select:focus {
        @apply outline-none ring-1 ring-muted-foreground;
    }
</style>
