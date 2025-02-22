<script lang="ts">
    import { playbackStore } from '$lib/stores/playback'

    import { Label } from '$lib/components/ui/label'
    import { Input } from '$lib/components/ui/input'
    import { Switch } from '$lib/components/ui/switch'
    import SpeedSlider from '$lib/components/SpeedSlider.svelte'

    function padSpeed(value: number | string, decimalPlace: number = 3): string {
        const parsedValue = parseFloat(value.toString())
        if (isNaN(parsedValue)) return value.toString()

        // Use toFixed to ensure we get the exact number of decimal places
        return parsedValue.toFixed(decimalPlace)
    }

    function dispatchPlaybackSettings() {
        document.dispatchEvent(
            new CustomEvent('FROM_CHORUS_EXTENSION', {
                detail: { type: 'playback_settings', data: $playbackStore }
            })
        )
    }

    async function handleInput(event: Event) {
        const input = event.target as HTMLInputElement
        const value = input.value
        const type = $playbackStore.is_default ? 'default' : 'track'
        await playbackStore.setPlayback({ type, key: 'playbackRate', value: Number(value) })
        dispatchPlaybackSettings()
    }

    async function handleCheckedChange({
        type,
        checked
    }: {
        type: 'global' | 'preservePitch'
        checked: boolean
    }) {
        if (type === 'global') {
            await playbackStore.toggleDefault()
        } else {
            const type = $playbackStore.is_default ? 'default' : 'track'
            await playbackStore.setPlayback({ type, key: 'preservesPitch', value: checked })
        }
        dispatchPlaybackSettings()
    }
</script>

<div class="flex w-full flex-col gap-y-3">
    <SpeedSlider />

    <div class="grid w-full grid-cols-2">
        <div class="flex flex-col items-center gap-y-1.5">
            <div class="flex h-6 w-full items-center">
                <Label
                    for="track-speed"
                    class="h-6 w-16 border-none bg-zinc-700 p-0 pb-[0.125rem] text-center text-base font-bold lowercase leading-5"
                    >Track</Label
                >
                <Input
                    disabled={$playbackStore.is_default}
                    value={padSpeed($playbackStore.track.playbackRate)}
                    onchange={handleInput}
                    id="track-speed"
                    class="h-6 w-16 rounded-none px-2 text-end text-base font-bold text-white {!$playbackStore.is_default
                        ? 'bg-[green]'
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
                    value={padSpeed($playbackStore.default.playbackRate)}
                    onchange={handleInput}
                    class="h-6 w-16 rounded-none px-2 text-end text-base font-bold lowercase text-white {$playbackStore.is_default
                        ? 'bg-[green]'
                        : ''} border-none"
                />
            </div>
        </div>

        <div class="flex flex-col items-end gap-y-1.5">
            <div class="flex items-center justify-end gap-x-2">
                <Label for="global-check" class="py-0 pb-[0.125rem] text-base font-bold lowercase"
                    >{$playbackStore.is_default ? 'Global Speed' : 'Track Speed'}</Label
                >
                <Switch
                    id="global-check"
                    checked={$playbackStore.is_default}
                    onCheckedChange={(checked) => handleCheckedChange({ type: 'global', checked })}
                />
            </div>

            <div class="flex items-center justify-end gap-x-2">
                <Label for="pitch-check" class="py-0 pb-[0.125rem] text-base font-bold lowercase"
                    >Preserve Pitch</Label
                >
                <Switch
                    id="pitch-check"
                    checked={$playbackStore.is_default
                        ? $playbackStore.default.preservesPitch
                        : $playbackStore.track.preservesPitch}
                    onCheckedChange={(checked) =>
                        handleCheckedChange({
                            type: 'preservePitch',
                            checked: checked
                        })}
                />
            </div>
        </div>
    </div>
</div>
