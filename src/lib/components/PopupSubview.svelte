<script lang="ts">
    import type { Snippet } from 'svelte'
    import ChevronLeft from '@lucide/svelte/icons/chevron-left'

    // A popup screen that stands in for the player in the same footprint: a
    // back row with a label, then the content. Wears the rack tokens.
    let {
        label,
        frameClass = 'h-[176px]',
        onback,
        children
    }: { label: string; frameClass?: string; onback: () => void; children: Snippet } = $props()
</script>

<div class="flex {frameClass} w-[320px] flex-col gap-y-2.5 bg-ink px-3 pb-3 pt-2 text-ink-fg">
    <div class="flex h-[26px] shrink-0 items-center justify-between">
        <button
            type="button"
            onclick={onback}
            class="chorus-focus inline-flex h-6 items-center gap-x-1 rounded-md pl-0.5 pr-1.5 text-xs text-ink-fg-2 hover:bg-surface-2 hover:text-ink-fg"
        >
            <ChevronLeft class="size-3.5" />
            Player
        </button>
        <span class="rack-label">{label}</span>
    </div>
    {@render children()}
</div>
