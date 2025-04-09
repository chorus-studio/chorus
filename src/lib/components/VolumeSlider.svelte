<script lang="ts">
    import { onMount } from 'svelte'
    import { volumeStore, type VolumeType } from '$lib/stores/volume'

    import { pipStore } from '$lib/stores/pip'
    import { Slider } from '$lib/components/ui/slider'
    import * as HoverCard from '$lib/components/ui/hover-card'
    import VolumeIcon from '$lib/components/VolumeIcon.svelte'
    import VolumeReset from '$lib/components/VolumeReset.svelte'
    import { CustomSlider } from '$lib/components/ui/custom-slider'

    import { buttonVariants } from '$lib/components/ui/button'
    import * as ToggleGroup from '$lib/components/ui/toggle-group'

    let { port }: { port: chrome.runtime.Port | null } = $props()

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

    let pip = $pipStore.open
    let Component = Slider //$pipStore.open ? CustomSlider : Slider
</script>

<div
    id="chorus-volume"
    class="relative flex w-full {pip
        ? ''
        : 'max-w-[220px]'} items-center justify-between gap-x-2 self-end"
>
    <VolumeReset {pip} />

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
            <VolumeIcon {pip} />
        </HoverCard.Trigger>
        <HoverCard.Content class="relative w-28">
            <div class="flex w-full flex-col justify-between gap-2">
                <ToggleGroup.Root
                    type="single"
                    value={$volumeStore.type}
                    onValueChange={handleVolumeTypeChange}
                >
                    <ToggleGroup.Item
                        value="linear"
                        class={buttonVariants({
                            variant: pip ? 'default' : 'ghost',
                            size: 'icon',
                            class: 'h-7 w-8 min-w-8 rounded-sm'
                        })}
                    >
                        ln
                    </ToggleGroup.Item>
                    <ToggleGroup.Item
                        value="logarithmic"
                        class={buttonVariants({
                            variant: pip ? 'default' : 'ghost',
                            size: 'icon',
                            class: 'h-7 w-8 min-w-8 rounded-sm'
                        })}
                    >
                        log
                    </ToggleGroup.Item>
                </ToggleGroup.Root>

                <p class="text-xs text-muted-foreground">{$volumeStore.type}</p>
            </div></HoverCard.Content
        >
    </HoverCard.Root>

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
