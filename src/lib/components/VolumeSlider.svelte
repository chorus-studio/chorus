<script lang="ts">
    import { onMount } from 'svelte'
    import { volumeStore, type VolumeType } from '$lib/stores/volume'
    import { nowPlaying } from '$lib/stores/now-playing'
    import {
        TRACK_VOLUME_DEFAULT,
        TRACK_VOLUME_MAX,
        TRACK_VOLUME_MIN,
        TRACK_VOLUME_STEP,
        dispatchTrackVolume,
        saveTrackVolume
    } from '$lib/utils/track-volume'
    import RotateCcw from '@lucide/svelte/icons/rotate-ccw'
    import { Button } from '$lib/components/ui/button'

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

    // The playing track's own offset. The slider previews live (throttled,
    // nothing stored) and the release saves it with the track; 100 clears it.
    const savedTrackVolume = $derived($nowPlaying.volume ?? TRACK_VOLUME_DEFAULT)
    let liveTrackVolume = $state(TRACK_VOLUME_DEFAULT)
    $effect(() => {
        liveTrackVolume = savedTrackVolume
    })
    const trackVolumeSet = $derived(savedTrackVolume !== TRACK_VOLUME_DEFAULT)
    let previewTimer: ReturnType<typeof setTimeout> | null = null

    function previewTrackVolume(value: number | number[]) {
        liveTrackVolume = value as number
        if (previewTimer) return
        previewTimer = setTimeout(() => {
            previewTimer = null
            dispatchTrackVolume(liveTrackVolume)
        }, 30)
    }

    async function commitTrackVolume(value: number | number[]) {
        if (previewTimer) clearTimeout(previewTimer)
        previewTimer = null
        liveTrackVolume = value as number
        await saveTrackVolume(liveTrackVolume)
    }
</script>

<!-- In the player bar the fill sits on Spotify's (possibly themed) chrome, so
     the slider's signal colour follows --bar-signal there; in PiP it follows
     the popup palette's accent. -->
<div
    id="chorus-volume"
    class="flex w-full items-center {pip ? 'gap-x-2' : 'max-w-[240px] gap-x-1.5 self-end'}"
    style={pip ? '--signal: var(--album-accent-hsl)' : '--signal: var(--bar-signal)'}
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
                variant: 'bar',
                size: 'icon',
                class: pip ? '[&_svg]:size-[18px]' : '[&_svg]:size-4'
            })}
        >
            <VolumeIcon />
        </HoverCard.Trigger>
        <HoverCard.Content class="flex w-52 flex-col gap-y-2.5" side="top">
            <div class="flex flex-col gap-y-2">
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
            </div>
            <div class="flex flex-col gap-y-1.5 border-t border-hairline pt-2.5">
                <div class="flex h-4 items-center justify-between">
                    <span class="rack-label">This track</span>
                    <span
                        class="font-mono text-[11px] tabular-nums {trackVolumeSet ||
                        liveTrackVolume !== TRACK_VOLUME_DEFAULT
                            ? 'text-ink-fg'
                            : 'text-ink-muted'}">{liveTrackVolume}%</span
                    >
                </div>
                <CustomSlider
                    type="single"
                    value={liveTrackVolume}
                    min={TRACK_VOLUME_MIN}
                    max={TRACK_VOLUME_MAX}
                    step={TRACK_VOLUME_STEP}
                    origin={TRACK_VOLUME_DEFAULT}
                    label="This track's volume"
                    disabled={!$nowPlaying.track_id}
                    onValueChange={previewTrackVolume}
                    onValueCommit={commitTrackVolume}
                />
                <div class="flex min-h-6 items-center justify-between gap-x-2">
                    <span class="text-[11px] leading-snug text-ink-muted">
                        {#if trackVolumeSet}
                            Saved with <span class="text-ink-fg-2"
                                >{$nowPlaying.title ?? 'this track'}</span
                            >, on top of the slider.
                        {:else}
                            Saved with the track, on top of the slider.
                        {/if}
                    </span>
                    {#if trackVolumeSet}
                        <Button
                            size="icon-xs"
                            variant="ghost"
                            aria-label="Reset this track's volume"
                            title="Reset"
                            onclick={() => commitTrackVolume(TRACK_VOLUME_DEFAULT)}
                        >
                            <RotateCcw class="size-3.5" />
                        </Button>
                    {/if}
                </div>
            </div>
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
        class="text-right font-mono tabular-nums {pip
            ? 'min-w-10 text-xs text-[color:var(--text-2)]'
            : 'min-w-9 text-[11px] opacity-80'}"
    >
        {shown}%
    </span>
</div>
