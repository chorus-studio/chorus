<script lang="ts">
    import {
        defaultPlayback,
        playbackStore,
        type Frequent,
        type Playback
    } from '$lib/stores/playback'

    import { Label } from '$lib/components/ui/label'
    import { Input } from '$lib/components/ui/input'
    import { Button } from '$lib/components/ui/button'
    import RotateCcw from '@lucide/svelte/icons/rotate-ccw'
    import BadgeList from '$lib/components/BadgeList.svelte'

    let { key, list }: { key: keyof Playback; list: Frequent[] } = $props()

    function padSpeed(value: number | string, decimalPlace: number = 3): string {
        const parsedValue = parseFloat(value.toString())
        if (isNaN(parsedValue)) return value.toString()

        // Use toFixed to ensure we get the exact number of decimal places
        return parsedValue.toFixed(decimalPlace)
    }

    function validateInput(value: string): number {
        const parsedValue = parseFloat(value)
        if (isNaN(parsedValue))
            return $playbackStore[type][key as keyof (typeof $playbackStore)[typeof type]] as number

        if (key == 'semitone') return Math.max(-24, Math.min(24, parsedValue))

        return Math.max(0.25, Math.min(4, parsedValue))
    }

    async function handleInput(event: Event) {
        const input = event.target as HTMLInputElement
        const value = validateInput(input.value)
        const type = $playbackStore.is_default ? 'default' : 'track'

        await playbackStore.updatePlayback({
            [type]: {
                ...$playbackStore[type],
                [key]: Number(value)
            }
        })

        // Add the new value to frequents
        await playbackStore.addFrequentValue(key, value)
        playbackStore.dispatchPlaybackSettings($playbackStore[type])
    }

    async function handleBadgeSelect({ key, value }: { key: string; value: number }) {
        const type = $playbackStore.is_default ? 'default' : 'track'
        await playbackStore.updatePlayback({
            [type]: { ...$playbackStore[type], [key]: value }
        })
        playbackStore.dispatchPlaybackSettings($playbackStore[type])
    }

    function getTitle(key: string) {
        if (key == 'semitone') return `key (-24 to 24)`
        return `${key} (0.25 to 4)`
    }

    async function handleReset() {
        const type = $playbackStore.is_default ? 'default' : 'track'
        const value = defaultPlayback[key as keyof typeof defaultPlayback]
        await playbackStore.updatePlayback({
            [type]: { ...$playbackStore[type], [key]: value }
        })
        playbackStore.dispatchPlaybackSettings($playbackStore[type])
    }

    async function handlePin(value: Frequent) {
        await playbackStore.togglePin(key, value.value)
    }

    let type: 'default' | 'track' = $derived($playbackStore.is_default ? 'default' : 'track')
    let value: number = $derived(
        $playbackStore[type][key as keyof (typeof $playbackStore)[typeof type]] as number
    )
</script>

<div class="flex w-full flex-col space-y-1.5">
    <h2 class="text-sm text-gray-400">{getTitle(key)}</h2>
    <BadgeList
        {list}
        {handlePin}
        handleSelect={(value: number) => handleBadgeSelect({ key, value })}
    />

    <div class="flex w-full items-center justify-between">
        <div class="flex flex-col items-center gap-y-1.5">
            <div class="flex h-6 w-full items-center justify-between gap-x-1.5">
                <Button
                    size="icon"
                    variant="ghost"
                    class="size-5 w-6 rounded-none [&_svg]:size-4"
                    onclick={handleReset}
                >
                    <RotateCcw class="size-4" />
                </Button>

                <div class="flex h-6 w-full items-center">
                    <Label
                        for={key}
                        class="h-6 w-full border-none bg-zinc-700 pb-[0.125rem] text-center text-base font-bold lowercase leading-5"
                        >{key == 'semitone' ? 'key' : key}</Label
                    >
                    <Input
                        value={padSpeed(value)}
                        onchange={handleInput}
                        id={key}
                        class="h-6 w-full rounded-none border border-none border-zinc-200 bg-green-700 px-1 text-end text-base font-bold text-white outline-white"
                    />
                </div>
            </div>
        </div>
    </div>
</div>
