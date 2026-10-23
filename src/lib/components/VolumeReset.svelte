<script lang="ts">
    import { volumeStore, type VolumeType } from '$lib/stores/volume'

    import { Input } from '$lib/components/ui/input'
    import UndoDot from '@lucide/svelte/icons/undo-dot'
    import * as HoverCard from '$lib/components/ui/hover-card'
    import { buttonVariants } from '$lib/components/ui/button'

    let { pip = false, port = null }: { pip?: boolean; port?: chrome.runtime.Port | null } =
        $props()

    async function handleResetVolume() {
        await volumeStore.resetVolume(false)
        if (port) {
            port.postMessage({ type: 'volume', data: $volumeStore })
        } else {
            volumeStore.dispatchVolumeEvent()
        }
    }

    async function updateVolume({ type, value }: { type: VolumeType; value: number }) {
        await volumeStore.updateDefaultVolume({ [type]: value })
    }

    const resetTo = $derived($volumeStore.default_volume[$volumeStore.type])
    const label = $derived(`Reset volume to ${resetTo}%`)
</script>

<HoverCard.Root openDelay={pip ? 100000 : 600} closeDelay={300}>
    <HoverCard.Trigger
        role="volume-reset"
        id="volume-reset"
        onclick={handleResetVolume}
        aria-label={label}
        title={pip ? label : undefined}
        class={buttonVariants({
            variant: pip ? 'ghost' : 'bar',
            size: 'icon',
            class: 'relative [&_svg]:size-4'
        })}
    >
        <UndoDot />
        <span
            class="pointer-events-none absolute inset-x-0 bottom-0 text-center font-mono text-[8px] leading-none opacity-80"
        >
            {resetTo}
        </span>
    </HoverCard.Trigger>

    <HoverCard.Content class="flex w-48 flex-col gap-y-2.5" side="top">
        <div class="flex flex-col gap-y-0.5">
            <span class="rack-label">Reset point</span>
            <span class="text-[11px] text-ink-muted">Where the reset button returns volume to</span>
        </div>
        <div class="grid grid-cols-2 gap-x-2">
            {#each [['linear', 'Linear'], ['logarithmic', 'Log']] as [type, name] (type)}
                <label class="flex flex-col gap-y-1 text-[11px] text-ink-fg-2">
                    {name}
                    <Input
                        min={1}
                        max={300}
                        type="number"
                        placeholder="100"
                        class="h-7 px-2 font-mono text-xs"
                        aria-label={`${name} reset volume`}
                        value={$volumeStore.default_volume[type as VolumeType]}
                        oninput={async (e) => {
                            const value = (e.target as HTMLInputElement).value
                            await updateVolume({ type: type as VolumeType, value: Number(value) })
                        }}
                    />
                </label>
            {/each}
        </div>
    </HoverCard.Content>
</HoverCard.Root>
