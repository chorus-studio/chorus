<script lang="ts">
    import { pipStore } from '$lib/stores/pip'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { playbackStore } from '$lib/stores/playback'

    import { Label } from '$lib/components/ui/label'
    import { Input } from '$lib/components/ui/input'
    import { Switch } from '$lib/components/ui/switch'
    import BadgeList from '$lib/components/BadgeList.svelte'
    import SpeedSlider from '$lib/components/SpeedSlider.svelte'
    import ToggleSelect from '$lib/components/ToggleSelect.svelte'

    function padSpeed(value: number | string, decimalPlace: number = 4): string {
        const parsedValue = parseFloat(value.toString())
        if (isNaN(parsedValue)) return value.toString()

        // Use toFixed to ensure we get the exact number of decimal places
        return parsedValue.toFixed(decimalPlace)
    }

    async function handleInput(event: Event) {
        const input = event.target as HTMLInputElement
        const value = input.value
        const type = $playbackStore.is_default ? 'default' : 'track'
        await playbackStore.updatePlayback({
            [type]: {
                ...$playbackStore[type],
                playback_rate: Number(value)
            }
        })
        playbackStore.dispatchPlaybackSettings($playbackStore[type])
    }

    async function handleToggleSelect(value: string) {
        await playbackStore.updatePlayback({ is_default: value === 'global' })
        const type = $playbackStore.is_default ? 'default' : 'track'
        playbackStore.dispatchPlaybackSettings($playbackStore[type])
    }

    async function handleCheckedChange(checked: boolean) {
        const type = $playbackStore.is_default ? 'default' : 'track'
        await playbackStore.updatePlayback({
            [type]: { ...$playbackStore[type], preserves_pitch: checked }
        })
        playbackStore.dispatchPlaybackSettings($playbackStore[type])
    }

    async function handleBadgeSelect(value: number) {
        const type = $playbackStore.is_default ? 'default' : 'track'
        await playbackStore.updatePlayback({
            [type]: { ...$playbackStore[type], playback_rate: value }
        })
        playbackStore.dispatchPlaybackSettings($playbackStore[type])
    }

    async function setupSpeed() {
        const track = {
            playback_rate: $nowPlaying?.playback?.playback_rate ?? 1,
            preserves_pitch: $nowPlaying?.playback?.preserves_pitch ?? true
        }
        await playbackStore.updatePlayback({ track, is_default: !$nowPlaying?.playback })
    }

    onMount(() => {
        setupSpeed()
        return () => setupSpeed()
    })

    let pip = $pipStore.open
</script>

<div class="flex w-full flex-col space-y-1">
    <BadgeList list={[0.5, 0.75, 0.9818, 1, 1.2, 1.5, 2.5]} handleSelect={handleBadgeSelect} />
    <SpeedSlider />

    <div class="flex w-full items-center justify-between">
        <div class="flex flex-col items-center gap-y-1.5">
            <div class="flex h-6 w-full items-center">
                <Label
                    for="track-speed"
                    class="h-6 w-16 border-none bg-zinc-700 p-0 pb-[0.125rem] text-center text-base font-bold lowercase leading-5"
                    >Track</Label
                >
                <Input
                    disabled={$playbackStore.is_default}
                    value={padSpeed($playbackStore.track.playback_rate)}
                    onchange={handleInput}
                    id="track-speed"
                    class="h-6 {pip
                        ? 'w-20'
                        : 'w-16'} rounded-none px-2 text-end text-base font-bold text-white {!$playbackStore.is_default
                        ? 'border-1 border-zinc-200 bg-green-700'
                        : ''} border-none"
                />
            </div>
            <div class="flex w-full items-center">
                <Label
                    for="global-speed"
                    class="h-6 w-16 border-none bg-zinc-700 p-0 pb-[0.125rem] text-center text-base font-bold lowercase leading-5"
                    >Global</Label
                >
                <Input
                    disabled={!$playbackStore.is_default}
                    id="global-speed"
                    value={padSpeed($playbackStore.default.playback_rate)}
                    onchange={handleInput}
                    class="h-6 {pip
                        ? 'w-20'
                        : 'w-16'} rounded-none px-2 text-end text-base font-bold lowercase text-white {$playbackStore.is_default
                        ? 'border-1 border-zinc-200 bg-green-700'
                        : 'border-none'}"
                />
            </div>
        </div>

        <div class="flex flex-col items-end gap-y-1.5">
            <div class="flex items-center justify-between">
                <ToggleSelect
                    label={$playbackStore.is_default ? 'Global Speed' : 'Track Speed'}
                    list={[
                        { label: 'G', value: 'global' },
                        { label: 'T', value: 'track' }
                    ]}
                    value={$playbackStore.is_default ? 'global' : 'track'}
                    onValueChange={(value: string) => handleToggleSelect(value)}
                />
            </div>

            <div class="flex w-full items-center justify-between">
                <Label for="pitch-check" class="py-0 pb-[0.125rem] text-base font-bold lowercase"
                    >Preserve Pitch</Label
                >
                <Switch
                    id="pitch-check"
                    checked={$playbackStore.is_default
                        ? $playbackStore.default.preserves_pitch
                        : $playbackStore.track.preserves_pitch}
                    onCheckedChange={handleCheckedChange}
                />
            </div>
        </div>
    </div>
</div>
