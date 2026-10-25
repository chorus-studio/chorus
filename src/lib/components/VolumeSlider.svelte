<script lang="ts">
    import { onMount } from 'svelte'
    import { volumeStore, type VolumeType } from '$lib/stores/volume'

    import * as HoverCard from '$lib/components/ui/hover-card'
    import VolumeIcon from '$lib/components/VolumeIcon.svelte'
    import VolumeReset from '$lib/components/VolumeReset.svelte'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'
    import { CustomSlider } from '$lib/components/ui/custom-slider'
    import { buttonVariants } from '$lib/components/ui/button'

    let { port, pip = false }: { port: chrome.runtime.Port | null; pip?: boolean } = $props()

    function sendVolumeUpdate() {
        if (port) {
            port.postMessage({ type: 'volume', data: $volumeStore })
        } else {
            volumeStore.dispatchVolumeEvent()
        }
    }

    async function handleVolumeChange(value: number) {
        await volumeStore.updateVolume({ value }, false)
        sendVolumeUpdate()
    }

    async function handleMute() {
        await volumeStore.updateVolume({ muted: !$volumeStore.muted }, false)
        sendVolumeUpdate()
    }

    async function handleVolumeTypeChange(value: string) {
        await volumeStore.updateVolume({ type: value as VolumeType }, false)
        sendVolumeUpdate()
    }

    onMount(() => {
        volumeStore.dispatchVolumeEvent()
    })

    const shown = $derived($volumeStore.muted ? 0 : $volumeStore.value)
    const muteLabel = $derived($volumeStore.muted ? 'Unmute' : 'Mute')
</script>

<!-- In the player bar the fill sits on Spotify's (possibly themed) chrome, so
     the slider's signal colour follows --bar-signal there. -->
<div
    id="chorus-volume"
    class="flex w-full items-center gap-x-1.5 {pip ? '' : 'max-w-[240px] self-end'}"
    style={pip ? undefined : '--signal: var(--bar-signal)'}
>
    <VolumeReset {pip} {port} />

    <HoverCard.Root openDelay={pip ? 100000 : 600} closeDelay={300}>
        <HoverCard.Trigger
            role="volume"
            id="volume-button"
            onclick={handleMute}
            aria-label={muteLabel}
            aria-pressed={$volumeStore.muted}
            class={buttonVariants({
                variant: pip ? 'ghost' : 'bar',
                size: 'icon',
                class: '[&_svg]:size-4'
            })}
        >
            <VolumeIcon />
        </HoverCard.Trigger>
        <HoverCard.Content class="flex w-44 flex-col gap-y-2" side="top">
            <span class="rack-label">Volume curve</span>
            <SegmentedControl
                grow
                size="sm"
                ariaLabel="Volume curve"
                value={$volumeStore.type}
                onValueChange={handleVolumeTypeChange}
                options={[
                    { label: 'Linear', value: 'linear' },
                    { label: 'Log', value: 'logarithmic' }
                ]}
            />
            <span class="text-[11px] leading-snug text-ink-muted">
                Log feels more even at low levels. Boost goes up to 300%.
            </span>
        </HoverCard.Content>
    </HoverCard.Root>

    <CustomSlider
        onValueChange={(value) => handleVolumeChange(value as number)}
        type="single"
        label="Volume"
        value={shown}
        min={0}
        max={300}
        step={1}
    />
    <span
        class="min-w-9 text-right font-mono text-[11px] tabular-nums {pip
            ? 'text-ink-muted'
            : 'opacity-80'}"
    >
        {shown}%
    </span>
</div>
