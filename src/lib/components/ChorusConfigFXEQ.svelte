<script lang="ts">
    import { configStore } from '$lib/stores/config'
    import Undo2 from '@lucide/svelte/icons/undo-2'
    import { Button } from '$lib/components/ui/button'
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

    type HiddenKey = keyof typeof $configStore.fx_eq_presets

    const GROUPS: Array<{ key: HiddenKey; title: string; presets: string[] }> = [
        { key: 'spotify_eq_presets', title: 'Spotify EQ', presets: spotifyPresets },
        { key: 'custom_eq_presets', title: 'Custom EQ', presets: eqPresets },
        { key: 'room_reverb_presets', title: 'Room reverb', presets: roomPresets },
        {
            key: 'custom_reverb_presets',
            title: 'Custom reverb',
            presets: [...impulsePresets, ...reverbPresets]
        }
    ]

    async function setHidden(key: HiddenKey, hidden: string[]) {
        await configStore.updateConfig({
            fx_eq_presets: { ...$configStore.fx_eq_presets, [key]: hidden }
        })
    }

    async function toggle(key: HiddenKey, preset: string) {
        const hidden = $configStore.fx_eq_presets[key]
        await setHidden(
            key,
            hidden.includes(preset) ? hidden.filter((p) => p !== preset) : [...hidden, preset]
        )
    }

    async function undo(key: HiddenKey) {
        await setHidden(key, $configStore.fx_eq_presets[key].slice(0, -1))
    }

    async function showAll(key: HiddenKey) {
        await setHidden(key, [])
    }
</script>

<div class="flex flex-col gap-y-3.5">
    <div class="flex flex-col gap-y-0.5">
        <span class="text-[13px] font-medium text-ink-fg">Trim the preset pickers</span>
        <span class="text-xs text-ink-muted">
            Click a preset to hide it from the Reverb and EQ pickers. Hidden presets are dimmed here
            and can be shown again at any time.
        </span>
    </div>

    <div class="grid grid-cols-2 gap-3">
        {#each GROUPS as group (group.key)}
            {@const hidden = $configStore.fx_eq_presets[group.key]}
            <div
                class="flex flex-col gap-y-2.5 rounded-lg border border-hairline bg-panel px-3.5 py-3"
            >
                <div class="flex items-center justify-between gap-x-2">
                    <span class="flex items-baseline gap-x-2 text-[13px] font-medium text-ink-fg">
                        {group.title}
                        <span class="text-[11px] font-normal text-ink-muted">
                            {hidden.length ? `${hidden.length} hidden` : 'none hidden'}
                        </span>
                    </span>
                    <span class="flex items-center gap-x-0.5">
                        <Button
                            variant="ghost"
                            size="xs"
                            disabled={!hidden.length}
                            onclick={() => undo(group.key)}
                        >
                            <Undo2 class="size-3" />
                            Undo
                        </Button>
                        <Button
                            variant="ghost"
                            size="xs"
                            disabled={!hidden.length}
                            onclick={() => showAll(group.key)}
                        >
                            Show all
                        </Button>
                    </span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                    {#each group.presets as preset (preset)}
                        {@const isHidden = hidden.includes(preset)}
                        <button
                            type="button"
                            data-key={group.key}
                            data-preset={preset}
                            aria-pressed={isHidden}
                            title={isHidden ? 'Show in pickers' : 'Hide from pickers'}
                            onclick={() => toggle(group.key, preset)}
                            class={cn(
                                'inline-flex h-[26px] items-center rounded-md border px-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60',
                                isHidden
                                    ? 'border-dashed border-hairline-strong bg-transparent text-ink-dim line-through hover:text-ink-muted'
                                    : 'border-hairline bg-surface text-ink-fg hover:border-hairline-strong'
                            )}
                        >
                            {preset}
                        </button>
                    {/each}
                </div>
            </div>
        {/each}
    </div>
</div>
