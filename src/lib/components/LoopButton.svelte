<script lang="ts">
    import { loopStore } from '$lib/stores/loop'
    import LoopToggle from './LoopToggle.svelte'
    import { buttonVariants } from '$lib/components/ui/button'
    import * as HoverCard from '$lib/components/ui/hover-card'

    async function toggleLoop() {
        await loopStore.toggleLoop()
    }
</script>

<div class="space-between flex border-none">
    <HoverCard.Root>
        <HoverCard.Trigger
            role="loop"
            id="loop-button"
            onclick={toggleLoop}
            aria-label={$loopStore.looping
                ? `Disable ${$loopStore.type} loop`
                : `Enable ${$loopStore.type} loop`}
            class={buttonVariants({
                variant: 'ghost',
                size: 'icon',
                class: 'relative size-8 border-none bg-transparent hover:bg-transparent [&_svg]:size-[1.125rem]'
            })}
        >
            {#if $loopStore.looping}
                <span
                    class="absolute left-3/4 top-1/2 bg-transparent text-center text-xs font-bold text-[#1ed760]"
                >
                    {$loopStore.type === 'infinite' ? '∞' : $loopStore.iteration}
                </span>
            {/if}
            <svg
                id="loop-icon"
                class="stroke-linecap-round -z-10 size-6 {$loopStore.looping
                    ? 'fill-[#1ed760] stroke-[#1ed760]'
                    : 'fill-current stroke-current'} stroke-[0.2]"
                viewBox="0 0 32 32"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid meet"
            >
                <path
                    xmlns="http://www.w3.org/2000/svg"
                    d="m16 28.0063c-4.6831 0-8.49375-3.8075-8.5-8.4894-.005-.4138.02437-5.6125 4.245-9.91878.3962-.40437.8162-.78749 1.2575-1.14874-2.55-.96375-5.92312-1.44938-9.5025-1.44938-.82812 0-1.5-.67188-1.5-1.5s.67188-1.5 1.5-1.5c4.8675 0 9.2506.83875 12.5106 2.50062 3.2563-1.65375 7.6325-2.48812 12.4894-2.48812.8281 0 1.5.67188 1.5 1.5 0 .82813-.6719 1.5-1.5 1.5-3.5712 0-6.9388.48312-9.485 1.44187.4337.35563.8456.73188 1.2356 1.13 4.2219 4.30563 4.2544 9.50443 4.25 9.92003v.0025c-.0006 4.6862-3.8137 8.4994-8.5006 8.4994zm.0081-18.04255c-.7818.51185-1.4887 1.08995-2.12 1.73435-3.4331 3.5025-3.3887 7.7356-3.3881 7.7781v.0301c0 3.0325 2.4675 5.5 5.5 5.5s5.5-2.4675 5.5-5.5v-.0388c0-.1538-.0406-4.3962-3.43-7.8219-.6163-.6231-1.3037-1.1837-2.0619-1.68185z"
                />
            </svg>
        </HoverCard.Trigger>
        <HoverCard.Content class="w-40 p-3">
            <LoopToggle />
        </HoverCard.Content>
    </HoverCard.Root>
</div>
