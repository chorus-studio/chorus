<script lang="ts">
    // The row under the timeline: what the sections mean (Play only them, or
    // Skip them), one chip per section to select it, + to add one at the
    // playhead, and Remove for the selected one.
    import { snipStore } from '$lib/stores/snip'
    import { nowPlaying } from '$lib/stores/now-playing'
    import { placeNewRange, type SnipMode } from '$lib/utils/snip-ranges'
    import { formatSnipTime, round1 } from '$lib/utils/snip-time'
    import { cn } from '$lib/utils.js'

    import X from '@lucide/svelte/icons/x'
    import Play from '@lucide/svelte/icons/play'
    import Plus from '@lucide/svelte/icons/plus'
    import Scissors from '@lucide/svelte/icons/scissors'
    import MicVocal from '@lucide/svelte/icons/mic-vocal'
    import { snipSubView } from '$lib/stores/effects-ui'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'

    const duration = $derived(Math.max($nowPlaying.duration ?? 0, 0))
    const playhead = $derived(round1($nowPlaying.current ?? 0))
    const ranges = $derived($snipStore?.ranges ?? [])
    const selected = $derived($snipStore?.selected ?? 0)
    const canAdd = $derived(placeNewRange(ranges, playhead, duration) !== null)

    function setMode(value: string) {
        snipStore.setMode(value as SnipMode, duration, playhead)
    }

    function add() {
        snipStore.addAt(playhead, duration)
    }
</script>

{#if $snipStore}
    <div class="flex h-6 items-center gap-x-3">
        <div class="flex shrink-0 items-center gap-x-1.5">
            <span class="rack-label">Mode</span>
            <SegmentedControl
                size="xs"
                ariaLabel="What the sections do"
                value={$snipStore.mode}
                onValueChange={setMode}
                options={[
                    { label: 'Play', value: 'play', icon: Play, title: 'Play only these sections' },
                    { label: 'Skip', value: 'skip', icon: Scissors, title: 'Skip these sections' }
                ]}
            />
        </div>

        <div class="flex min-w-0 items-center gap-x-1.5">
            <span class="rack-label">Sections</span>
            <div class="no-scrollbar flex min-w-0 items-center gap-x-1 overflow-x-auto">
                {#each ranges as range, i (i)}
                    {@const active = i === selected}
                    <button
                        type="button"
                        aria-pressed={active}
                        aria-label={`Section ${i + 1}, ${formatSnipTime(range.start)} to ${formatSnipTime(range.end)}`}
                        title={`${formatSnipTime(range.start)} – ${formatSnipTime(range.end)}`}
                        onclick={() => snipStore.select(i)}
                        class={cn(
                            'chorus-focus inline-flex size-5 shrink-0 items-center justify-center rounded font-mono text-[11px] tabular-nums transition-colors',
                            active
                                ? 'bg-signal font-semibold text-signal-fg'
                                : 'bg-surface-2 font-medium text-ink-muted hover:text-ink-fg'
                        )}
                    >
                        {i + 1}
                    </button>
                {/each}
                <button
                    type="button"
                    aria-label="Add a section at the playhead"
                    title={canAdd ? 'Add a section at the playhead' : 'No room for another section'}
                    disabled={!canAdd}
                    onclick={add}
                    class="chorus-focus inline-flex size-5 shrink-0 items-center justify-center rounded border border-dashed border-ink-fg/25 text-ink-muted hover:text-ink-fg disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <Plus class="size-[11px]" />
                </button>
            </div>
        </div>

        <button
            type="button"
            onclick={() => snipSubView.set('lyrics')}
            disabled={!$nowPlaying.track_id}
            title="Set this section from the lyrics: click its first line, then its last"
            class="chorus-focus ml-auto inline-flex h-6 shrink-0 items-center gap-x-1 rounded-md px-1.5 text-[11px] text-ink-muted hover:bg-surface-2 hover:text-ink-fg disabled:cursor-not-allowed disabled:opacity-40"
        >
            <MicVocal class="size-[11px]" />
            Lyrics
        </button>
        {#if ranges.length > 1}
            <button
                type="button"
                onclick={() => snipStore.removeSelected()}
                title="Remove this section"
                class="chorus-focus inline-flex h-6 shrink-0 items-center gap-x-1 rounded-md px-1.5 text-[11px] text-ink-muted hover:bg-surface-2 hover:text-ink-fg"
            >
                <X class="size-[11px]" />
                Remove
            </button>
        {/if}
    </div>
{/if}
