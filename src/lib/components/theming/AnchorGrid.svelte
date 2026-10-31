<script lang="ts">
    import { ANCHORS, type Anchor } from '$lib/types/look'
    import { cn } from '$lib/utils.js'

    // Nine dots for where a picture (or a radial gradient) sits.
    let {
        value,
        onChange,
        label = 'Anchor'
    }: { value: Anchor; onChange: (anchor: Anchor) => void; label?: string } = $props()

    const title = (anchor: Anchor) => anchor.replace(/^\w/, (c) => c.toUpperCase())
</script>

<div
    role="radiogroup"
    aria-label={label}
    class="grid grid-cols-3 gap-1 rounded-md border border-hairline bg-inset p-1"
>
    {#each ANCHORS as anchor (anchor)}
        <button
            type="button"
            role="radio"
            aria-checked={anchor === value}
            aria-label={title(anchor)}
            title={title(anchor)}
            onclick={() => onChange(anchor)}
            class={cn(
                'size-[18px] rounded-[3px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal',
                anchor === value ? 'bg-signal' : 'bg-surface-2 hover:bg-ink-dim'
            )}
        ></button>
    {/each}
</div>
