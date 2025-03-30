<script lang="ts">
    import { onMount } from 'svelte'
    import { volumeStore, type VolumeType } from '$lib/stores/volume'

    import { Slider } from '$lib/components/ui/slider'
    import * as HoverCard from '$lib/components/ui/hover-card'
    import VolumeIcon from '$lib/components/VolumeIcon.svelte'
    import VolumeReset from '$lib/components/VolumeReset.svelte'

    import { buttonVariants } from '$lib/components/ui/button'
    import * as ToggleGroup from '$lib/components/ui/toggle-group'

    async function handleVolumeChange(value: number) {
        await volumeStore.updateVolume({ value })
    }

    async function handleMute() {
        await volumeStore.updateVolume({ muted: !$volumeStore.muted })
    }

    async function handleVolumeTypeChange(value: string) {
        await volumeStore.updateVolume({ type: value as VolumeType })
    }

    onMount(() => {
        volumeStore.dispatchVolumeEvent()
    })
</script>

<div class="relative flex w-full max-w-[220px] items-center justify-between gap-x-2 self-end">
    <VolumeReset />

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
                            variant: 'ghost',
                            size: 'icon',
                            class: 'h-7 w-8 min-w-8 rounded-sm'
                        })}
                    >
                        ln
                    </ToggleGroup.Item>
                    <ToggleGroup.Item
                        value="logarithmic"
                        class={buttonVariants({
                            variant: 'ghost',
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

    <Slider
        onValueChange={(value) => handleVolumeChange(value)}
        type="single"
        value={$volumeStore.muted ? 0 : $volumeStore.value}
        min={0}
        max={300}
        step={1}
        class="h-6 w-full"
    />
    <div class="flex flex-col items-end gap-1">
        <p class="text-xs text-muted-foreground">
            {$volumeStore.muted ? 0 : $volumeStore.value}%
        </p>
    </div>
</div>
