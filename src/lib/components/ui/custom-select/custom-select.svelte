<script lang="ts">
    import { onMount } from 'svelte'
    import { pipStore } from '$lib/stores/pip'

    import ChevronDown from '@lucide/svelte/icons/chevron-down'
    import { buttonVariants } from '$lib/components/ui/button'
    let { selected = 'none', onValueChange, options = [] } = $props()

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

    async function togglePipOpen() {
        await pipStore.setOpen(!isOpen)
        isOpen = !isOpen
    }

    onMount(() => {
        const unsubscribe = pipStore.subscribe((state) => {
            if (!state.open) {
                isOpen = false
            }
        })

        return () => {
            unsubscribe()
        }
    })
</script>

<div aria-label="select" class="relative flex justify-between">
    <div class="relative min-w-40">
        <button
            bind:this={triggerRef}
            class={buttonVariants({
                variant: 'outline',
                class: 'trigger flex h-7 w-full cursor-pointer appearance-none items-center justify-end justify-items-end rounded-sm border border-muted-foreground bg-transparent px-2 py-1 pr-0 text-muted-foreground hover:bg-gray-950'
            })}
            onclick={togglePipOpen}
        >
            <span class="text-end text-muted-foreground">{selected}</span>
            <ChevronDown class="mr-2 size-3 text-muted-foreground" />
        </button>

        {#if isOpen}
            <select
                size={5}
                class="absolute left-0 top-full z-[1000] mt-1 flex w-full cursor-pointer appearance-none items-center justify-end overflow-y-scroll rounded-sm border border-muted-foreground bg-[#171717] px-2 py-1 pr-2 text-muted-foreground"
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
