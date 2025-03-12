<script lang="ts">
    import { Label } from '$lib/components/ui/label'
    import { buttonVariants } from '$lib/components/ui/button'
    import * as ToggleGroup from '$lib/components/ui/toggle-group'

    let { list, value, label, onValueChange } = $props()
</script>

<div class="flex w-full items-center justify-between gap-x-2">
    <Label class="text-base font-semibold lowercase">{label}</Label>
    <ToggleGroup.Root type="single" bind:value {onValueChange} class="flex gap-0">
        {#each list as item (item.value)}
            <ToggleGroup.Item
                disabled={item.value == value}
                value={item.value}
                class={buttonVariants({
                    variant: 'secondary',
                    size: 'sm',
                    class: `size-6 min-w-6 gap-0 rounded-none ${item.value === value ? 'disabled:bg-green-600 disabled:opacity-90 data-[state=on]:bg-green-600 data-[state=on]:text-white data-[state=on]:hover:bg-green-700' : ''}`
                })}
            >
                {item.label}
            </ToggleGroup.Item>
        {/each}
    </ToggleGroup.Root>
</div>
