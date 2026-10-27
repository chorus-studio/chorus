<script lang="ts">
    // A bound combo as keycaps, one per key, every cap one height and at least
    // as wide as it is tall: "Alt+Shift+1" and macOS's "⇧⌘P" alike. The caps
    // use the system font, which draws ⌘ ⇧ ⌥ ⌃ and letters at one size; the
    // mono stack has no such glyphs and fell back to a different font for
    // each symbol.
    import { shortcutKeys } from '$lib/utils/keycaps'
    import { cn } from '$lib/utils.js'

    let {
        combo,
        size = 'sm',
        class: className = ''
    }: { combo: string; size?: 'xs' | 'sm' | 'md'; class?: string } = $props()

    const SIZES = {
        xs: 'h-4 min-w-4 px-[3px] text-[10px]',
        sm: 'h-[18px] min-w-[18px] px-1 text-[11px]',
        md: 'h-5 min-w-5 px-1.5 text-xs'
    }
    const keys = $derived(shortcutKeys(combo))
</script>

<span class={cn('inline-flex shrink-0 items-center gap-x-0.5', className)}>
    {#each keys as key, i (i)}
        <kbd
            class={cn(
                'inline-flex items-center justify-center rounded border border-hairline-strong bg-surface font-sans leading-none text-ink-fg-2',
                SIZES[size]
            )}>{key}</kbd
        >
    {/each}
</span>
