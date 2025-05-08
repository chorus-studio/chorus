<script lang="ts">
    import { onMount } from 'svelte'
    import { cn } from '$lib/utils.js'

    export let text: string
    export let as: string = 'span'
    export let className: string = ''
    export let handleClick: () => void = () => {}

    let containerEl: HTMLDivElement
    let measureEl: HTMLSpanElement
    let scroll = false

    const baseClasses = 'whitespace-nowrap text-xs xs:text-sm sm:text-base text-muted-foreground'

    function checkOverflow() {
        if (containerEl?.clientWidth && measureEl?.scrollWidth) {
            setTimeout(() => {
                if (measureEl && containerEl) {
                    scroll = measureEl.scrollWidth > containerEl.clientWidth
                }
            }, 0)
        }
    }

    $: text, checkOverflow()

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
    class={cn(baseClasses, className, 'absolute -left-[9999px]')}
    aria-hidden="true"
>
    {text}
</span>

<div
    role={as === 'a' ? 'link' : undefined}
    onclick={handleClick}
    bind:this={containerEl}
    class="relative w-full overflow-hidden whitespace-nowrap"
>
    {#if scroll}
        <slot {as} class={cn(baseClasses, 'marquee', className)}>
            <span class={cn(baseClasses, 'marquee inline-block text-[var(--text)]', className)}>
                {text} • {text}
            </span>
        </slot>
    {:else}
        <slot {as} class={cn(baseClasses, 'text-[var(--text)]', className)}>
            <span class={cn(baseClasses, className)}>
                {text}
            </span>
        </slot>
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
