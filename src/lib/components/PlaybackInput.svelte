<script lang="ts">
    import { padSpeed, validateSpeed, getTitle } from '$lib/utils/speed'
    import { defaultPlayback, playbackStore } from '$lib/stores/playback'
    import type { Rate, Playback, Frequent } from '$lib/stores/playback'

    import { Label } from '$lib/components/ui/label'
    import { Input } from '$lib/components/ui/input'
    import { Switch } from '$lib/components/ui/switch'
    import { Button } from '$lib/components/ui/button'
    import RotateCcw from '@lucide/svelte/icons/rotate-ccw'
    import BadgeList from '$lib/components/BadgeList.svelte'

    let { key, list }: { key: keyof Playback; list: Frequent[] } = $props()

    async function handleInput(event: Event) {
        const input = event.target as HTMLInputElement
        const type = $playbackStore.is_default ? 'default' : 'track'
        const current = $playbackStore[type][
            key as keyof (typeof $playbackStore)[typeof type]
        ] as number
        const value = validateSpeed({ value: input.value, key, current })
        const updateValue =
            key == 'rate' ? { [key]: { ...$playbackStore[type][key], value } } : { [key]: value }
        await playbackStore.updatePlayback({
            [type]: { ...$playbackStore[type], ...updateValue }
        })

        // Add the new value to frequents
        await playbackStore.addFrequentValue(key, value)
        playbackStore.dispatchPlaybackSettings($playbackStore[type])
    }

    async function handleBadgeSelect({ key, value }: { key: string; value: number }) {
        const type = $playbackStore.is_default ? 'default' : 'track'
        const updateValue =
            key == 'rate' ? { [key]: { ...$playbackStore[type][key], value } } : { [key]: value }
        await playbackStore.updatePlayback({
            [type]: { ...$playbackStore[type], ...updateValue }
        })
        playbackStore.dispatchPlaybackSettings($playbackStore[type])
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

    async function handlePitchPreservation(value: boolean) {
        const type = $playbackStore.is_default ? 'default' : 'track'

        await playbackStore.updatePlayback({
            [type]: {
                ...$playbackStore[type],
                [key]: {
                    preserves_pitch: value,
                    value: ($playbackStore[type][key] as Rate).value ?? 1
                }
            }
        })
        playbackStore.dispatchPlaybackSettings($playbackStore[type])
    }

    let type: 'default' | 'track' = $derived($playbackStore.is_default ? 'default' : 'track')
    let value: number = $derived(
        key == 'rate'
            ? ($playbackStore[type][key] as Rate).value
            : ($playbackStore[type][key] as number)
    )
    let preservesPitch: boolean = $derived($playbackStore[type].rate.preserves_pitch)
</script>

<div class="flex w-full flex-col space-y-2">
    <div class="flex items-center {key == 'rate' ? 'justify-between' : 'justify-start'}">
        <h2 class="text-sm text-gray-400">{getTitle(key)}</h2>
        {#if key == 'rate'}
            <Switch checked={preservesPitch} onCheckedChange={handlePitchPreservation} />
        {/if}
    </div>
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
                    class="size-6 w-7 rounded-none [&_svg]:size-4"
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
                        id={key}
                        onchange={handleInput}
                        value={padSpeed({ value, key })}
                        class="h-6 w-full rounded-none border border-none border-zinc-200 bg-green-700 px-1 text-end text-base font-bold text-white outline-white"
                    />
                </div>
            </div>
        </div>
    </div>
</div>
