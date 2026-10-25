<script lang="ts">
    // Status line for an effect tab: LED + "Reverb · Concert hall", or
    // "From <preset>" while editing the config.
    import type { Snippet } from 'svelte'

    let {
        name,
        value,
        from = '',
        children
    }: { name: string; value: string; from?: string; children?: Snippet } = $props()

    const on = $derived(Boolean(value) && value !== 'none')
</script>

<div class="flex min-w-0 items-center gap-x-2 text-xs text-ink-fg-2">
    <span class="led {on ? '' : 'led-off'}"></span>
    {#if from}
        <span class="truncate">
            From <span class="font-medium text-ink-fg">{from}</span>
        </span>
    {:else}
        <span class="truncate">
            {name} · <span class="font-medium text-ink-fg">{on ? value : 'off'}</span>
        </span>
    {/if}
    {@render children?.()}
</div>
