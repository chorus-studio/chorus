<script lang="ts">
    import { onMount } from 'svelte'
    import { cn } from '$lib/utils.js'

    let {
        text,
        as = 'span',
        className = '',
        handleClick = () => {}
    }: { text: string; as?: string; className?: string; handleClick?: () => void } = $props()

    let containerEl: HTMLDivElement
    let measureEl: HTMLSpanElement
    let scroll = $state(false)

    const baseClasses = 'whitespace-nowrap leading-tight'

    function checkOverflow() {
        if (containerEl?.clientWidth && measureEl?.scrollWidth) {
            setTimeout(() => {
                if (measureEl && containerEl) {
                    scroll = measureEl.scrollWidth > containerEl.clientWidth
                }
            }, 0)
        }
    }

    $effect(() => {
        void text
        checkOverflow()
    })

    onMount(() => {
        checkOverflow()
        const resizeObserver = new ResizeObserver(() => checkOverflow())
        resizeObserver.observe(containerEl)
        return () => resizeObserver.disconnect()
    })
</script>

<!-- Hidden element for measurement -->
<span
    bind:this={measureEl}
    class={cn(baseClasses, className, 'pointer-events-none absolute -left-[9999px]')}
    aria-hidden="true"
>
    {text}
</span>

<div
    role={as === 'a' ? 'link' : undefined}
    onclick={handleClick}
    bind:this={containerEl}
    class="relative flex w-full overflow-hidden whitespace-nowrap"
    class:cursor-pointer={as === 'a'}
>
    {#if scroll}
        <span class={cn(baseClasses, 'marquee inline-block', className)}>
            {text} • {text}
        </span>
    {:else}
        <span class={cn(baseClasses, 'block max-w-full truncate', className)}>
            {text}
        </span>
    {/if}
</div>

<style>
    .marquee {
        animation: marquee 15s linear infinite !important;
    }

    @keyframes marquee {
        0% {
            transform: translate3d(0, 0, 0);
        }
        100% {
            transform: translate3d(-50%, 0, 0);
        }
    }

    .marquee:hover {
        animation-play-state: paused;
    }
</style>
