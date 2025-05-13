<script lang="ts">
    import { configStore } from '$lib/stores/config'
    import X from '@lucide/svelte/icons/x'
    import { Badge } from '$lib/components/ui/badge'
    import { Button } from '$lib/components/ui/button'

    import {
        spotifyPresets,
        customPresets as eqPresets
    } from '$lib/audio-effects/equalizer/presets'
    import {
        roomPresets,
        impulsePresets,
        customPresets as reverbPresets
    } from '$lib/audio-effects/reverb/presets'

    async function updateFilterList(event: MouseEvent) {
        event.preventDefault()
        event.stopPropagation()

        const target = event.target as HTMLButtonElement
        const key = target.dataset.key
        const preset = target.dataset.preset

        if (!key || !preset) return

        await configStore.updateConfig({
            fx_eq_presets: {
                ...$configStore.fx_eq_presets,
                [key]: [
                    ...$configStore.fx_eq_presets[key as keyof typeof $configStore.fx_eq_presets],
                    preset
                ]
            }
        })
    }

    async function undo(event: MouseEvent) {
        event.preventDefault()
        event.stopPropagation()

        const target = event.target as HTMLButtonElement
        const key = target!.dataset!.key as keyof typeof $configStore.fx_eq_presets

        await configStore.updateConfig({
            fx_eq_presets: {
                ...$configStore.fx_eq_presets,
                [key]: [
                    ...$configStore.fx_eq_presets[
                        key as keyof typeof $configStore.fx_eq_presets
                    ].slice(0, -1)
                ]
            }
        })
    }

    async function resetAll(event: MouseEvent) {
        const target = event.target as HTMLButtonElement
        const key = target.dataset.key as keyof typeof $configStore.fx_eq_presets

        await configStore.updateConfig({
            fx_eq_presets: { ...$configStore.fx_eq_presets, [key]: [] }
        })
    }

    let filteredPresets = $state({
        spotify_eq: spotifyPresets.filter(
            (preset) => !$configStore.fx_eq_presets.spotify_eq_presets.includes(preset)
        ),
        custom_eq: eqPresets.filter(
            (preset) => !$configStore.fx_eq_presets.custom_eq_presets.includes(preset)
        ),
        room_reverb: roomPresets.filter(
            (preset) => !$configStore.fx_eq_presets.room_reverb_presets.includes(preset)
        ),
        custom_reverb: [...impulsePresets, ...reverbPresets].filter(
            (preset) => !$configStore.fx_eq_presets.custom_reverb_presets.includes(preset)
        )
    })

    $effect(() => {
        filteredPresets = {
            spotify_eq: spotifyPresets.filter(
                (preset) => !$configStore.fx_eq_presets.spotify_eq_presets.includes(preset)
            ),
            custom_eq: eqPresets.filter(
                (preset) => !$configStore.fx_eq_presets.custom_eq_presets.includes(preset)
            ),
            room_reverb: roomPresets.filter(
                (preset) => !$configStore.fx_eq_presets.room_reverb_presets.includes(preset)
            ),
            custom_reverb: [...impulsePresets, ...reverbPresets].filter(
                (preset) => !$configStore.fx_eq_presets.custom_reverb_presets.includes(preset)
            )
        }
    })
</script>

