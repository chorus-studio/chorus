<script lang="ts">
    import { nowPlaying } from '$lib/stores/now-playing'
    import { formatTimeInSeconds } from '$lib/utils/time'

    import { Input } from '$lib/components/ui/input'
    import { Switch } from '$lib/components/ui/switch'
    import { Label } from '$lib/components/ui/label'

    const input = $state({ start: formatTimeInSeconds($nowPlaying.current), end: formatTimeInSeconds($nowPlaying.duration), loop: $nowPlaying.loop })
</script>

<div class="grid grid-cols-5 gap-x-2">
    <div class="flex flex-col col-span-3 items-center gap-y-1.5">
        <div class="flex items-center h-6">
            <Label for="start" class="text-center py-0 pb-[0.125rem] text-base lowercase font-bold leading-5 border-none min-w-12 px-2 w-12 h-6 bg-zinc-700">Start</Label>
            <Input bind:value={input.start} id="start" class="text-end w-full h-6 font-bold rounded-none text-white text-base bg-[green] border-none" />
        </div>
        <div class="flex w-full items-center">
            <Label for="end" class="text-center py-0 pb-[0.125rem] lowercase font-bold leading-5 border-none text-base min-w-12 px-2 w-12 h-6 bg-zinc-700">End</Label>
            <Input id="end" bind:value={input.end} class="w-full h-6 text-end font-bold text-white text-base lowercase rounded-none bg-[green] border-none" />
        </div>
    </div>

    <div class="flex items-center col-span-2 w-full gap-x-1 justify-end">
        <Label for="loop" class="text-base py-0 pb-[0.125rem] font-bold lowercase">Auto Loop</Label>
        <Switch id="loop" bind:checked={input.loop} />
    </div>
</div>


