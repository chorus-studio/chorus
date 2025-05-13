<script lang="ts">
    import { onDestroy } from 'svelte'
    import { trackObserver } from '$lib/observers/track'
    import { nowPlaying } from '$lib/stores/now-playing'
    import type { AutoSkipKey, AutoSkipBoolean } from '$lib/stores/config'
    import { configStore, ARTIST_KEYWORDS, TITLE_KEYWORDS } from '$lib/stores/config'

    import X from '@lucide/svelte/icons/x'
    import { Badge } from '$lib/components/ui/badge'
    import { Label } from '$lib/components/ui/label'
    import { Input } from '$lib/components/ui/input'
    import { Switch } from '$lib/components/ui/switch'

    let titleKeywordInput = $state('')
    let artistKeywordInput = $state('')

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

    const matchExplainers = {
        case_sensitive: 'Matches the case of the words (e.g., "remix" ≠ "Remix")',
        match_whole_words: 'Matches the entire word (e.g., "remix" ≠ "re")',
        match_exact_words: 'Matches the exact word (e.g., "remix" ≠ "remixing")'
    }

    onDestroy(() => {
        titleKeywordInput = ''
        artistKeywordInput = ''
    })
</script>

<div class="flex flex-col gap-4">
    <h2 class="w-full rounded-md bg-muted p-4 text-xl font-medium">
        Enter keywords to be used for auto-skipping tracks based on matching song title and/or
        artists.
    </h2>
    <div class="flex w-full items-center justify-between gap-2 rounded-md bg-muted p-4">
        <div class="flex w-full flex-col justify-between gap-y-1">
            <Label for="auto-skip-switch" class="w-full text-base font-medium">
                Enable Auto-Skip
            </Label>
            <span class="text-sm text-muted-foreground">Toggle auto-skipping on/off</span>
        </div>
        <Switch
            id="auto-skip-switch"
            checked={$configStore.auto_skip.enabled}
            onCheckedChange={toggleAutoSkipEnabled}
        />
    </div>
    {#each ['case_sensitive', 'match_whole_words', 'match_exact_words'] as option}
        <div class="flex w-full items-center justify-between gap-2 rounded-md bg-muted p-4">
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
            class="flex flex-col items-center justify-between gap-2 gap-y-4 rounded-md bg-muted p-4"
        >
            <div class="flex w-full justify-between gap-2">
                <div class="flex w-full flex-col justify-between gap-y-1">
                    <Label for={key} class="w-full text-base font-medium"
                        >{key === TITLE_KEYWORDS ? 'Title' : 'Artists'} Keywords</Label
                    >
                    <span class="text-sm text-muted-foreground">Press ENTER key to submit</span>
                </div>
                <Input
                    id={key}
                    autocomplete="off"
                    class="w-full border-white"
                    placeholder={key === TITLE_KEYWORDS ? 'remix' : 'playboi carti'}
                    value={key === TITLE_KEYWORDS ? titleKeywordInput : artistKeywordInput}
                    oninput={(event) => {
                        const target = event.target as HTMLInputElement
                        if (key === TITLE_KEYWORDS) {
                            titleKeywordInput = target.value
                        } else {
                            artistKeywordInput = target.value
                        }
                    }}
                    onkeydown={(event) => handleKeywordInput({ event, key: key as AutoSkipKey })}
                />
            </div>
            <div class="flex w-full flex-wrap gap-2">
                {#each $configStore.auto_skip[key as AutoSkipKey] as keyword}
                    <Badge
                        variant="destructive"
                        data-key={key}
                        data-preset={keyword}
                        onclick={() => removeKeyword({ keyword, key: key as AutoSkipKey })}
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
