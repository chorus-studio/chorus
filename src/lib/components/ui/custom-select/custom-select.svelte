<script lang="ts">
    import { onMount, onDestroy } from 'svelte'

    import ChevronDown from '@lucide/svelte/icons/chevron-down'
    import { buttonVariants } from '$lib/components/ui/button'
    let { selected = 'none', onValueChange, options = [] } = $props()

    let isOpen = $state(false)
    let triggerRef: HTMLButtonElement | null = null
    let selectRef: HTMLSelectElement | null = null
    let containerRef: HTMLDivElement | null = null

    function handleChange(event: Event) {
        const select = event.target as HTMLSelectElement
        onValueChange?.(select.value)
        isOpen = false
    }

    function handleClickOutside(event: MouseEvent) {
        const target = event.target as Node
        if (containerRef && !containerRef.contains(target)) {
            isOpen = false
        }
    }

    function handleMouseEnter(e: Event) {
        const target = e.target as HTMLOptionElement
        if (target) {
            target.classList.remove('!bg-[#171717]')
            target.classList.add('!bg-[#3e3d3d]')
        }
    }

    function handleMouseLeave(e: Event) {
        const target = e.target as HTMLOptionElement
        if (target) {
            target.classList.remove('!bg-[#3e3d3d]')
            target.classList.add('!bg-[#171717]')
        }
    }

    onMount(() => {
        document.addEventListener('mousedown', handleClickOutside)
    })

    onDestroy(() => {
        document.removeEventListener('mousedown', handleClickOutside)
    })
</script>

<div class="relative flex justify-between" bind:this={containerRef}>
    <div class="relative min-w-40">
        <button
            bind:this={triggerRef}
            class={buttonVariants({
                variant: 'outline',
                class: 'flex h-7 w-full cursor-pointer appearance-none items-center justify-end justify-items-end rounded-sm border border-white bg-transparent px-2 py-1 pr-0 text-muted-foreground hover:bg-gray-800'
            })}
            onclick={() => (isOpen = !isOpen)}
        >
            <span class="text-end text-white">{selected}</span>
            <ChevronDown class="mr-2 size-3 text-muted-foreground" color="white" />
        </button>

        {#if isOpen}
            <select
                bind:this={selectRef}
                size={5}
                class="absolute left-0 top-full z-[1000] mt-1 flex w-full cursor-pointer appearance-none items-center justify-end overflow-y-scroll rounded-sm border border-white bg-[#171717] px-2 py-1 pr-2 text-muted-foreground"
                value={selected}
                onchange={handleChange}
            >
                {#each options as option}
                    <option
                        class="!hover:bg-[#3e3d3d] -mx-2 cursor-pointer !bg-[#171717] py-1 pr-4 text-end text-sm text-white"
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
        @apply text-sm text-white;
        max-height: 100px;
    }

    select option {
        @apply bg-gray-600 text-white;
    }

    select:focus {
        @apply outline-none ring-1 ring-white;
    }
</style>
