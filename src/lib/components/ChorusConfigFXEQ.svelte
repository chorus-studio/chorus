<script lang="ts">
    import Check from '@lucide/svelte/icons/check'
    import Search from '@lucide/svelte/icons/search'
    import { configStore } from '$lib/stores/config'
    import { Button } from '$lib/components/ui/button'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'
    import X from '@lucide/svelte/icons/x'
    import { presetBindingsStore } from '$lib/stores/preset-bindings'
    import { cn } from '$lib/utils.js'

    import {
        spotifyPresets,
        customPresets as eqPresets
    } from '$lib/audio-effects/equalizer/presets'
    import {
        roomPresets,
        impulsePresets,
        customPresets as reverbPresets
    } from '$lib/audio-effects/reverb/presets'
    import {
        QUICK_PRESETS,
        QUICK_PRESET_GROUPS,
        sectionsOf
    } from '$lib/audio-effects/quick-presets'

    type HiddenKey = keyof typeof $configStore.fx_eq_presets
    type Section = { title?: string; presets: string[] }
    // `labels` maps a stored id to its display name where the two differ (quick presets).
    type Group = {
        key: HiddenKey
        title: string
        sections: Section[]
        labels?: Record<string, string>
    }

    // One checklist per picker, alphabetical so a name is quick to find.
    const alphabetical = (list: string[]) =>
        [...list].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))

    const GROUPS: Group[] = [
        {
            key: 'spotify_eq_presets',
            title: 'Spotify EQ',
            sections: [{ presets: alphabetical(spotifyPresets) }]
        },
        {
            key: 'custom_eq_presets',
            title: 'Custom EQ',
            sections: [{ presets: alphabetical(eqPresets) }]
        },
        {
            key: 'room_reverb_presets',
            title: 'Room reverb',
            sections: [{ presets: alphabetical(roomPresets) }]
        },
        {
            key: 'custom_reverb_presets',
            title: 'Custom reverb',
            sections: [
                { title: 'Impulse responses', presets: alphabetical(impulsePresets) },
                { title: 'Algorithmic', presets: alphabetical(reverbPresets) }
            ]
        },
        {
            key: 'quick_presets',
            title: 'Quick presets',
            labels: Object.fromEntries(QUICK_PRESETS.map((p) => [p.id, p.name])),
            sections: QUICK_PRESET_GROUPS.flatMap((g) =>
                sectionsOf(g.id).map((s) => ({
                    title: s.title ? `${g.label} · ${s.title}` : g.label,
                    presets: s.presets.map((p) => p.id)
                }))
            )
        }
    ]

    const presetsOf = (group: Group) => group.sections.flatMap((s) => s.presets)
    // Only names the picker still offers count; stale entries in storage are ignored.
    const hiddenIn = (group: Group) => {
        const hidden = $configStore.fx_eq_presets[group.key]
        return presetsOf(group).filter((p) => hidden.includes(p)).length
    }

    let activeKey = $state<HiddenKey>('spotify_eq_presets')
    let query = $state('')

    const group = $derived(GROUPS.find((g) => g.key === activeKey) ?? GROUPS[0])
    const hidden = $derived($configStore.fx_eq_presets[group.key])
    const total = $derived(presetsOf(group).length)
    const hiddenCount = $derived(hiddenIn(group))
    const hiddenEverywhere = $derived(GROUPS.reduce((n, g) => n + hiddenIn(g), 0))

    const labelOf = (preset: string) => group.labels?.[preset] ?? preset

    const needle = $derived(query.trim().toLowerCase())
    const sections = $derived(
        group.sections
            .map((s) => ({
                ...s,
                presets: needle
                    ? s.presets.filter((p) => labelOf(p).toLowerCase().includes(needle))
                    : s.presets
            }))
            .filter((s) => s.presets.length > 0)
    )

    const options = $derived(
        GROUPS.map((g) => {
            const all = presetsOf(g).length
            const shown = all - hiddenIn(g)
            return {
                label: g.title,
                value: g.key,
                hint: shown === all ? `${all}` : `${shown}/${all}`
            }
        })
    )

    async function setHidden(key: HiddenKey, next: string[]) {
        await configStore.updateConfig({
            fx_eq_presets: { ...$configStore.fx_eq_presets, [key]: next }
        })
    }

    async function setShown(preset: string, shown: boolean) {
        const current = $configStore.fx_eq_presets[group.key]
        if (shown)
            return setHidden(
                group.key,
                current.filter((p) => p !== preset)
            )
        if (!current.includes(preset)) await setHidden(group.key, [...current, preset])
    }

    const showAll = () => setHidden(group.key, [])
    const hideAll = () => setHidden(group.key, presetsOf(group))

    async function showEverywhere() {
        const cleared = Object.fromEntries(GROUPS.map((g) => [g.key, []]))
        await configStore.updateConfig({
            fx_eq_presets: { ...$configStore.fx_eq_presets, ...cleared }
        })
    }
</script>

