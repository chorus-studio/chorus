<script lang="ts">
    import { Label } from '$lib/components/ui/label'
    import { Input } from '$lib/components/ui/input'
    import { Switch } from '$lib/components/ui/switch'
    import SpeedSlider from '$lib/components/SpeedSlider.svelte'

    let speed = $state(padSpeed(1))

    let speedValues = $state({
        track: padSpeed(1),
        global: padSpeed(1),
        globalSpeed: true,
        preservePitch: true
    })

    function padSpeed(value: number | string, decimalPlace: number = 3): string {
        const parsedValue = parseFloat(value.toString())
        if (isNaN(parsedValue)) return value.toString()

        // Use toFixed to ensure we get the exact number of decimal places
        return parsedValue.toFixed(decimalPlace)
    }

    function handleSpeedChange(newSpeed: string | number) {
        const paddedSpeed = padSpeed(newSpeed)
        if (speedValues.globalSpeed) {
            speedValues.global = paddedSpeed
        } else {
            speedValues.track = paddedSpeed
        }
    }

    function handleCheckedChange({ type, checked }: { type: 'global' | 'preservePitch', checked: boolean }) {
        if (type === 'global') {
            speedValues.globalSpeed = checked
        } else {
            speedValues.preservePitch = checked
        }

        speedValues.track = padSpeed(speedValues.track)
        speedValues.global = padSpeed(speedValues.global)
    }

    $effect(() => {
        speedValues.track = padSpeed(speedValues.track)
        speedValues.global = padSpeed(speedValues.global)
    })
</script>

<div class="flex flex-col gap-y-3 w-full">
    <SpeedSlider value={speed} onValueChange={handleSpeedChange} />

    <div class="grid grid-cols-2 w-full">
        <div class="flex flex-col items-center gap-y-1.5">
            <div class="flex w-full items-center h-6">
                <Label for="track-speed" class="text-center p-0 pb-[0.125rem] w-16 text-base lowercase font-bold leading-5 border-none h-6 bg-zinc-700">Track</Label>
                <Input disabled={speedValues.globalSpeed} bind:value={speedValues.track} id="track-speed" class="text-end w-16 px-2 h-6 font-bold rounded-none text-white text-base {!speedValues.globalSpeed ? 'bg-[green]' : ''} border-none" />
            </div>
            <div class="flex w-full items-center">
                <Label for="global-speed" class="text-center p-0 pb-[0.125rem] w-16 text-base lowercase font-bold leading-5 border-none h-6 bg-zinc-700">Global</Label>
                <Input disabled={!speedValues.globalSpeed} id="global-speed" bind:value={speedValues.global} class="w-16 h-6 px-2 text-end font-bold text-white text-base lowercase rounded-none {speedValues.globalSpeed ? 'bg-[green]' : ''} border-none" />
            </div>
        </div>

        <div class="flex flex-col items-end gap-y-1.5">
            <div class="flex items-center gap-x-2 justify-end">
                <Label for="global-check" class="text-base py-0 pb-[0.125rem] font-bold lowercase">{speedValues.globalSpeed ? 'Global Speed' : 'Track Speed'}</Label>
                <Switch id="global-check" bind:checked={speedValues.globalSpeed} onCheckedChange={() => handleCheckedChange({ type: 'global', checked: speedValues.globalSpeed })} />
            </div>

            <div class="flex items-center gap-x-2 justify-end">
                <Label for="pitch-check" class="text-base py-0 pb-[0.125rem] font-bold lowercase">Preserve Pitch</Label>
                <Switch id="pitch-check" bind:checked={speedValues.preservePitch} onCheckedChange={() => handleCheckedChange({ type: 'preservePitch', checked: speedValues.preservePitch })} />
            </div>
        </div>
    </div>
</div>