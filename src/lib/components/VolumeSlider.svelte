<script lang="ts">
    import { onMount } from 'svelte'
    import { volumeStore, type VolumeType } from '$lib/stores/volume'

    import { Slider } from '$lib/components/ui/slider'
    import * as HoverCard from '$lib/components/ui/hover-card'
    import VolumeIcon from '$lib/components/VolumeIcon.svelte'
    import VolumeReset from '$lib/components/VolumeReset.svelte'
    import ToggleSelect from '$lib/components/ToggleSelect.svelte'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import { Button, buttonVariants } from '$lib/components/ui/button'

    let { port, pip = false }: { port: chrome.runtime.Port | null; pip?: boolean } = $props()

    async function handleVolumeChange(value: number) {
        await volumeStore.updateVolume({ value })
        port?.postMessage({ type: 'volume', data: $volumeStore })
    }

    async function handleMute() {
        await volumeStore.updateVolume({ muted: !$volumeStore.muted })
        port?.postMessage({ type: 'volume', data: $volumeStore })
    }

    async function handleVolumeTypeChange(value: string) {
        await volumeStore.updateVolume({ type: value as VolumeType })
        port?.postMessage({ type: 'volume', data: $volumeStore })
    }

    onMount(() => {
        volumeStore.dispatchVolumeEvent()
    })

    let Component = pip ? CustomSlider : Slider
</script>

<div
    id="chorus-volume"
    class="relative flex w-full {pip
        ? ''
        : 'max-w-[220px]'} items-center justify-between gap-x-2 self-end"
>
    <div class="-mt-4">
        <VolumeReset {pip} />
    </div>

    {#if pip}
        <Button
            size="icon"
            onclick={handleMute}
            aria-label={$volumeStore.muted ? `Disable volume` : `Enable volume`}
            class="relative size-8 border-none bg-transparent text-popover-foreground hover:bg-transparent [&_svg]:size-[1rem]"
        >
            <VolumeIcon />
        </Button>
    {:else}
        <HoverCard.Root>
            <HoverCard.Trigger
                role="volume"
                id="volume-button"
                onclick={handleMute}
                aria-label={$volumeStore.muted ? `Disable volume` : `Enable volume`}
                class={buttonVariants({
                    variant: 'ghost',
                    size: 'icon',
                    class: 'relative size-8 border-none bg-transparent hover:bg-transparent [&_svg]:size-[1rem]'
                })}
            >
                <VolumeIcon />
            </HoverCard.Trigger>
            <HoverCard.Content class="relative max-w-24">
                <div class="flex w-full flex-col items-center justify-between gap-2">
                    <ToggleSelect
                        value={$volumeStore.type}
                        onValueChange={handleVolumeTypeChange}
                        list={[
                            { label: 'ln', value: 'linear' },
                            { label: 'lg', value: 'logarithmic' }
                        ]}
                    />
                    <p class="text-xs text-muted-foreground">{$volumeStore.type}</p>
                </div></HoverCard.Content
            >
        </HoverCard.Root>
    {/if}

    <Component
        onValueChange={(value) => handleVolumeChange(value as number)}
        type="single"
        value={$volumeStore.muted ? 0 : $volumeStore.value}
        min={0}
        max={300}
        step={1}
        class="pointer-events-auto h-6 w-full"
    />
    <div class="flex flex-col items-end gap-1">
        <p class="text-xs text-muted-foreground">
            {$volumeStore.muted ? 0 : $volumeStore.value}%
        </p>
    </div>
</div>