<div class="flex flex-col gap-y-3">
    <div class="flex items-end justify-between gap-x-4">
        <div class="flex flex-col gap-y-0.5">
            <span class="text-[13px] font-medium text-ink-fg">Trim the preset pickers</span>
            <span class="text-xs text-ink-muted">
                Untick a preset to hide it from the Reverb and EQ pickers or the Presets tab.
                Nothing is deleted; bring it back any time.
            </span>
        </div>
        <label class="relative w-48 shrink-0">
            <Search
                class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-dim"
            />
            <input
                type="search"
                placeholder="Filter presets"
                aria-label="Filter presets"
                bind:value={query}
                class="flex h-7 w-full rounded-md border border-hairline bg-inset pl-8 pr-3 text-xs text-ink-fg placeholder:text-dim hover:border-hairline-strong focus-visible:border-signal/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/30"
            />
        </label>
    </div>

    <SegmentedControl
        class="self-start"
        ariaLabel="Preset picker"
        value={activeKey}
        onValueChange={(v) => (activeKey = v as HiddenKey)}
        {options}
    />

    <div class="flex flex-col gap-y-2.5 rounded-lg border border-hairline bg-panel px-3.5 py-3">
        <div class="flex items-center justify-between gap-x-2">
            <span class="flex items-baseline gap-x-2 text-[13px] font-medium text-ink-fg">
                {group.title}
                <span class="text-[11px] font-normal text-ink-muted">
                    {total - hiddenCount} of {total} shown
                </span>
            </span>
            <span class="flex items-center gap-x-0.5">
                <Button variant="ghost" size="xs" disabled={hiddenCount === 0} onclick={showAll}>
                    Show all
                </Button>
                <Button
                    variant="ghost"
                    size="xs"
                    disabled={hiddenCount === total}
                    onclick={hideAll}
                >
                    Hide all
                </Button>
            </span>
        </div>

        {#if sections.length === 0}
            <span class="py-6 text-center text-xs text-ink-muted">
                No presets match “{query.trim()}”
            </span>
        {/if}

        {#each sections as section (section.title ?? group.key)}
            {#if section.title}
                <span class="rack-label mt-0.5">{section.title} · {section.presets.length}</span>
            {/if}
            <div class="grid grid-cols-5 gap-x-3">
                {#each section.presets as preset (preset)}
                    {@const shown = !hidden.includes(preset)}
                    <label
                        class={cn(
                            'group flex h-6 min-w-0 cursor-pointer items-center gap-x-2 text-xs transition-colors hover:text-ink-fg',
                            shown ? 'text-ink-fg-2' : 'text-ink-muted'
                        )}
                    >
                        <input
                            type="checkbox"
                            checked={shown}
                            data-key={group.key}
                            data-preset={preset}
                            onchange={(e) => setShown(preset, e.currentTarget.checked)}
                            class="peer sr-only"
                        />
                        <span
                            aria-hidden="true"
                            class={cn(
                                'inline-flex size-3.5 shrink-0 items-center justify-center rounded-[3px] transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-signal peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-panel',
                                shown
                                    ? 'bg-signal text-ink'
                                    : 'border-[1.5px] border-hairline-strong group-hover:border-ink-muted'
                            )}
                        >
                            {#if shown}
                                <Check class="size-2.5" strokeWidth={3.5} />
                            {/if}
                        </span>
                        <span class="truncate">{labelOf(preset)}</span>
                    </label>
                {/each}
            </div>
        {/each}
    </div>

    <div class="flex items-center justify-between text-[11px] text-ink-muted">
        <span>
            {hiddenEverywhere ? `${hiddenEverywhere} hidden across all pickers` : 'Nothing hidden'}
        </span>
        <Button
            variant="ghost"
            size="xs"
            disabled={hiddenEverywhere === 0}
            onclick={showEverywhere}
        >
            Show everything
        </Button>
    </div>

    <div class="flex flex-col gap-y-2">
        <span class="rack-label">Presets by artist</span>
        <div class="rounded-lg border border-hairline bg-panel">
            {#if $presetBindingsStore.bindings.length}
                {#each $presetBindingsStore.bindings as binding (binding.key)}
                    <div
                        class="flex items-center justify-between gap-x-4 border-t border-hairline px-4 py-2.5 first:border-t-0"
                    >
                        <span class="flex min-w-0 flex-col gap-y-0.5">
                            <span class="truncate text-[13px] font-medium text-ink-fg"
                                >{binding.name}</span
                            >
                            <span class="truncate text-xs text-ink-muted"
                                >plays with {binding.preset_name}</span
                            >
                        </span>
                        <button
                            type="button"
                            aria-label={`Stop ${binding.preset_name} following ${binding.name}`}
                            onclick={() => presetBindingsStore.unbind(binding.key)}
                            class="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink-fg"
                        >
                            <X class="size-3.5" />
                        </button>
                    </div>
                {/each}
            {:else}
                <p class="px-4 py-3 text-xs text-ink-muted">
                    None yet. Pin the playing preset to an artist with the pin in the Presets tab;
                    their tracks then switch to it by themselves.
                </p>
            {/if}
        </div>
    </div>
</div>
