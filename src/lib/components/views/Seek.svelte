<script lang="ts">
    import { onMount } from 'svelte'
    import { seekStore } from '$lib/stores/seek'
    import ExternalLink from '@lucide/svelte/icons/external-link'
    import Keyboard from '@lucide/svelte/icons/keyboard'
    import Keycaps from '$lib/components/Keycaps.svelte'
    import SeekInput from '$lib/components/SeekInput.svelte'
    import SegmentedControl from '$lib/components/SegmentedControl.svelte'
    import { boundShortcuts, openShortcutSettings } from '$lib/utils/shortcuts'

    let { pip = false }: { pip?: boolean } = $props()
    void pip

    async function handleValueChange(value: string) {
        await seekStore.updateSeek({ is_long_form: value === 'long_form' })
    }

    const scope = $derived($seekStore.is_long_form ? 'long_form' : 'default')

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
    <SegmentedControl
        grow
        size="sm"
        ariaLabel="Applies to"
        value={scope}
        onValueChange={handleValueChange}
        options={[
            { label: 'Music', value: 'default' },
            { label: 'Podcasts & audiobooks', value: 'long_form' }
        ]}
    />

    <div class="grid min-h-0 flex-1 grid-cols-2 gap-x-2.5">
        <SeekInput type="rewind" />
        <SeekInput type="forward" />
    </div>

    <div class="flex items-center justify-between gap-x-3 text-[11px] text-ink-muted">
        <span class="flex min-w-0 items-center gap-x-1.5">
            <Keyboard class="size-3 shrink-0" />
            {#if keys.length}
                {#each keys as [name, combo], i (name)}
                    {#if i > 0}<span aria-hidden="true">·</span>{/if}
                    <span class="flex items-center gap-x-1">
                        {name}
                        <Keycaps {combo} />
                    </span>
                {/each}
            {:else}
                <span>Separate values for each; 1–60 s. No keys bound for seeking yet.</span>
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
