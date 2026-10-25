<script lang="ts">
    import { onDestroy } from 'svelte'
    import { trackObserver } from '$lib/observers/track'
    import { nowPlaying } from '$lib/stores/now-playing'
    import type { AutoSkipKey, AutoSkipBoolean } from '$lib/stores/config'
    import { configStore, ARTIST_KEYWORDS, TITLE_KEYWORDS } from '$lib/stores/config'

    import X from '@lucide/svelte/icons/x'
    import Plus from '@lucide/svelte/icons/plus'
    import { Switch } from '$lib/components/ui/switch'

    let inputs = $state<Record<AutoSkipKey, string>>({ title_keywords: '', artist_keywords: '' })

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
            action === 'add'
                ? currentList.includes(keyword)
                    ? currentList
                    : [...currentList, keyword]
                : currentList.filter((k) => k !== keyword)
        await configStore.updateConfig({
            auto_skip: { ...$configStore.auto_skip, [key]: updatedList }
        })
    }

    async function handleKeywordInput({ event, key }: { event: KeyboardEvent; key: AutoSkipKey }) {
        if (event.key !== 'Enter') return
        const trimmedKeyword = inputs[key].trim()
        if (!trimmedKeyword.length) return

        await updateKeyWordList({ keyword: trimmedKeyword, action: 'add', key })
        inputs[key] = ''
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

    const MATCH_OPTIONS: Array<{ key: AutoSkipBoolean; title: string; hint: string }> = [
        { key: 'case_sensitive', title: 'Case sensitive', hint: '“remix” will not match “Remix”' },
        {
            key: 'match_whole_words',
            title: 'Whole words only',
            hint: '“live” matches “Live at Wembley”, not “Alive”'
        },
        {
            key: 'match_exact_words',
            title: 'Exact match',
            hint: 'The keyword must be the entire title or artist name'
        }
    ]

    const KEYWORD_GROUPS: Array<{
        key: AutoSkipKey
        title: string
        placeholder: string
        hint: string
    }> = [
        {
            key: TITLE_KEYWORDS,
            title: 'Title keywords',
            placeholder: 'Add a keyword and press Enter',
            hint: 'e.g. remix, sped up, live'
        },
        {
            key: ARTIST_KEYWORDS,
            title: 'Artist keywords',
            placeholder: 'Add an artist and press Enter',
            hint: 'Matches any artist on the track'
        }
    ]

    onDestroy(() => {
        inputs = { title_keywords: '', artist_keywords: '' }
    })
</script>

<div class="flex flex-col gap-y-3.5">
    <div class="rounded-lg border border-hairline bg-panel">
        <label class="flex cursor-pointer items-center justify-between gap-x-4 px-4 py-3">
            <span class="flex flex-col gap-y-0.5">
                <span class="text-[13px] font-medium text-ink-fg">Auto-skip matching tracks</span>
                <span class="text-xs text-ink-muted">
                    Skip any track whose title or artist matches one of your keywords. Blocked
                    tracks are always skipped.
                </span>
            </span>
            <Switch
                id="auto-skip-switch"
                aria-label="Auto-skip"
                checked={$configStore.auto_skip.enabled}
                onCheckedChange={toggleAutoSkipEnabled}
            />
        </label>
    </div>

    <div class="flex flex-col gap-y-2">
        <span class="rack-label">Matching</span>
        <div class="rounded-lg border border-hairline bg-panel">
            {#each MATCH_OPTIONS as option (option.key)}
                <label
                    class="flex cursor-pointer items-center justify-between gap-x-4 border-t border-hairline px-4 py-3 first:border-t-0"
                >
                    <span class="flex flex-col gap-y-0.5">
                        <span class="text-[13px] font-medium text-ink-fg">{option.title}</span>
                        <span class="text-xs text-ink-muted">{option.hint}</span>
                    </span>
                    <Switch
                        id={option.key}
                        data-key={option.key}
                        aria-label={option.title}
                        checked={$configStore.auto_skip[option.key]}
                        onCheckedChange={(checked) =>
                            toggleAutoSkipOptions({ key: option.key, checked })}
                    />
                </label>
            {/each}
        </div>
    </div>

    <div class="grid grid-cols-2 gap-x-3.5">
        {#each KEYWORD_GROUPS as group (group.key)}
            <div class="flex flex-col gap-y-2">
                <span class="rack-label">{group.title}</span>
                <div class="flex flex-col gap-y-2.5 rounded-lg border border-hairline bg-panel p-3">
                    <label class="relative block">
                        <Plus
                            class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-dim"
                        />
                        <input
                            id={group.key}
                            autocomplete="off"
                            placeholder={group.placeholder}
                            bind:value={inputs[group.key]}
                            onkeydown={(event) => handleKeywordInput({ event, key: group.key })}
                            class="flex h-8 w-full rounded-md border border-hairline bg-inset pl-8 pr-10 text-[13px] text-ink-fg placeholder:text-dim hover:border-hairline-strong focus-visible:border-signal/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/30"
                        />
                        <kbd
                            class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-hairline-strong bg-surface px-1 font-mono text-[10px] text-ink-muted"
                            >↵</kbd
                        >
                    </label>
                    {#if $configStore.auto_skip[group.key].length}
                        <div class="flex flex-wrap gap-1.5">
                            {#each $configStore.auto_skip[group.key] as keyword (keyword)}
                                <span
                                    data-key={group.key}
                                    data-preset={keyword}
                                    class="inline-flex h-[26px] items-center gap-x-1 rounded-md border border-hairline bg-surface pl-2.5 pr-1 text-xs text-ink-fg"
                                >
                                    {keyword}
                                    <button
                                        type="button"
                                        aria-label={`Remove ${keyword}`}
                                        onclick={() => removeKeyword({ keyword, key: group.key })}
                                        class="inline-flex size-4 items-center justify-center rounded text-ink-muted hover:bg-surface-2 hover:text-ink-fg"
                                    >
                                        <X class="size-3" />
                                    </button>
                                </span>
                            {/each}
                        </div>
                    {:else}
                        <span class="text-[11px] text-ink-dim">No keywords yet · {group.hint}</span>
                    {/if}
                </div>
            </div>
        {/each}
    </div>
</div>
