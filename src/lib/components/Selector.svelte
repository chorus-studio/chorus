<script lang="ts">
    import * as Select from '$lib/components/ui/select'
    import type { Selection } from '$lib/types'

    let {
        label,
        className = '',
        selected = '',
        options,
        onValueChange
    }: {
        label: string
        className?: string
        selected?: string
        options: Selection[]
        onValueChange: (value: string) => void
    } = $props()

    const triggerContent = $derived(options.find((item) => item.value == selected)?.label ?? label)
</script>

<Select.Root type="single" value={selected} {onValueChange}>
    <Select.Trigger
        class="h-6 w-40 justify-end gap-x-2 border-none px-2 py-0 text-end text-base {className}"
    >
        {triggerContent}
    </Select.Trigger>
    <Select.Content class="max-h-36 w-40 overflow-y-scroll rounded-sm border border-gray-200">
        {#each options as item}
            <Select.Item class="w-full text-end text-base" value={item.value} label={item.label} />
        {/each}
        <Select.ScrollUpButton class="flex items-center justify-center" />
        <Select.ScrollDownButton class="flex items-center justify-center" />
    </Select.Content>
</Select.Root>
