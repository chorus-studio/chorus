<script lang="ts">
    import { trackObserver } from '$lib/observers/track'
    import { nowPlaying } from '$lib/stores/now-playing'
    import type { AutoSkipKey, AutoSkipBoolean } from '$lib/stores/config'
    import { configStore, ARTIST_KEYWORDS, TITLE_KEYWORDS } from '$lib/stores/config'

    import X from '@lucide/svelte/icons/x'
    import * as Tabs from '$lib/components/ui/tabs'
    import { Badge } from '$lib/components/ui/badge'
    import { Label } from '$lib/components/ui/label'
    import { Input } from '$lib/components/ui/input'
    import Tippy from '$lib/components/Tippy.svelte'
    import { Button } from '$lib/components/ui/button'
    import { Switch } from '$lib/components/ui/switch'
    import * as Dialog from '$lib/components/ui/dialog'
    import { Separator } from '$lib/components/ui/separator'
    import Settings2 from '@lucide/svelte/icons/settings-2'

    import {
        spotifyPresets,
        customPresets as eqPresets
    } from '$lib/audio-effects/equalizer/presets'
    import {
        roomPresets,
        impulsePresets,
        customPresets as reverbPresets
    } from '$lib/audio-effects/reverb/presets'

    let activeTab = $state('auto-skip')
    let titleKeywordInput = $state('')
    let artistKeywordInput = $state('')

    async function updateFilterList(event: MouseEvent) {
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

    async function updateKeyWordList({
        key,
        keyword,
        action
    }: {
        keyword: string
        key: AutoSkipKey
        action: 'add' | 'remove'
    }) {
        const currentList = $configStore.auto_skip![key]
        const updatedList =
            action === 'add' ? [...currentList, keyword] : currentList.filter((k) => k !== keyword)
        await configStore.updateConfig({
            auto_skip: { ...$configStore.auto_skip, [key]: updatedList }
        })
    }

    async function handleKeywordInput({ event, key }: { event: KeyboardEvent; key: AutoSkipKey }) {
        if (event.key !== 'Enter') return
        const trimmedKeyword =
            key === TITLE_KEYWORDS ? titleKeywordInput.trim() : artistKeywordInput.trim()
        if (!trimmedKeyword?.length) return

        await updateKeyWordList({ keyword: trimmedKeyword, action: 'add', key })
        if (key === TITLE_KEYWORDS) {
            titleKeywordInput = ''
        } else {
            artistKeywordInput = ''
        }
    }

    async function removeKeyword({ key, keyword }: { keyword: string; key: AutoSkipKey }) {
        await updateKeyWordList({ keyword, action: 'remove', key })
    }

    async function toggleAutoSkipEnabled(enabled: boolean) {
        await configStore.updateConfig({
            auto_skip: { ...$configStore.auto_skip, enabled }
        })

        const shouldSkip = configStore.checkIfTrackShouldBeSkipped({
            title: $nowPlaying.title ?? '',
            artist: $nowPlaying.artist ?? ''
        })

        if (shouldSkip) trackObserver.skipTrack()
    }

    async function toggleAutoSkipOptions({
        key,
        checked
    }: {
        key: AutoSkipBoolean
        checked: boolean
    }) {
        await configStore.updateConfig({
            auto_skip: { ...$configStore.auto_skip, [key]: checked }
        })
    }

    async function undo(event: MouseEvent) {
        const target = event.target as HTMLButtonElement
        const key = target!.dataset!.key as keyof typeof $configStore.fx_eq_presets

        await configStore.updateConfig({
            fx_eq_presets: {
                ...$configStore.fx_eq_presets,
                [key]: $configStore.fx_eq_presets[
                    key as keyof typeof $configStore.fx_eq_presets
                ].slice(0, -1)
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

    const matchExplainers = {
        case_sensitive: 'Matches the case of the words (e.g., "remix" ≠ "Remix")',
        match_whole_words: 'Matches the entire word (e.g., "remix" ≠ "re")',
        match_exact_words: 'Matches the exact word (e.g., "remix" ≠ "remixing")'
    }

    function onOpenChange(open: boolean) {
        if (open) return
        titleKeywordInput = ''
        artistKeywordInput = ''
    }

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

<Dialog.Root {onOpenChange}>
    <Dialog.Trigger id="chorus-config-dialog-trigger" class="flex items-center justify-center">
        <Tippy text="config" side="bottom" class="size-7 [&_svg]:size-[18px]">
            <Settings2 class="size[18px] mt-0.5" />
        </Tippy>
    </Dialog.Trigger>
    <Dialog.Content
        id="chorus-config-dialog-content"
        class="max-h-[90vh] w-3/4 max-w-3xl overflow-y-auto rounded-md bg-primary-foreground p-8"
    >
        <Dialog.Title>Chorus Config</Dialog.Title>
        <Separator class="h-0.5 w-full" />
        <Tabs.Root bind:value={activeTab}>
            <Tabs.List class="flex w-full justify-between">
                <Tabs.Trigger value="auto-skip" class="w-full">Auto-Skip</Tabs.Trigger>
                <Tabs.Trigger value="fx-eq" class="w-full">FXEQ List</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="auto-skip">
                <div class="flex flex-col gap-4">
                    <h2 class="w-full bg-muted p-4 text-xl font-medium">
                        Enter keywords to be used for auto-skipping tracks based on matching song
                        title and/or artists.
                    </h2>
                    <div class="flex w-full items-center justify-between gap-2 bg-muted p-4">
                        <Label for="auto-skip-switch" class="w-full text-base font-medium"
                            >Enable Auto-Skip</Label
                        >
                        <Switch
                            id="auto-skip-switch"
                            checked={$configStore.auto_skip.enabled}
                            onCheckedChange={toggleAutoSkipEnabled}
                        />
                    </div>
                    {#each ['case_sensitive', 'match_whole_words', 'match_exact_words'] as option}
                        <div class="flex w-full items-center justify-between gap-2 bg-muted p-4">
                            <div class="flex w-full flex-col justify-between gap-y-1">
                                <Label for={option} class="w-full text-base font-medium capitalize"
                                    >{option.split('_').join(' ')}</Label
                                >
                                <span class="text-sm text-muted-foreground"
                                    >{matchExplainers[option as AutoSkipBoolean]}</span
                                >
                            </div>
                            <Switch
                                id={option}
                                data-key={option}
                                checked={$configStore.auto_skip[option as AutoSkipBoolean]}
                                onCheckedChange={(checked) =>
                                    toggleAutoSkipOptions({
                                        key: option as AutoSkipBoolean,
                                        checked
                                    })}
                            />
                        </div>
                    {/each}
                    {#each [TITLE_KEYWORDS, ARTIST_KEYWORDS] as key}
                        <div
                            class="flex flex-col items-center justify-between gap-2 gap-y-4 bg-muted p-4"
                        >
                            <div class="flex w-full justify-between gap-2">
                                <div class="flex w-full flex-col justify-between gap-y-1">
                                    <Label for={key} class="w-full text-base font-medium"
                                        >{key === TITLE_KEYWORDS ? 'Title' : 'Artists'} Keywords</Label
                                    >
                                    <span class="text-sm text-muted-foreground"
                                        >Press ENTER key to submit</span
                                    >
                                </div>
                                <Input
                                    id={key}
                                    autocomplete="off"
                                    class="w-full border-white"
                                    placeholder={key === TITLE_KEYWORDS ? 'remix' : 'playboi carti'}
                                    value={key === TITLE_KEYWORDS
                                        ? titleKeywordInput
                                        : artistKeywordInput}
                                    oninput={(event) => {
                                        const target = event.target as HTMLInputElement
                                        if (key === TITLE_KEYWORDS) {
                                            titleKeywordInput = target.value
                                        } else {
                                            artistKeywordInput = target.value
                                        }
                                    }}
                                    onkeydown={(event) =>
                                        handleKeywordInput({ event, key: key as AutoSkipKey })}
                                />
                            </div>
                            <div class="flex w-full flex-wrap gap-2">
                                {#each $configStore.auto_skip[key as AutoSkipKey] as keyword}
                                    <Badge
                                        variant="destructive"
                                        data-key={key}
                                        data-preset={keyword}
                                        onclick={() =>
                                            removeKeyword({ keyword, key: key as AutoSkipKey })}
                                        class="relative cursor-pointer rounded-[4px] bg-red-900 py-1 pr-5 hover:bg-red-700"
                                        >{keyword}

                                        <X
                                            class="absolute right-[2px] top-[2px] size-3 rounded-full bg-transparent stroke-white"
                                        />
                                    </Badge>
                                {/each}
                            </div>
                        </div>
                    {/each}
                </div>
            </Tabs.Content>
            <Tabs.Content value="fx-eq">
                <div class="flex flex-col gap-4">
                    <div class="flex w-full flex-col gap-2 bg-muted p-4">
                        <div class="flex w-full justify-between">
                            <p class="w-full text-lg font-medium">filter down spotify eq list</p>
                            <div class="flex w-full justify-end gap-2">
                                <Button
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
                                        data-key="spotify_eq_presets"
                                        data-preset={preset}
                                        onclick={updateFilterList}
                                        class="absolute right-[2px] top-[2px] size-3 rounded-full bg-transparent stroke-white"
                                    />
                                </Badge>
                            {/each}
                        </div>
                    </div>

                    <div class="flex w-full flex-col gap-2 bg-muted p-4">
                        <div class="flex w-full justify-between gap-2">
                            <p class="w-full text-lg font-medium">filter down custom eq list</p>
                            <div class="flex justify-end gap-2">
                                <Button
                                    data-key="custom_eq_presets"
                                    onclick={undo}
                                    variant="outline"
                                    class="hover:bg-black/20"
                                    size="sm">undo</Button
                                >
                                <Button
                                    data-key="custom_eq_presets"
                                    onclick={resetAll}
                                    variant="outline"
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
                                    <X
                                        class="absolute right-[2px] top-[2px] size-3 rounded-full stroke-white"
                                    />
                                </Badge>
                            {/each}
                        </div>
                    </div>

                    <div class="flex w-full flex-col gap-2 bg-muted p-4">
                        <div class="flex w-full justify-between gap-2">
                            <p class="w-full text-lg font-medium">filter down room reverb list</p>
                            <div class="flex justify-end gap-2">
                                <Button
                                    data-key="room_reverb_presets"
                                    onclick={undo}
                                    variant="outline"
                                    class="hover:bg-black/20"
                                    size="sm">undo</Button
                                >
                                <Button
                                    data-key="room_reverb_presets"
                                    onclick={resetAll}
                                    variant="outline"
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
                                    <X
                                        class="absolute right-[2px] top-[2px] size-3 rounded-full stroke-white"
                                    />
                                </Badge>
                            {/each}
                        </div>
                    </div>

                    <div class="flex w-full flex-col gap-2 bg-muted p-4">
                        <div class="flex w-full justify-between gap-2">
                            <p class="w-full text-lg font-medium">filter down custom reverb list</p>
                            <div class="flex justify-end gap-2">
                                <Button
                                    data-key="custom_reverb_presets"
                                    onclick={undo}
                                    variant="outline"
                                    class="hover:bg-black/20"
                                    size="sm">undo</Button
                                >
                                <Button
                                    data-key="custom_reverb_presets"
                                    onclick={resetAll}
                                    variant="outline"
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

                                    <X
                                        class="absolute right-[2px] top-[2px] size-3 rounded-full stroke-white"
                                    />
                                </Badge>
                            {/each}
                        </div>
                    </div>
                </div>
            </Tabs.Content>
        </Tabs.Root>
    </Dialog.Content>
</Dialog.Root>
