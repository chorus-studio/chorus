<script lang="ts">
    import { onMount } from 'svelte'
    import ExternalLink from '@lucide/svelte/icons/external-link'
    import Keyboard from '@lucide/svelte/icons/keyboard'
    import SeekInput from '$lib/components/SeekInput.svelte'
    import { boundShortcuts, openShortcutSettings } from '$lib/utils/shortcuts'

    let { pip = false }: { pip?: boolean } = $props()
    void pip

    // The seek commands' bound keys, for the footer.
    let shortcuts = $state<Record<string, string>>({})
    onMount(() => {
        boundShortcuts().then((bound) => (shortcuts = bound))
    })
    const keys = $derived(
        [
            ['Rewind', shortcuts['seek-rewind'] ?? ''],
            ['Forward', shortcuts['seek-forward'] ?? '']
        ].filter(([, combo]) => combo)
    )
</script>

<div class="flex h-full flex-col gap-y-2.5">
    <SeekInput scope="default" title="Music" hint="What the player bar's seek buttons jump" />
    <SeekInput
        scope="long_form"
        title="Podcasts & audiobooks"
        hint="Resume steps back after a break"
        resume
    />

    <div class="mt-auto flex items-center justify-between gap-x-3 text-[11px] text-ink-muted">
        <span class="flex min-w-0 items-center gap-x-1.5">
            <Keyboard class="size-3 shrink-0" />
            {#if keys.length}
                {#each keys as [name, combo], i (name)}
                    {#if i > 0}<span aria-hidden="true">·</span>{/if}
                    <span class="flex items-center gap-x-1">
                        {name}
                        <kbd
                            class="rounded border border-hairline-strong bg-surface px-1 py-0.5 font-mono text-[9px] leading-none text-ink-fg-2"
                            >{combo}</kbd
                        >
                    </span>
                {/each}
            {:else}
                <span>Rewind and forward have no keys bound yet.</span>
            {/if}
        </span>
        <button
            type="button"
            onclick={openShortcutSettings}
            class="chorus-focus inline-flex shrink-0 items-center gap-x-1 rounded-md px-1 text-amber hover:underline"
        >
            Edit shortcuts
            <ExternalLink class="size-3" />
        </button>
    </div>
</div>
