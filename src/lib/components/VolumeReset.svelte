<script lang="ts">
    import { volumeStore, type VolumeType } from '$lib/stores/volume'

    import { Label } from '$lib/components/ui/label'
    import { Input } from '$lib/components/ui/input'
    import UndoDot from '@lucide/svelte/icons/undo-dot'
    import * as HoverCard from '$lib/components/ui/hover-card'
    import { Button, buttonVariants } from '$lib/components/ui/button'

    let { pip = false }: { pip?: boolean } = $props()

    async function handleResetVolume() {
        await volumeStore.resetVolume()
    }

    async function updateVolume({ type, value }: { type: VolumeType; value: number }) {
        await volumeStore.updateDefaultVolume({ [type]: value })
    }
</script>

{#if pip}
    <Button
        size="icon"
        role="volume-reset"
        id="volume-reset"
        variant="secondary"
        onclick={handleResetVolume}
        aria-label="Reset volume"
        class="relative flex size-8 border-none bg-transparent hover:bg-transparent [&_svg]:size-[1rem]"
    >
        <UndoDot class="size-4" />
        <span class="absolute top-6 text-xs">{$volumeStore.default_volume[$volumeStore.type]}</span>
    </Button>
{:else}
    <HoverCard.Root openDelay={1000} closeDelay={500}>
        <HoverCard.Trigger
            role="volume-reset"
            id="volume-reset"
            onclick={handleResetVolume}
            aria-label="Reset volume"
            class={buttonVariants({
                variant: pip ? 'default' : 'ghost',
                size: 'icon',
                class: `relative flex size-8 border-none bg-transparent hover:bg-transparent [&_svg]:size-[1rem]`
            })}
        >
            <UndoDot class="size-4" />
            <span class="absolute top-6 text-xs"
                >{$volumeStore.default_volume[$volumeStore.type]}</span
            >
        </HoverCard.Trigger>

        <HoverCard.Content class="relative flex w-44 flex-col gap-2">
            <h3 class="text-center text-sm font-medium">Volume Resets</h3>
            <div class="flex items-center justify-between gap-2">
                <div class="flex w-full flex-col justify-between gap-2">
                    <Label for="linear-volume">Linear</Label>
                    <Input
                        min={1}
                        max={300}
                        type="number"
                        id="linear-volume"
                        placeholder="100"
                        class="h-8 w-full"
                        aria-label="Linear volume"
                        value={$volumeStore.default_volume.linear}
                        oninput={async (e) => {
                            const value = (e.target as HTMLInputElement).value
                            await updateVolume({ type: 'linear', value: Number(value) })
                        }}
                    />
                </div>

                <div class="flex w-full flex-col justify-between gap-2">
                    <Label for="logarithmic-volume">Log.</Label>
                    <Input
                        min={1}
                        max={300}
                        type="number"
                        id="logarithmic-volume"
                        placeholder="100"
                        class="h-8 w-full"
                        aria-label="Logarithmic volume"
                        value={$volumeStore.default_volume.logarithmic}
                        oninput={async (e) => {
                            const value = (e.target as HTMLInputElement).value
                            await updateVolume({ type: 'logarithmic', value: Number(value) })
                        }}
                    />
                </div>
            </div>
        </HoverCard.Content>
    </HoverCard.Root>
{/if}
