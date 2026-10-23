<script lang="ts">
    // "Save config as…" row shared by the EQ and reverb config editors.
    import Trash2 from '@lucide/svelte/icons/trash-2'
    import { Input } from '$lib/components/ui/input'
    import { Button } from '$lib/components/ui/button'
    import { CustomSelect } from '$lib/components/ui/custom-select'

    let {
        pip = false,
        selectKey,
        presetName = $bindable(''),
        selected,
        options,
        onSave,
        onLoad,
        onDelete
    }: {
        pip?: boolean
        selectKey: string
        presetName: string
        selected: string
        options: Array<{ label: string; value: string }>
        onSave: () => void
        onLoad: (name: string) => void
        onDelete: () => void
    } = $props()

    const hasPresets = $derived(options.length > 1)
</script>

<div class="mt-auto flex items-center gap-x-1.5">
    <Input
        placeholder="Save config as…"
        aria-label="Preset name"
        bind:value={presetName}
        onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && onSave()}
        class="h-7 min-w-0 flex-1 px-2 text-xs"
    />
    <Button size="sm" onclick={onSave} disabled={!presetName.trim()}>Save</Button>

    {#if hasPresets}
        <CustomSelect
            {pip}
            size="md"
            key={selectKey}
            {selected}
            {options}
            onValueChange={onLoad}
            class="w-[108px] min-w-0 shrink-0"
        />
        {#if selected !== 'none'}
            <Button
                size="icon-xs"
                variant="ghost"
                aria-label="Delete preset"
                title="Delete preset"
                onclick={onDelete}
                class="hover:text-alarm"
            >
                <Trash2 class="size-3.5" />
            </Button>
        {/if}
    {/if}
</div>
