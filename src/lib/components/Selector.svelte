<script lang="ts">
    import * as Select from '$lib/components/ui/select'
    import type { Selection } from '$lib/types'

    let { label, className = '', selected = '', options }: { label: string, className?: string, selected?: string, options: Selection[] } = $props()
    let value: string = $state(selected)
    const triggerContent = $derived(options.find(item => item.value == value)?.label ?? label)
</script>

<Select.Root type="single" bind:value>
    <Select.Trigger class="w-40 h-6 py-0 justify-end gap-x-2 px-2 text-base text-end border-none {className}">
        {triggerContent}
    </Select.Trigger>
    <Select.Content class="max-h-36 w-40 overflow-y-scroll border border-gray-200 rounded-sm">
        {#each options as item}
            <Select.Item
                class="text-base text-end w-full"
                value={item.value}
                label={item.label}
            />
        {/each}
        <Select.ScrollUpButton class="flex items-center justify-center" />
        <Select.ScrollDownButton class="flex items-center justify-center" />
    </Select.Content>
</Select.Root>