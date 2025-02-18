<script lang="ts">
    import { playbackStore } from '$lib/stores/playback'
    import { Slider } from '$lib/components/ui/slider'

    let timeout: NodeJS.Timeout

    function padSpeed(value: number | string, decimalPlace: number = 3): string {
        const parsedValue = parseFloat(value.toString())
        if (isNaN(parsedValue)) return value.toString()

        // Use toFixed to ensure we get the exact number of decimal places
        return parsedValue.toFixed(decimalPlace)
    }

    async function handleValueChange(newValue: number) {
        if (timeout) clearTimeout(timeout)

        timeout = setTimeout(async () => {
            const type = $playbackStore.is_default ? 'default' : 'track'
            await playbackStore.setPlayback({
                type,
                key: 'playbackRate',
                value: Number(padSpeed(newValue))
            })
            document.dispatchEvent(
                new CustomEvent('FROM_CHORUS_EXTENSION', {
                    detail: { type: 'playback_settings', data: $playbackStore }
                })
            )
        }, 200)
    }

    $: value = $playbackStore.is_default
        ? $playbackStore.default.playbackRate
        : $playbackStore.track.playbackRate
</script>

<div class="flex w-full items-center justify-between gap-x-4">
    <p class="text-xs text-muted-foreground">0.1x</p>
    <Slider
        onValueChange={handleValueChange}
        type="single"
        {value}
        min={0.1}
        max={4}
        step={0.001}
        class="h-6 w-full"
    />
    <p class="text-xs text-muted-foreground">4x</p>
</div>
