<script lang="ts">
    import { dataStore } from '$lib/stores/data'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { playbackStore } from '$lib/stores/playback'
    import { Slider } from '$lib/components/ui/slider'

    let timeout: NodeJS.Timeout

    function padSpeed(value: number | string, decimalPlace: number = 4): string {
        const parsedValue = parseFloat(value.toString())
        if (isNaN(parsedValue)) return value.toString()

        // Use toFixed to ensure we get the exact number of decimal places
        return parsedValue.toFixed(decimalPlace)
    }

    function setTempSpeed(newValue: number) {
        const type = $playbackStore.is_default ? 'default' : 'track'
        playbackStore.update((state) => ({
            ...state,
            [type]: {
                ...state[type],
                playback_rate: Number(padSpeed(newValue))
            }
        }))
        playbackStore.dispatchPlaybackSettings($playbackStore[type])
    }

    async function handleValueChange(newValue: number) {
        setTempSpeed(newValue)
        if (timeout) clearTimeout(timeout)

        timeout = setTimeout(async () => {
            const type = $playbackStore.is_default ? 'default' : 'track'
            await playbackStore.updatePlayback({
                [type]: {
                    ...$playbackStore[type],
                    playback_rate: Number(padSpeed(newValue))
                }
            })
            if (type === 'track') {
                await dataStore.updateTrack({
                    track_id: $nowPlaying.track_id!,
                    value: {
                        playback: {
                            preserves_pitch: $playbackStore.default.preserves_pitch,
                            playback_rate: Number(padSpeed(newValue))
                        }
                    }
                })
            }
        }, 100)
    }

    $: value = $playbackStore.is_default
        ? $playbackStore.default.playback_rate
        : $playbackStore.track.playback_rate
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
