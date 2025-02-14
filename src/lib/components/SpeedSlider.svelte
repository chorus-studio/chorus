<script lang="ts">
    import { Slider } from '$lib/components/ui/slider'

    let { value, onValueChange } = $props<{
        value: number | string,
        onValueChange?: (value: number | string) => void
    }>()

    function handleValueChange(newValue: number) {
        value = newValue
        onValueChange?.(newValue)
    }
</script>

<div class="flex items-center justify-between gap-x-4 w-full">
    <p class="text-xs text-muted-foreground">0.1x</p>
    <Slider
        onValueChange={handleValueChange}
        type="single" bind:value={value} min={0.1} max={4} step={0.001}
        class="h-6 w-full"
    />
    <p class="text-xs text-muted-foreground">4x</p>
</div>