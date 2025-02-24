<script lang="ts">
    import { snipStore } from '$lib/stores/snip'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { formatTimeInSeconds, timeToSeconds } from '$lib/utils/time'

    import { Input } from '$lib/components/ui/input'
    import { Label } from '$lib/components/ui/label'
    import { Switch } from '$lib/components/ui/switch'

    type SnipKey = 'start_time' | 'end_time'
    function handleChange(event: Event) {
        const input = event.target as HTMLInputElement
        const value = input.value
        const id = input.id as SnipKey
        if (!value || !$snipStore) return

        snipStore.set({ ...$snipStore, [id]: timeToSeconds(value!) })
    }

    function handleLoopChange(checked: boolean) {
        nowPlaying.update((prev) => ({ ...prev, loop: checked }))
    }
</script>

<div class="grid w-full grid-cols-2">
    <div class="flex flex-col items-center gap-y-1.5">
        <div class="flex h-6 items-center">
            <Label
                for="start_time"
                class="h-6 w-12 min-w-12 border-none bg-zinc-700 px-2 py-0 pb-[0.125rem] text-center text-base font-bold lowercase leading-5"
                >Start</Label
            >
            <Input
                id="start_time"
                value={formatTimeInSeconds($snipStore.start_time!)}
                onchange={handleChange}
                class="h-6 w-full rounded-none border-none bg-[green] pl-0 text-end text-base font-bold text-white"
            />
        </div>
        <div class="flex w-full items-center">
            <Label
                for="end_time"
                class="h-6 w-12 min-w-12 border-none bg-zinc-700 px-2 py-0 pb-[0.125rem] text-center text-base font-bold lowercase leading-5"
                >End</Label
            >
            <Input
                id="end_time"
                value={formatTimeInSeconds($snipStore.end_time!)}
                onchange={handleChange}
                class="h-6 w-full rounded-none border-none bg-[green] pl-0 text-end text-base font-bold lowercase text-white"
            />
        </div>
    </div>

    <div class="flex items-center justify-end gap-x-2">
        <Label for="loop" class="py-0 pb-[0.125rem] text-base font-bold lowercase">Auto Loop</Label>
        <Switch id="loop" checked={$nowPlaying.loop ?? false} onCheckedChange={handleLoopChange} />
    </div>
</div>
