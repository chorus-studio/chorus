<script lang="ts">
    import { loopStore } from '$lib/stores/loop'
    import LoopToggle from './LoopToggle.svelte'
    import { buttonVariants } from '$lib/components/ui/button'
    import * as HoverCard from '$lib/components/ui/hover-card'

    async function toggleLoop() {
        await loopStore.toggleLoop()
    }

    const label = $derived(
        $loopStore.looping
            ? `Stop looping (${$loopStore.type === 'infinite' ? 'forever' : `${$loopStore.iteration} left`})`
            : 'Loop snip or track'
    )
</script>

<HoverCard.Root openDelay={400} closeDelay={200}>
    <HoverCard.Trigger
        role="loop"
        id="loop-button"
        onclick={toggleLoop}
        aria-label={label}
        aria-pressed={$loopStore.looping}
        class={buttonVariants({
            variant: 'bar',
            size: 'icon',
            class: `relative [&_svg]:size-[20px] ${$loopStore.looping ? 'text-signal opacity-100' : ''}`
        })}
    >
        <svg
            id="loop-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
        >
            <path
                d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z"
            />
        </svg>
        {#if $loopStore.looping && $loopStore.type !== 'infinite'}
            <span
                class="pointer-events-none absolute inset-x-0 bottom-0 text-center font-mono text-[9px] font-bold leading-none"
            >
                {$loopStore.iteration}
            </span>
        {/if}
    </HoverCard.Trigger>
    <HoverCard.Content class="w-52 p-3" side="top">
        <LoopToggle />
    </HoverCard.Content>
</HoverCard.Root>
