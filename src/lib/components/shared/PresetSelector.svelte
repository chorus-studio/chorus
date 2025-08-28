<script lang="ts">
    import { Badge } from '$lib/components/ui/badge'
    import { Button } from '$lib/components/ui/button'

    interface Props {
        title: string
        presetKey: string
        availablePresets: string[]
        selectedPresets: string[]
        onAdd: (preset: string, key: string) => Promise<void>
        onUndo: (key: string) => Promise<void>
        onResetAll: (key: string) => Promise<void>
        maxHeight?: string
    }

    let {
        title,
        presetKey,
        availablePresets,
        selectedPresets,
        onAdd,
        onUndo,
        onResetAll,
        maxHeight = '200px'
    }: Props = $props()

    async function handleAddPreset(preset: string) {
        await onAdd(preset, presetKey)
    }

    async function handleUndo() {
        await onUndo(presetKey)
    }

    async function handleResetAll() {
        await onResetAll(presetKey)
    }
</script>

<div class="flex flex-col gap-y-2">
    <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium">{title}</h3>
        <div class="flex gap-x-2">
            {#if selectedPresets.length > 0}
                <Button
                    variant="ghost"
                    size="sm"
                    onclick={handleUndo}
                    class="text-xs px-2 py-1"
                >
                    Undo
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onclick={handleResetAll}
                    class="text-xs px-2 py-1 text-destructive"
                >
                    Reset
                </Button>
            {/if}
        </div>
    </div>

    <!-- Selected Presets Display -->
    {#if selectedPresets.length > 0}
        <div class="flex flex-wrap gap-1 p-2 bg-muted/30 rounded border">
            {#each selectedPresets as preset}
                <Badge variant="secondary" class="text-xs">
                    {preset}
                </Badge>
            {/each}
        </div>
    {/if}

    <!-- Available Presets -->
    <div 
        class="grid grid-cols-2 gap-1 overflow-y-auto rounded border p-2"
        style="max-height: {maxHeight};"
    >
        {#each availablePresets as preset}
            <Button
                variant="ghost"
                size="sm"
                class="justify-start text-xs h-auto py-1 px-2"
                onclick={() => handleAddPreset(preset)}
            >
                {preset}
            </Button>
        {/each}
        
        {#if availablePresets.length === 0}
            <p class="text-xs text-muted-foreground col-span-2 text-center py-4">
                All {title.toLowerCase()} presets have been selected
            </p>
        {/if}
    </div>
</div>