<div class="flex flex-col gap-4">
    <div class="flex w-full flex-col gap-2 rounded-md bg-muted p-4">
        <div class="flex w-full justify-between">
            <div class="flex w-full flex-col justify-between gap-y-1">
                <p class="w-full text-lg font-medium">filter down spotify eq list</p>
                <span class="text-sm text-muted-foreground"
                    >click on badge to remove from fxfq select list</span
                >
            </div>
            <div class="flex w-full justify-end gap-2">
                <Button
                    disabled={!$configStore.fx_eq_presets.spotify_eq_presets.length}
                    data-key="spotify_eq_presets"
                    onclick={undo}
                    variant="outline"
                    class="hover:bg-black/20"
                    size="sm">undo</Button
                >
                <Button
                    data-key="spotify_eq_presets"
                    onclick={resetAll}
                    variant="outline"
                    disabled={!$configStore.fx_eq_presets.spotify_eq_presets.length}
                    class="hover:bg-black/20"
                    size="sm">reset all</Button
                >
            </div>
        </div>
        <div class="flex w-full flex-wrap gap-2">
            {#each filteredPresets.spotify_eq as preset}
                <Badge
                    variant="destructive"
                    data-key="spotify_eq_presets"
                    data-preset={preset}
                    onclick={updateFilterList}
                    class="relative cursor-pointer rounded-[4px] bg-red-900 py-1 pr-5 hover:bg-red-700"
                    >{preset}

                    <X
                        class="absolute right-[2px] top-[2px] size-3 rounded-full bg-transparent stroke-white"
                    />
                </Badge>
            {/each}
        </div>
    </div>

    <div class="flex w-full flex-col gap-2 rounded-md bg-muted p-4">
        <div class="flex w-full justify-between gap-2">
            <p class="w-full text-lg font-medium">filter down custom eq list</p>
            <div class="flex justify-end gap-2">
                <Button
                    data-key="custom_eq_presets"
                    onclick={undo}
                    disabled={!$configStore.fx_eq_presets.custom_eq_presets.length}
                    variant="outline"
                    class="hover:bg-black/20"
                    size="sm">undo</Button
                >
                <Button
                    data-key="custom_eq_presets"
                    onclick={resetAll}
                    variant="outline"
                    disabled={!$configStore.fx_eq_presets.custom_eq_presets.length}
                    class="hover:bg-black/20"
                    size="sm">reset all</Button
                >
            </div>
        </div>
        <div class="flex w-full flex-wrap gap-1">
            {#each filteredPresets.custom_eq as preset}
                <Badge
                    variant="destructive"
                    data-preset={preset}
                    data-key="custom_eq_presets"
                    onclick={updateFilterList}
                    class="relative cursor-pointer rounded-[4px] bg-red-900 py-1 pr-5 hover:bg-red-700"
                    >{preset}
                    <X class="absolute right-[2px] top-[2px] size-3 rounded-full stroke-white" />
                </Badge>
            {/each}
        </div>
    </div>

    <div class="flex w-full flex-col gap-2 rounded-md bg-muted p-4">
        <div class="flex w-full justify-between gap-2">
            <p class="w-full text-lg font-medium">filter down room reverb list</p>
            <div class="flex justify-end gap-2">
                <Button
                    data-key="room_reverb_presets"
                    onclick={undo}
                    disabled={!$configStore.fx_eq_presets.room_reverb_presets.length}
                    variant="outline"
                    class="hover:bg-black/20"
                    size="sm">undo</Button
                >
                <Button
                    data-key="room_reverb_presets"
                    onclick={resetAll}
                    variant="outline"
                    disabled={!$configStore.fx_eq_presets.room_reverb_presets.length}
                    class="hover:bg-black/20"
                    size="sm">reset all</Button
                >
            </div>
        </div>
        <div class="flex w-full flex-wrap gap-2">
            {#each filteredPresets.room_reverb as preset}
                <Badge
                    variant="destructive"
                    data-preset={preset}
                    data-key="room_reverb_presets"
                    onclick={updateFilterList}
                    class="relative cursor-pointer rounded-[4px] bg-red-900 py-1 pr-5 hover:bg-red-700"
                    >{preset}
                    <X class="absolute right-[2px] top-[2px] size-3 rounded-full stroke-white" />
                </Badge>
            {/each}
        </div>
    </div>

    <div class="flex w-full flex-col gap-2 rounded-md bg-muted p-4">
        <div class="flex w-full justify-between gap-2">
            <p class="w-full text-lg font-medium">filter down custom reverb list</p>
            <div class="flex justify-end gap-2">
                <Button
                    data-key="custom_reverb_presets"
                    onclick={undo}
                    disabled={!$configStore.fx_eq_presets.custom_reverb_presets.length}
                    variant="outline"
                    class="hover:bg-black/20"
                    size="sm">undo</Button
                >
                <Button
                    data-key="custom_reverb_presets"
                    onclick={resetAll}
                    variant="outline"
                    disabled={!$configStore.fx_eq_presets.custom_reverb_presets.length}
                    class="hover:bg-black/20"
                    size="sm">reset all</Button
                >
            </div>
        </div>
        <div class="flex w-full flex-wrap gap-2">
            {#each filteredPresets.custom_reverb as preset}
                <Badge
                    variant="destructive"
                    data-preset={preset}
                    data-key="custom_reverb_presets"
                    onclick={updateFilterList}
                    class="relative cursor-pointer rounded-[4px] bg-red-900 py-1 pr-5 hover:bg-red-700"
                    >{preset}
                    <X class="absolute right-[2px] top-[2px] size-3 rounded-full stroke-white" />
                </Badge>
            {/each}
        </div>
    </div>
</div>
