<script lang="ts">
    import { onMount } from 'svelte'
    import Keyboard from '@lucide/svelte/icons/keyboard'
    import { Button } from '$lib/components/ui/button'
    import { configStore, MAX_AUDIO_PRESETS } from '$lib/stores/config'
    import { boundShortcuts, openShortcutSettings, shortcutKeys } from '$lib/utils/shortcuts'

    // Every Chorus command, in the order it makes sense to read them. The
    // browser owns the bindings; this page only shows them and links to the
    // page where they are changed.
    type Row = { name: string; label: string }
    type Section = { title: string; rows: Row[] }

    const SECTIONS: Section[] = [
        {
            title: 'Playback',
            rows: [
                { name: 'play/pause', label: 'Play or pause' },
                { name: 'next', label: 'Next track' },
                { name: 'previous', label: 'Previous track' },
                { name: 'seek-forward', label: 'Seek forwards' },
                { name: 'seek-rewind', label: 'Seek backwards' },
                { name: 'loop', label: 'Loop the snip or track' },
                { name: 'repeat', label: 'Repeat' },
                { name: 'shuffle', label: 'Shuffle' },
                { name: 'mute/unmute', label: 'Mute or unmute' }
            ]
        },
        {
            title: 'Track',
            rows: [
                { name: 'save/unsave', label: 'Save or unsave' },
                { name: 'block-track', label: 'Block this track' },
                { name: 'show-track', label: 'Show as a notification' }
            ]
        },
        {
            title: 'Chorus',
            rows: [
                { name: 'on/off', label: 'Chorus on or off' },
                { name: 'settings', label: 'Open the controls' },
                { name: 'toggle-config', label: 'Open these settings' },
                { name: 'toggle-new-releases', label: 'New releases' },
                { name: 'cycle-theme-next', label: 'Next theme' },
                { name: 'cycle-theme-previous', label: 'Previous theme' }
            ]
        }
    ]

    // Preset slots take their labels from the saved presets in the Presets tab.
    const presetRows = $derived<Row[]>([
        { name: 'quick-preset-next', label: 'Next quick preset' },
        { name: 'quick-preset-previous', label: 'Previous quick preset' },
        ...Array.from({ length: MAX_AUDIO_PRESETS }, (_, i) => {
            const preset = $configStore.audio_presets[i]
            return {
                name: `audio-preset-${i + 1}`,
                label: preset ? `Slot ${i + 1} · ${preset.name}` : `Slot ${i + 1} · empty`
            }
        })
    ])
    const sections = $derived<Section[]>([
        SECTIONS[0],
        { title: 'Presets', rows: presetRows },
        ...SECTIONS.slice(1)
    ])

    let bound = $state<Record<string, string>>({})
    const boundCount = $derived(
        sections.flatMap((s) => s.rows).filter((r) => Boolean(bound[r.name])).length
    )
    const total = $derived(sections.reduce((n, s) => n + s.rows.length, 0))

    onMount(() => {
        boundShortcuts().then((b) => (bound = b))
    })
</script>

<div class="flex flex-col gap-y-3">
    <div class="flex items-start justify-between gap-x-4">
        <div class="flex flex-col gap-y-0.5">
            <span class="text-[13px] font-medium text-ink-fg">Keyboard shortcuts</span>
            <span class="text-xs text-ink-muted">
                Every Chorus action can have a key. Bindings are set on the browser's own shortcuts
                page; this list shows what is bound now.
            </span>
        </div>
        <Button variant="outline" size="sm" onclick={openShortcutSettings} class="shrink-0">
            <Keyboard class="size-3.5" />
            Edit shortcuts
        </Button>
    </div>

    <div class="grid grid-cols-2 gap-3">
        {#each sections as section (section.title)}
            <div
                class="flex flex-col gap-y-1 rounded-lg border border-hairline bg-panel px-3.5 py-2.5"
            >
                <span class="rack-label mb-1">{section.title}</span>
                {#each section.rows as row (row.name)}
                    {@const combo = bound[row.name] ?? ''}
                    <div class="flex h-6 items-center justify-between gap-x-3 text-xs">
                        <span class="truncate text-ink-fg-2">{row.label}</span>
                        {#if combo}
                            <span class="flex shrink-0 items-center gap-x-0.5">
                                {#each shortcutKeys(combo) as key (key)}
                                    <kbd
                                        class="rounded border border-hairline-strong bg-surface px-1.5 py-0.5 font-mono text-[10px] leading-none text-ink-fg-2"
                                        >{key}</kbd
                                    >
                                {/each}
                            </span>
                        {:else}
                            <span class="shrink-0 font-mono text-[10px] text-ink-dim">not set</span>
                        {/if}
                    </div>
                {/each}
            </div>
        {/each}
    </div>

    <span class="text-[11px] text-ink-muted">
        {boundCount} of {total} bound. Preset slots are the saved presets under Mine in the Presets tab;
        a slot's key applies it, and again turns it off.
    </span>
</div>
