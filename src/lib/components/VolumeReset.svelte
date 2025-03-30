<script lang="ts">
    import { volumeStore, type VolumeType } from '$lib/stores/volume'

    import { Label } from '$lib/components/ui/label'
    import { Input } from '$lib/components/ui/input'
    import * as HoverCard from '$lib/components/ui/hover-card'
    import { buttonVariants } from '$lib/components/ui/button'

    async function handleResetVolume() {
        await volumeStore.resetVolume()
    }

    async function updateVolume({ type, value }: { type: VolumeType; value: number }) {
        await volumeStore.updateDefaultVolume({ [type]: value })
    }
</script>

<HoverCard.Root openDelay={1000} closeDelay={500}>
    <HoverCard.Trigger
        role="volume-reset"
        id="volume-reset"
        onclick={handleResetVolume}
        aria-label="Reset volume"
        class={buttonVariants({
            variant: 'ghost',
            size: 'icon',
            class: 'relative flex size-8 border-none bg-transparent hover:bg-transparent [&_svg]:size-[1rem]'
        })}
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-undo-dot-icon lucide-undo-dot"
            ><path d="M21 17a9 9 0 0 0-15-6.7L3 13" /><path d="M3 7v6h6" /><circle
                cx="12"
                cy="17"
                r="1"
            />
        </svg>
        <span class="absolute top-6 text-xs">{$volumeStore.default_volume[$volumeStore.type]}</span>
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
